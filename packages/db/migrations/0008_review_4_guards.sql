-- Guards added after the fourth independent review (docs/reviews/review-4.md, R4-L5). On issue, a credit note's
-- lines that credit invoice lines carry those lines' price and tax, its total and tax total are its snapshot's, and
-- no tax row, with earlier credit notes, credits more tax or base than the invoice charged.

create or replace function app.guard_document() returns trigger language plpgsql as $$
declare
  mutable text[] := array['lifecycle', 'sent_at', 'voided_at', 'void_reason', 'pdf_file_id', 'updated_at'];
  inv record;
  applied bigint;
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
      select coalesce(sum(p.amount), 0) into applied from payment p
        where p.document_id = new.credited_document_id and p.removed_at is null;
      applied := applied + coalesce((
        select sum(c.total) from document c
        where c.credited_document_id = new.credited_document_id and c.kind = 'credit_note'
          and c.lifecycle in ('issued', 'sent') and c.id <> new.id
      ), 0);
      if applied + new.total > inv.total then
        raise exception 'A credit note cannot be more than the balance still owed' using errcode = 'P0001';
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
        select 1
        from jsonb_array_elements(coalesce(new.snapshot #> '{totals,taxes}', '[]'::jsonb)) r
        left join lateral (
          select (ir ->> 'amount')::bigint as amount, (ir ->> 'base')::bigint as base
          from document i, jsonb_array_elements(i.snapshot #> '{totals,taxes}') ir
          where i.id = new.credited_document_id and ir ->> 'key' = r ->> 'key'
        ) charged on true
        left join lateral (
          select coalesce(sum((er ->> 'amount')::bigint), 0) as amount, coalesce(sum((er ->> 'base')::bigint), 0) as base
          from document c, jsonb_array_elements(c.snapshot #> '{totals,taxes}') er
          where c.credited_document_id = new.credited_document_id and c.kind = 'credit_note'
            and c.lifecycle in ('issued', 'sent') and c.id <> new.id and er ->> 'key' = r ->> 'key'
        ) earlier on true
        where charged.amount is null
           or earlier.amount + (r ->> 'amount')::bigint > charged.amount
           or earlier.base + (r ->> 'base')::bigint > charged.base
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
