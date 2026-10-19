-- Credit notes are looked up by the invoice they credit on every list, dashboard and invoice page: index that.
create index document_credited_idx on document (organisation_id, credited_document_id)
  where credited_document_id is not null;
