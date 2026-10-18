-- Invoica schema: auth tables, organisations, members, taxes, clients, items, documents, payments,
-- numbering, files, audit log and outbox. Row-level security is in 0002.

create schema app;

-- Auth (Better Auth). Users sign in before any organisation is chosen, so these tables have no tenant column.
create table auth_user (
  id text primary key,
  name text not null,
  email text not null unique,
  email_verified boolean not null default false,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table auth_session (
  id text primary key,
  user_id text not null references auth_user (id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index auth_session_user_idx on auth_session (user_id);

create table auth_account (
  id text primary key,
  user_id text not null references auth_user (id) on delete cascade,
  account_id text not null,
  provider_id text not null,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index auth_account_user_idx on auth_account (user_id);

create table auth_verification (
  id text primary key,
  identifier text not null,
  value text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index auth_verification_identifier_idx on auth_verification (identifier);

-- Organisations and members.
create table organisation (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 200),
  legal_name text check (legal_name is null or length(legal_name) <= 200),
  business_type text not null default 'sole_trader'
    check (business_type in ('sole_trader', 'limited_company', 'partnership', 'other')),
  company_number text,
  email text,
  phone text,
  website text,
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  postcode text,
  country_code char(2) not null default 'GB',
  base_currency char(3) not null default 'GBP',
  time_zone text not null default 'Europe/London',
  locale text not null default 'en-GB',
  tax_registered boolean not null default false,
  tax_number text,
  prices_include_tax boolean not null default false,
  tax_level text not null default 'document' check (tax_level in ('document', 'line')),
  rounding text not null default 'half-up' check (rounding in ('half-up', 'half-even', 'down')),
  default_payment_terms_days integer not null default 30 check (default_payment_terms_days between 0 and 365),
  invoice_prefix text not null default 'INV-' check (invoice_prefix ~ '^[A-Za-z0-9./-]{0,12}$'),
  credit_note_prefix text not null default 'CN-' check (credit_note_prefix ~ '^[A-Za-z0-9./-]{0,12}$'),
  number_padding integer not null default 4 check (number_padding between 1 and 8),
  brand_colour text not null default '#17795a' check (brand_colour ~ '^#[0-9a-fA-F]{6}$'),
  logo_file_id uuid,
  default_template text not null default 'receipt',
  payment_details jsonb not null default '{}'::jsonb,
  default_notes text,
  default_terms text,
  plan text not null default 'trial' check (plan in ('trial', 'free', 'pro', 'studio')),
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table membership (
  organisation_id uuid not null references organisation (id) on delete cascade,
  user_id text not null references auth_user (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner')),
  created_at timestamptz not null default now(),
  primary key (organisation_id, user_id)
);
create index membership_user_idx on membership (user_id);

-- Taxes. A code is what a line is taxed with: zero or more components applied in order.
create table tax_code (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisation (id) on delete cascade,
  preset_key text,
  label text not null check (length(btrim(label)) between 1 and 80),
  treatment text not null
    check (treatment in ('standard', 'reduced', 'zero', 'exempt', 'outside_scope', 'reverse_charge', 'custom')),
  components jsonb not null default '[]'::jsonb check (jsonb_typeof(components) = 'array'),
  valid_from date,
  valid_to date,
  is_default boolean not null default false,
  sort integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, id),
  check (valid_to is null or valid_from is null or valid_to > valid_from)
);
create unique index tax_code_one_default on tax_code (organisation_id) where is_default and archived_at is null;

-- Clients.
create table client (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisation (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 200),
  contact_name text,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  postcode text,
  country_code char(2),
  tax_number text,
  currency char(3),
  payment_terms_days integer check (payment_terms_days between 0 and 365),
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, id)
);
create index client_name_idx on client (organisation_id, lower(name));

create table client_field (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  client_id uuid not null,
  label text not null check (length(btrim(label)) between 1 and 60),
  value text not null check (length(value) <= 200),
  show_on_documents boolean not null default true,
  sort integer not null default 0,
  foreign key (organisation_id, client_id) references client (organisation_id, id) on delete cascade
);
create index client_field_client_idx on client_field (organisation_id, client_id);

-- Saved items.
create table item (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisation (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 200),
  description text,
  unit_price bigint not null check (unit_price >= 0),
  unit text,
  tax_code_id uuid,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, id),
  foreign key (organisation_id, tax_code_id) references tax_code (organisation_id, id)
);

-- Files: logos and kept PDFs. The bytes live in object storage under storage_key.
create table stored_file (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisation (id) on delete cascade,
  purpose text not null check (purpose in ('logo', 'document_pdf')),
  content_type text not null,
  byte_size bigint not null check (byte_size >= 0),
  sha256 text not null,
  storage_key text not null unique,
  created_at timestamptz not null default now(),
  unique (organisation_id, id)
);

-- Documents: invoices and credit notes.
create table document (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisation (id) on delete cascade,
  kind text not null check (kind in ('invoice', 'credit_note')),
  lifecycle text not null default 'draft' check (lifecycle in ('draft', 'issued', 'sent', 'void')),
  sequence integer check (sequence >= 1),
  number text,
  client_id uuid not null,
  credited_document_id uuid,
  currency char(3) not null,
  issue_date date,
  due_date date,
  supply_date date,
  service_period_start date,
  service_period_end date,
  reference text,
  title text,
  summary text,
  line_style text not null default 'quantity' check (line_style in ('amount', 'quantity', 'hours', 'dated')),
  prices_include_tax boolean not null default false,
  tax_level text not null default 'document' check (tax_level in ('document', 'line')),
  rounding text not null default 'half-up' check (rounding in ('half-up', 'half-even', 'down')),
  discounts jsonb not null default '[]'::jsonb check (jsonb_typeof(discounts) = 'array'),
  prepayments jsonb not null default '[]'::jsonb check (jsonb_typeof(prepayments) = 'array'),
  notes text,
  terms text,
  template text not null default 'receipt',
  options jsonb not null default '{}'::jsonb,
  subtotal bigint not null default 0,
  discount_total bigint not null default 0,
  tax_total bigint not null default 0,
  total bigint not null default 0 check (total >= 0),
  snapshot jsonb,
  pdf_file_id uuid,
  issued_at timestamptz,
  sent_at timestamptz,
  voided_at timestamptz,
  void_reason text,
  created_by text references auth_user (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, id),
  unique (organisation_id, kind, sequence),
  unique (organisation_id, kind, number),
  foreign key (organisation_id, client_id) references client (organisation_id, id),
  foreign key (organisation_id, credited_document_id) references document (organisation_id, id),
  foreign key (organisation_id, pdf_file_id) references stored_file (organisation_id, id),
  check ((lifecycle = 'draft') = (sequence is null)),
  check ((lifecycle = 'draft') = (number is null)),
  check (lifecycle = 'draft' or (snapshot is not null and issue_date is not null and issued_at is not null)),
  check (kind = 'credit_note' or credited_document_id is null),
  check (kind = 'invoice' or credited_document_id is not null),
  check (due_date is null or issue_date is null or due_date >= issue_date),
  check (service_period_end is null or service_period_start is null or service_period_end >= service_period_start),
  check (lifecycle <> 'void' or voided_at is not null)
);
create index document_list_idx on document (organisation_id, kind, lifecycle, issue_date desc);
create index document_client_idx on document (organisation_id, client_id);

create table document_line (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  document_id uuid not null,
  position integer not null check (position >= 0),
  title text not null check (length(title) <= 500),
  description text check (description is null or length(description) <= 4000),
  quantity bigint not null check (quantity > 0),
  unit text,
  unit_price bigint not null check (unit_price >= 0),
  service_date date,
  tax_code_id uuid,
  tax jsonb,
  item_id uuid,
  foreign key (organisation_id, document_id) references document (organisation_id, id) on delete cascade,
  foreign key (organisation_id, tax_code_id) references tax_code (organisation_id, id),
  foreign key (organisation_id, item_id) references item (organisation_id, id) on delete set null (item_id),
  unique (document_id, position) deferrable initially deferred
);
create index document_line_document_idx on document_line (organisation_id, document_id);

-- Payments received against a document.
create table payment (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null,
  document_id uuid not null,
  amount bigint not null check (amount > 0),
  currency char(3) not null,
  paid_on date not null,
  method text not null check (method in ('bank_transfer', 'card', 'cash', 'mobile_money', 'cheque', 'other')),
  reference text,
  note text,
  idempotency_key text not null,
  created_by text references auth_user (id) on delete set null,
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_reason text,
  unique (organisation_id, idempotency_key),
  foreign key (organisation_id, document_id) references document (organisation_id, id)
);
create index payment_document_idx on payment (organisation_id, document_id);
create index payment_paid_on_idx on payment (organisation_id, paid_on);

-- Gapless numbering: one counter per organisation and document kind, advanced inside the issuing transaction.
create table number_counter (
  organisation_id uuid not null references organisation (id) on delete cascade,
  kind text not null check (kind in ('invoice', 'credit_note')),
  next_value integer not null default 1 check (next_value >= 1),
  primary key (organisation_id, kind)
);

-- Append-only record of who did what.
create table audit_log (
  id bigint generated always as identity primary key,
  organisation_id uuid not null references organisation (id) on delete cascade,
  actor_user_id text,
  action text not null,
  entity text not null,
  entity_id text,
  data jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);
create index audit_log_entity_idx on audit_log (organisation_id, entity, entity_id);

-- Work to do after a transaction commits: emails, PDFs. Written in the same transaction as the change.
create table outbox (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisation (id) on delete cascade,
  topic text not null,
  payload jsonb not null,
  idempotency_key text not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'failed')),
  attempts integer not null default 0,
  run_after timestamptz not null default now(),
  last_error text,
  requested_by text references auth_user (id) on delete set null,
  created_at timestamptz not null default now(),
  done_at timestamptz,
  unique (organisation_id, idempotency_key)
);
create index outbox_pending_idx on outbox (status, run_after) where status in ('pending', 'running');
