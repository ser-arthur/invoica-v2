-- More guards for refunds and the money rules (docs/specs/refunds.md, rules 8 to 10).

-- A draft credit note keeps the invoice of its refund: once a refund is recorded with it, it cannot move.
create function app.guard_credit_note_move() returns trigger language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.credited_document_id is distinct from old.credited_document_id
     and exists (select 1 from refund r where r.credit_note_id = old.id) then
    raise exception 'A credit note with a refund cannot move to another invoice' using errcode = 'P0001';
  end if;
  return new;
end
$$;
revoke execute on function app.guard_credit_note_move() from public;
create trigger document_credit_note_move before update of credited_document_id on document
  for each row when (old.kind = 'credit_note') execute function app.guard_credit_note_move();

-- The guards on payments, refunds and documents lock the invoice and then add up what is applied to it. That holds
-- under read committed, where each statement sees what committed while it waited for the lock; under repeatable
-- read or serializable it would add up an older snapshot. Writes to these tables are refused outside read committed.
create function app.require_read_committed() returns trigger language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Payments, refunds and documents are recorded only in read committed transactions'
      using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end
$$;
revoke execute on function app.require_read_committed() from public;
create trigger payment_read_committed before insert or update on payment
  for each row execute function app.require_read_committed();
create trigger refund_read_committed before insert on refund
  for each row execute function app.require_read_committed();
create trigger document_read_committed before insert or update on document
  for each row execute function app.require_read_committed();

-- A refund returns money already received, so it cannot be dated before the latest payment on the invoice.
create or replace function app.guard_refund() returns trigger language plpgsql as $$
declare
  inv record;
  note record;
  paid bigint;
  refunded bigint;
  latest date;
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
  select coalesce(sum(p.amount), 0), max(p.paid_on) into paid, latest
    from payment p where p.document_id = new.document_id and p.removed_at is null;
  if latest is not null and new.refunded_on < latest then
    raise exception 'A refund cannot be dated before the latest payment on the invoice' using errcode = 'P0001';
  end if;
  select coalesce(sum(r.amount), 0) into refunded from refund r where r.document_id = new.document_id;
  if refunded + new.amount > paid then
    raise exception 'Refunds cannot be more than the payments received' using errcode = 'P0001';
  end if;
  return new;
end
$$;
