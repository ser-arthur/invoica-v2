-- Refunds (docs/specs/refunds.md). A credit note on a paid invoice may go above the balance owed when the part
-- above it is refunded to the client. A refund belongs to one credit note and its invoice, is recorded while the
-- note is a draft and issued with it in the same transaction, and never changes afterwards. Refunds on an invoice
-- never add up to more than its payments.

create table refund (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisation (id),
  document_id uuid not null,
  credit_note_id uuid not null,
  amount bigint not null check (amount > 0),
  currency char(3) not null,
  refunded_on date not null,
  method text not null check (method in ('bank_transfer', 'card', 'cash', 'mobile_money', 'cheque', 'other')),
  reference text,
  created_by text references auth_user (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (credit_note_id),
  foreign key (organisation_id, document_id) references document (organisation_id, id),
  foreign key (organisation_id, credit_note_id) references document (organisation_id, id)
);
create index refund_document_idx on refund (organisation_id, document_id);
create index refund_refunded_on_idx on refund (organisation_id, refunded_on);

alter table refund enable row level security;
alter table refund force row level security;
create policy tenant on refund for all using (organisation_id = (select app.current_organisation_id()))
  with check (organisation_id = (select app.current_organisation_id()));
grant select, insert on refund to invoica_app;

create trigger refund_append_only before update or delete on refund
  for each row execute function app.refuse_change();

create function app.guard_refund() returns trigger language plpgsql as $$
declare
  inv record;
  note record;
  paid bigint;
  refunded bigint;
begin
  select d.kind, d.lifecycle, d.currency into inv from document d where d.id = new.document_id for update;
  if not found or inv.kind <> 'invoice' or inv.lifecycle not in ('issued', 'sent') then
    raise exception 'A refund can only be recorded on an issued invoice' using errcode = 'P0001';
  end if;
  select c.kind, c.lifecycle, c.credited_document_id into note from document c where c.id = new.credit_note_id;
  if not found or note.kind <> 'credit_note' or note.credited_document_id is distinct from new.document_id then
    raise exception 'A refund goes with a credit note of the invoice it refunds' using errcode = 'P0001';
  end if;
  if note.lifecycle <> 'draft' then
    raise exception 'A refund is recorded with its credit note, before the note is issued' using errcode = 'P0001';
  end if;
  if new.currency <> inv.currency then
    raise exception 'A refund must be in the invoice currency' using errcode = 'P0001';
  end if;
  select coalesce(sum(p.amount), 0) into paid from payment p where p.document_id = new.document_id and p.removed_at is null;
  select coalesce(sum(r.amount), 0) into refunded from refund r where r.document_id = new.document_id;
  if refunded + new.amount > paid then
    raise exception 'Refunds cannot be more than the payments received' using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger refund_guard before insert on refund
  for each row execute function app.guard_refund();

-- A refund is issued with its credit note: by the end of the transaction the note must be issued.
create function app.check_refund_issued() returns trigger language plpgsql as $$
begin
  if not exists (select 1 from document c where c.id = new.credit_note_id and c.lifecycle in ('issued', 'sent')) then
    raise exception 'A refund must be issued with its credit note' using errcode = 'P0001';
  end if;
  return null;
end
$$;
create constraint trigger refund_issued after insert on refund deferrable initially deferred
  for each row execute function app.check_refund_issued();

-- Payments: the balance counts refunds, and a payment cannot be removed while the invoice's refunds would be more
-- than the payments left.
create or replace function app.guard_payment() returns trigger language plpgsql as $$
declare
  doc record;
  applied bigint;
begin
  if tg_op = 'UPDATE' then
    if (to_jsonb(old) - array['removed_at', 'removed_reason']) is distinct from (to_jsonb(new) - array['removed_at', 'removed_reason'])
      or old.removed_at is not null then
      raise exception 'A recorded payment cannot be changed' using errcode = 'P0001';
    end if;
    if new.removed_at is not null then
      perform 1 from document d where d.id = old.document_id for update;
      if (select coalesce(sum(r.amount), 0) from refund r where r.document_id = old.document_id) > (
        select coalesce(sum(p.amount), 0) from payment p
        where p.document_id = old.document_id and p.removed_at is null and p.id <> old.id
      ) then
        raise exception 'This payment cannot be removed: the refunds on the invoice would be more than the payments left' using errcode = 'P0001';
      end if;
    end if;
    return new;
  end if;

  select d.lifecycle, d.total, d.currency, d.kind into doc from document d where d.id = new.document_id for update;
  if doc.kind <> 'invoice' or doc.lifecycle not in ('issued', 'sent') then
    raise exception 'Payments can only be recorded on issued invoices' using errcode = 'P0001';
  end if;
  if doc.currency <> new.currency then
    raise exception 'A payment must be in the invoice currency' using errcode = 'P0001';
  end if;
  select coalesce(sum(p.amount), 0) into applied from payment p where p.document_id = new.document_id and p.removed_at is null;
  applied := applied - coalesce((select sum(r.amount) from refund r where r.document_id = new.document_id), 0);
  applied := applied + coalesce((
    select sum(c.total) from document c
    where c.credited_document_id = new.document_id and c.kind = 'credit_note' and c.lifecycle in ('issued', 'sent')
  ), 0);
  if applied + new.amount > doc.total then
    raise exception 'The payment is more than the balance due' using errcode = 'P0001';
  end if;
  return new;
end
$$;

-- Issuing a credit note: the part above the balance owed must be exactly its refund.
create or replace function app.guard_document() returns trigger language plpgsql as $$
declare
  mutable text[] := array['lifecycle', 'sent_at', 'voided_at', 'void_reason', 'pdf_file_id', 'updated_at'];
  inv record;
  applied bigint;
  refunded bigint;
  own_refund bigint;
begin
  if tg_op = 'DELETE' then
    if old.lifecycle <> 'draft' then
      raise exception 'An issued document cannot be deleted' using errcode = 'P0001';
    end if;
    return old;
  end if;

  if old.lifecycle = 'draft' then
    if new.kind <> old.kind then
      raise exception 'The kind of a document cannot change' using errcode = 'P0001';
    end if;
    if new.lifecycle not in ('draft', 'issued') then
      raise exception 'A draft can only be issued' using errcode = 'P0001';
    end if;
    if new.lifecycle = 'issued' and new.kind = 'credit_note' then
      select d.lifecycle, d.total, d.kind, d.currency into inv from document d where d.id = new.credited_document_id for update;
      if inv.kind <> 'invoice' or inv.lifecycle not in ('issued', 'sent') then
        raise exception 'Credit notes can only be issued against issued invoices' using errcode = 'P0001';
      end if;
      if new.currency <> inv.currency then
        raise exception 'A credit note must be in the invoice currency' using errcode = 'P0001';
      end if;
      -- What is taken off the invoice before this note: payments less refunds made with other notes, and other
      -- credit notes. The part of this note above the balance that leaves is refunded with it, exactly.
      select coalesce(sum(p.amount), 0) into applied from payment p
        where p.document_id = new.credited_document_id and p.removed_at is null;
      select coalesce(sum(r.amount), 0) into refunded from refund r
        where r.document_id = new.credited_document_id and r.credit_note_id <> new.id;
      select coalesce(sum(r.amount), 0) into own_refund from refund r where r.credit_note_id = new.id;
      applied := applied - refunded + coalesce((
        select sum(c.total) from document c
        where c.credited_document_id = new.credited_document_id and c.kind = 'credit_note'
          and c.lifecycle in ('issued', 'sent') and c.id <> new.id
      ), 0);
      if own_refund = 0 and applied + new.total > inv.total then
        raise exception 'A credit note cannot be more than the balance still owed' using errcode = 'P0001';
      end if;
      if own_refund <> greatest(applied + new.total - inv.total, 0) then
        raise exception 'A credit note''s refund must be exactly the part above the balance owed' using errcode = 'P0001';
      end if;
      if exists (
        select 1 from document_line l
        where l.document_id = new.id and l.credited_line_id is not null and not exists (
          select 1 from document_line il where il.id = l.credited_line_id and il.document_id = new.credited_document_id
        )
      ) then
        raise exception 'A credit note line can only credit a line of the invoice it credits' using errcode = 'P0001';
      end if;
      if exists (
        select 1 from document_line il
        where il.document_id = new.credited_document_id and il.quantity < (
          select coalesce(sum(cl.quantity), 0) from document_line cl join document c on c.id = cl.document_id
          where cl.credited_line_id = il.id and c.kind = 'credit_note'
            and (c.lifecycle in ('issued', 'sent') or c.id = new.id)
        )
      ) then
        raise exception 'A credit note cannot credit more of a line than was invoiced' using errcode = 'P0001';
      end if;
      if exists (
        select 1 from document_line l
        where l.document_id = new.id and l.credited_line_id is null and not exists (
          select 1 from document_line il
          where il.document_id = new.credited_document_id and il.tax is not distinct from l.tax
        )
      ) then
        raise exception 'A credit note line can only be at a tax the invoice used' using errcode = 'P0001';
      end if;
    end if;
    if new.lifecycle = 'issued' and new.number is distinct from (
      select (case when new.kind = 'invoice' then o.invoice_prefix else o.credit_note_prefix end)
        || lpad(new.sequence::text, greatest(o.number_padding, length(new.sequence::text)), '0')
      from organisation o where o.id = new.organisation_id
    ) then
      raise exception 'A document number must be its prefix and sequence' using errcode = 'P0001';
    end if;
    if new.lifecycle = 'issued' and new.sequence is distinct from (
      select c.next_value - 1 from number_counter c where c.organisation_id = new.organisation_id and c.kind = new.kind
    ) then
      raise exception 'A document is numbered from its counter when it is issued' using errcode = 'P0001';
    end if;
    if new.lifecycle = 'issued' and new.kind = 'credit_note' then
      if exists (
        select 1 from document_line l join document_line il on il.id = l.credited_line_id
        where l.document_id = new.id and (l.unit_price <> il.unit_price or l.tax is distinct from il.tax)
      ) then
        raise exception 'A credit note line must carry the price and tax of the line it credits' using errcode = 'P0001';
      end if;
      if new.total is distinct from (new.snapshot #>> '{totals,total}')::bigint
         or new.tax_total is distinct from (new.snapshot #>> '{totals,taxTotal}')::bigint then
        raise exception 'A credit note''s figures must match its snapshot' using errcode = 'P0001';
      end if;
      if exists (
        select 1 from jsonb_array_elements(coalesce(new.snapshot #> '{totals,taxes}', '[]'::jsonb)) r
        where jsonb_typeof(r -> 'amount') is distinct from 'number'
           or jsonb_typeof(r -> 'base') is distinct from 'number'
           or (r ->> 'amount')::numeric < 0 or (r ->> 'base')::numeric < 0
           or (r ->> 'amount')::numeric <> trunc((r ->> 'amount')::numeric)
           or (r ->> 'base')::numeric <> trunc((r ->> 'base')::numeric)
      ) then
        raise exception 'A credit note''s tax amounts and bases must be whole numbers of zero or more' using errcode = 'P0001';
      end if;
      if exists (
        select 1
        from jsonb_array_elements(coalesce(new.snapshot #> '{totals,taxes}', '[]'::jsonb)) r
        join document i on i.id = new.credited_document_id
        cross join lateral jsonb_array_elements(i.snapshot #> '{totals,taxes}') ir
        where ir ->> 'key' = r ->> 'key' and (ir -> 'charged') is distinct from (r -> 'charged')
      ) then
        raise exception 'A credit note''s tax must be charged as the invoice charged it, or shown as it was shown' using errcode = 'P0001';
      end if;
      if new.tax_total is distinct from (
        select coalesce(sum((r ->> 'amount')::bigint), 0)
        from jsonb_array_elements(coalesce(new.snapshot #> '{totals,taxes}', '[]'::jsonb)) r
        where (r ->> 'charged')::boolean
      ) then
        raise exception 'A credit note''s tax total must be its charged tax' using errcode = 'P0001';
      end if;
      if exists (
        select 1
        from (
          select r ->> 'key' as key, sum((r ->> 'amount')::bigint) as amount, sum((r ->> 'base')::bigint) as base
          from jsonb_array_elements(coalesce(new.snapshot #> '{totals,taxes}', '[]'::jsonb)) r
          group by r ->> 'key'
        ) n
        left join lateral (
          select sum((ir ->> 'amount')::bigint) as amount, sum((ir ->> 'base')::bigint) as base
          from document i, jsonb_array_elements(i.snapshot #> '{totals,taxes}') ir
          where i.id = new.credited_document_id and ir ->> 'key' = n.key
        ) charged on true
        left join lateral (
          select coalesce(sum((er ->> 'amount')::bigint), 0) as amount, coalesce(sum((er ->> 'base')::bigint), 0) as base
          from document c, jsonb_array_elements(c.snapshot #> '{totals,taxes}') er
          where c.credited_document_id = new.credited_document_id and c.kind = 'credit_note'
            and c.lifecycle in ('issued', 'sent') and c.id <> new.id and er ->> 'key' = n.key
        ) earlier on true
        where charged.amount is null
           or earlier.amount + n.amount > charged.amount
           or earlier.base + n.base > charged.base
      ) then
        raise exception 'A credit note cannot credit more tax than the invoice charged' using errcode = 'P0001';
      end if;
    end if;
    if new.kind = 'credit_note' and new.lifecycle = 'draft'
       and new.credited_document_id is distinct from old.credited_document_id
       and exists (select 1 from document_line l where l.document_id = old.id) then
      raise exception 'A credit note with lines cannot move to another invoice' using errcode = 'P0001';
    end if;
    return new;
  end if;

  if (to_jsonb(old) - mutable) is distinct from (to_jsonb(new) - mutable) then
    raise exception 'An issued document cannot be changed' using errcode = 'P0001';
  end if;
  if old.pdf_file_id is not null and new.pdf_file_id is distinct from old.pdf_file_id then
    raise exception 'A kept PDF cannot be replaced' using errcode = 'P0001';
  end if;
  if not (
    new.lifecycle = old.lifecycle
    or (old.lifecycle = 'issued' and new.lifecycle in ('sent', 'void'))
    or (old.lifecycle = 'sent' and new.lifecycle = 'void')
  ) then
    raise exception 'Cannot move a document from % to %', old.lifecycle, new.lifecycle using errcode = 'P0001';
  end if;
  if new.lifecycle = 'void' and old.lifecycle <> 'void' then
    if old.kind = 'credit_note' then
      raise exception 'A credit note cannot be voided' using errcode = 'P0001';
    end if;
    if exists (select 1 from payment p where p.document_id = old.id and p.removed_at is null) then
      raise exception 'A document with payments recorded cannot be voided' using errcode = 'P0001';
    end if;
    if exists (
      select 1 from document c where c.credited_document_id = old.id and c.kind = 'credit_note' and c.lifecycle in ('issued', 'sent')
    ) then
      raise exception 'An invoice with credit notes cannot be voided' using errcode = 'P0001';
    end if;
  end if;
  return new;
end
$$;
