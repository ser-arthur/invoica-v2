-- Guards added after the second independent review (docs/reviews/review-2.md, R2-L1). On issue, a credit note's
-- lines must credit lines of its own invoice and never more of a line than was invoiced; every document is numbered
-- from its counter; a draft credit note with lines cannot be moved to another invoice.

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
    end if;
    if new.lifecycle = 'issued' and new.sequence is distinct from (
      select c.next_value - 1 from number_counter c where c.organisation_id = new.organisation_id and c.kind = new.kind
    ) then
      raise exception 'A document is numbered from its counter when it is issued' using errcode = 'P0001';
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
