/**
 * Drizzle definitions of the tables created by migrations/*.sql. The SQL files are the source of truth;
 * test/schema-drift.test.ts checks that every column here exists in the migrated database with the same type.
 */
import {
  bigint,
  boolean,
  char,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  bigserial,
} from 'drizzle-orm/pg-core';
import type { DiscountInput, TaxCode, TaxComponent, RoundingMode, TaxLevel, Lifecycle } from '@invoica/core';

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });
const money = (name: string) => bigint(name, { mode: 'number' });
const day = (name: string) => date(name, { mode: 'string' });

export const authUser = pgTable('auth_user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

export const authSession = pgTable('auth_session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: ts('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

export const authAccount = pgTable('auth_account', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: ts('access_token_expires_at'),
  refreshTokenExpiresAt: ts('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

export const authVerification = pgTable('auth_verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: ts('expires_at').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

export type BusinessType = 'sole_trader' | 'limited_company' | 'partnership' | 'other';
export type Plan = 'trial' | 'free' | 'pro' | 'studio';

export interface PaymentDetails {
  bank?: {
    accountName?: string;
    bankName?: string;
    sortCode?: string;
    accountNumber?: string;
    iban?: string;
    swift?: string;
  };
  mobileMoney?: { provider?: string; number?: string; accountName?: string };
  paymentLink?: string;
}

export const organisation = pgTable('organisation', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  legalName: text('legal_name'),
  businessType: text('business_type').$type<BusinessType>().notNull().default('sole_trader'),
  companyNumber: text('company_number'),
  email: text('email'),
  phone: text('phone'),
  website: text('website'),
  addressLine1: text('address_line1'),
  addressLine2: text('address_line2'),
  city: text('city'),
  region: text('region'),
  postcode: text('postcode'),
  countryCode: char('country_code', { length: 2 }).notNull().default('GB'),
  baseCurrency: char('base_currency', { length: 3 }).notNull().default('GBP'),
  timeZone: text('time_zone').notNull().default('Europe/London'),
  locale: text('locale').notNull().default('en-GB'),
  taxRegistered: boolean('tax_registered').notNull().default(false),
  taxNumber: text('tax_number'),
  pricesIncludeTax: boolean('prices_include_tax').notNull().default(false),
  taxLevel: text('tax_level').$type<TaxLevel>().notNull().default('document'),
  rounding: text('rounding').$type<RoundingMode>().notNull().default('half-up'),
  defaultPaymentTermsDays: integer('default_payment_terms_days').notNull().default(30),
  invoicePrefix: text('invoice_prefix').notNull().default('INV-'),
  creditNotePrefix: text('credit_note_prefix').notNull().default('CN-'),
  numberPadding: integer('number_padding').notNull().default(4),
  brandColour: text('brand_colour').notNull().default('#17795a'),
  logoFileId: uuid('logo_file_id'),
  defaultTemplate: text('default_template').notNull().default('signature'),
  paymentDetails: jsonb('payment_details').$type<PaymentDetails>().notNull().default({}),
  defaultNotes: text('default_notes'),
  defaultTerms: text('default_terms'),
  plan: text('plan').$type<Plan>().notNull().default('trial'),
  trialEndsAt: ts('trial_ends_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

export const membership = pgTable('membership', {
  organisationId: uuid('organisation_id').notNull(),
  userId: text('user_id').notNull(),
  role: text('role').$type<'owner'>().notNull().default('owner'),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const taxCode = pgTable('tax_code', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').notNull(),
  presetKey: text('preset_key'),
  label: text('label').notNull(),
  treatment: text('treatment').$type<TaxCode['treatment']>().notNull(),
  components: jsonb('components').$type<TaxComponent[]>().notNull().default([]),
  validFrom: day('valid_from'),
  validTo: day('valid_to'),
  isDefault: boolean('is_default').notNull().default(false),
  sort: integer('sort').notNull().default(0),
  archivedAt: ts('archived_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

export const client = pgTable('client', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').notNull(),
  name: text('name').notNull(),
  contactName: text('contact_name'),
  email: text('email'),
  phone: text('phone'),
  addressLine1: text('address_line1'),
  addressLine2: text('address_line2'),
  city: text('city'),
  region: text('region'),
  postcode: text('postcode'),
  countryCode: char('country_code', { length: 2 }),
  taxNumber: text('tax_number'),
  currency: char('currency', { length: 3 }),
  paymentTermsDays: integer('payment_terms_days'),
  notes: text('notes'),
  archivedAt: ts('archived_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

export const clientField = pgTable('client_field', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').notNull(),
  clientId: uuid('client_id').notNull(),
  label: text('label').notNull(),
  value: text('value').notNull(),
  showOnDocuments: boolean('show_on_documents').notNull().default(true),
  sort: integer('sort').notNull().default(0),
});

export const item = pgTable('item', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  unitPrice: money('unit_price').notNull(),
  unit: text('unit'),
  taxCodeId: uuid('tax_code_id'),
  archivedAt: ts('archived_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

export const storedFile = pgTable('stored_file', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').notNull(),
  purpose: text('purpose').$type<'logo' | 'document_pdf'>().notNull(),
  contentType: text('content_type').notNull(),
  byteSize: money('byte_size').notNull(),
  sha256: text('sha256').notNull(),
  storageKey: text('storage_key').notNull().unique(),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export type DocumentKind = 'invoice' | 'credit_note';
export type LineStyle = 'amount' | 'quantity' | 'hours' | 'dated';

export interface Prepayment {
  label: string;
  amount: number;
  paidOn: string;
  method: 'bank_transfer' | 'card' | 'cash' | 'mobile_money' | 'cheque' | 'other';
}

export interface DocumentOptions {
  showBank?: boolean;
  showMobileMoney?: boolean;
  showPaymentLink?: boolean;
  showNotes?: boolean;
  showTerms?: boolean;
}

export const document = pgTable('document', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').notNull(),
  kind: text('kind').$type<DocumentKind>().notNull(),
  lifecycle: text('lifecycle').$type<Lifecycle>().notNull().default('draft'),
  sequence: integer('sequence'),
  number: text('number'),
  clientId: uuid('client_id').notNull(),
  creditedDocumentId: uuid('credited_document_id'),
  currency: char('currency', { length: 3 }).notNull(),
  issueDate: day('issue_date'),
  dueDate: day('due_date'),
  supplyDate: day('supply_date'),
  servicePeriodStart: day('service_period_start'),
  servicePeriodEnd: day('service_period_end'),
  reference: text('reference'),
  title: text('title'),
  summary: text('summary'),
  lineStyle: text('line_style').$type<LineStyle>().notNull().default('quantity'),
  pricesIncludeTax: boolean('prices_include_tax').notNull().default(false),
  taxLevel: text('tax_level').$type<TaxLevel>().notNull().default('document'),
  rounding: text('rounding').$type<RoundingMode>().notNull().default('half-up'),
  discounts: jsonb('discounts').$type<DiscountInput[]>().notNull().default([]),
  prepayments: jsonb('prepayments').$type<Prepayment[]>().notNull().default([]),
  notes: text('notes'),
  terms: text('terms'),
  template: text('template').notNull().default('signature'),
  options: jsonb('options').$type<DocumentOptions>().notNull().default({}),
  subtotal: money('subtotal').notNull().default(0),
  discountTotal: money('discount_total').notNull().default(0),
  taxTotal: money('tax_total').notNull().default(0),
  total: money('total').notNull().default(0),
  snapshot: jsonb('snapshot').$type<Record<string, unknown>>(),
  pdfFileId: uuid('pdf_file_id'),
  issuedAt: ts('issued_at'),
  sentAt: ts('sent_at'),
  voidedAt: ts('voided_at'),
  voidReason: text('void_reason'),
  createdBy: text('created_by'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
  idempotencyKey: text('idempotency_key'),
});

export const documentLine = pgTable('document_line', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').notNull(),
  documentId: uuid('document_id').notNull(),
  position: integer('position').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  quantity: money('quantity').notNull(),
  unit: text('unit'),
  unitPrice: money('unit_price').notNull(),
  serviceDate: day('service_date'),
  taxCodeId: uuid('tax_code_id'),
  tax: jsonb('tax').$type<TaxCode | null>(),
  itemId: uuid('item_id'),
});

export type PaymentMethod = Prepayment['method'];

export const payment = pgTable('payment', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').notNull(),
  documentId: uuid('document_id').notNull(),
  amount: money('amount').notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  paidOn: day('paid_on').notNull(),
  method: text('method').$type<PaymentMethod>().notNull(),
  reference: text('reference'),
  note: text('note'),
  idempotencyKey: text('idempotency_key').notNull(),
  createdBy: text('created_by'),
  createdAt: ts('created_at').notNull().defaultNow(),
  removedAt: ts('removed_at'),
  removedReason: text('removed_reason'),
});

export const numberCounter = pgTable('number_counter', {
  organisationId: uuid('organisation_id').notNull(),
  kind: text('kind').$type<DocumentKind>().notNull(),
  nextValue: integer('next_value').notNull().default(1),
});

export const auditLog = pgTable('audit_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  organisationId: uuid('organisation_id').notNull(),
  actorUserId: text('actor_user_id'),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  data: jsonb('data').$type<Record<string, unknown>>().notNull().default({}),
  at: ts('at').notNull().defaultNow(),
});

export const outbox = pgTable('outbox', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id').notNull(),
  topic: text('topic').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  idempotencyKey: text('idempotency_key').notNull(),
  status: text('status').$type<'pending' | 'running' | 'done' | 'failed'>().notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  runAfter: ts('run_after').notNull().defaultNow(),
  lastError: text('last_error'),
  requestedBy: text('requested_by'),
  createdAt: ts('created_at').notNull().defaultNow(),
  doneAt: ts('done_at'),
});
