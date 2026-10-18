import { z } from 'zod';
import {
  ROUNDING_MODES,
  TAX_TREATMENTS,
  isBusinessDate,
  isSupportedCurrency,
  isValidTimeZone,
  validatePrefix,
  RATE_SCALE,
  MAX_QUANTITY,
  MAX_UNIT_PRICE,
} from '@invoica/core';

/** Trims text; empty becomes null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max} characters.`)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

const requiredText = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max, `Use at most ${max} characters.`);

export const currencyCode = z
  .string()
  .trim()
  .toUpperCase()
  .refine(isSupportedCurrency, 'Choose a supported currency.');
export const countryCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, 'Choose a country.');
export const businessDate = z.string().refine(isBusinessDate, 'Enter a real date.');
const optionalDate = z
  .union([businessDate, z.literal(''), z.null()])
  .optional()
  .transform((v) => (v ? v : null));
export const minorAmount = z.number().int('Amounts are whole minor units.').min(0).max(MAX_UNIT_PRICE);
const email = z
  .string()
  .trim()
  .max(254)
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null)
  .refine((v) => v === null || z.email().safeParse(v).success, 'Enter a valid email address.');
const prefix = z
  .string()
  .trim()
  .superRefine((v, ctx) => {
    const problem = validatePrefix(v);
    if (problem) ctx.addIssue({ code: 'custom', message: problem });
  });

export const taxComponentInput = z.object({
  name: requiredText(40, 'Name the tax.'),
  ratePpm: z.number().int().min(0).max(RATE_SCALE),
  compound: z.boolean().default(false),
});

export const taxCodeInput = z.object({
  label: requiredText(80, 'Give the tax code a name.'),
  treatment: z
    .enum(TAX_TREATMENTS as [string, ...string[]])
    .transform((v) => v as (typeof TAX_TREATMENTS)[number]),
  components: z.array(taxComponentInput).max(5),
  isDefault: z.boolean().default(false),
});
export type TaxCodeInput = z.infer<typeof taxCodeInput>;

export const businessTypes = ['sole_trader', 'limited_company', 'partnership', 'other'] as const;

export const onboardingInput = z.object({
  name: requiredText(200, 'Enter your business name.'),
  businessType: z.enum(businessTypes),
  countryCode,
  baseCurrency: currencyCode,
  timeZone: z.string().refine(isValidTimeZone, 'Choose a time zone.'),
  taxRegistered: z.boolean(),
  taxNumber: optionalText(40),
});
export type OnboardingInput = z.infer<typeof onboardingInput>;

export const paymentDetailsInput = z.object({
  bank: z
    .object({
      accountName: optionalText(120),
      bankName: optionalText(120),
      sortCode: optionalText(20),
      accountNumber: optionalText(40),
      iban: optionalText(40),
      swift: optionalText(20),
    })
    .optional(),
  mobileMoney: z
    .object({ provider: optionalText(60), number: optionalText(30), accountName: optionalText(120) })
    .optional(),
  paymentLink: optionalText(300),
});

export const organisationProfileInput = z.object({
  name: requiredText(200, 'Enter your business name.'),
  legalName: optionalText(200),
  businessType: z.enum(businessTypes),
  companyNumber: optionalText(40),
  email,
  phone: optionalText(40),
  website: optionalText(200),
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(100),
  region: optionalText(100),
  postcode: optionalText(20),
  countryCode,
  baseCurrency: currencyCode,
  timeZone: z.string().refine(isValidTimeZone, 'Choose a time zone.'),
  taxRegistered: z.boolean(),
  taxNumber: optionalText(40),
  pricesIncludeTax: z.boolean(),
  taxLevel: z.enum(['document', 'line']),
  rounding: z
    .enum(ROUNDING_MODES as [string, ...string[]])
    .transform((v) => v as (typeof ROUNDING_MODES)[number]),
  defaultPaymentTermsDays: z.number().int().min(0).max(365),
  invoicePrefix: prefix,
  creditNotePrefix: prefix,
  numberPadding: z.number().int().min(1).max(8),
  brandColour: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Choose a colour.'),
  defaultTemplate: z.string().min(1).max(40),
  paymentDetails: paymentDetailsInput,
  defaultNotes: optionalText(2000),
  defaultTerms: optionalText(2000),
});
export type OrganisationProfileInput = z.infer<typeof organisationProfileInput>;

export const clientFieldInput = z.object({
  label: requiredText(60, 'Name the field.'),
  value: z.string().trim().max(200),
  showOnDocuments: z.boolean().default(true),
});

export const clientInput = z.object({
  name: requiredText(200, 'Enter the client’s name.'),
  contactName: optionalText(200),
  email,
  phone: optionalText(40),
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(100),
  region: optionalText(100),
  postcode: optionalText(20),
  countryCode: z
    .union([countryCode, z.literal(''), z.null()])
    .optional()
    .transform((v) => (v ? v : null)),
  taxNumber: optionalText(40),
  currency: z
    .union([currencyCode, z.literal(''), z.null()])
    .optional()
    .transform((v) => (v ? v : null)),
  paymentTermsDays: z
    .number()
    .int()
    .min(0)
    .max(365)
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  notes: optionalText(2000),
  fields: z.array(clientFieldInput).max(10).default([]),
});
export type ClientInput = z.infer<typeof clientInput>;

export const itemInput = z.object({
  name: requiredText(200, 'Name the item.'),
  description: optionalText(2000),
  unitPrice: minorAmount,
  unit: optionalText(20),
  taxCodeId: z
    .uuid()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
});
export type ItemInput = z.infer<typeof itemInput>;

export const lineStyles = ['amount', 'quantity', 'hours', 'dated'] as const;
export const paymentMethods = ['bank_transfer', 'card', 'cash', 'mobile_money', 'cheque', 'other'] as const;

export const lineInput = z.object({
  title: requiredText(500, 'Describe the line.'),
  description: optionalText(4000),
  quantity: z.number().int().min(1, 'Quantity must be more than zero.').max(MAX_QUANTITY),
  unit: optionalText(20),
  unitPrice: minorAmount,
  serviceDate: optionalDate,
  taxCodeId: z
    .uuid()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  itemId: z
    .uuid()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
});
export type LineInput = z.infer<typeof lineInput>;

export const discountInput = z.discriminatedUnion('kind', [
  z.object({
    label: requiredText(80, 'Name the discount.'),
    kind: z.literal('percent'),
    ratePpm: z.number().int().min(0).max(RATE_SCALE),
  }),
  z.object({ label: requiredText(80, 'Name the discount.'), kind: z.literal('amount'), amount: minorAmount }),
]);

export const prepaymentInput = z.object({
  label: requiredText(80, 'Name the payment.'),
  amount: minorAmount.min(1),
  paidOn: businessDate,
  method: z.enum(paymentMethods),
});

export const documentOptionsInput = z.object({
  showBank: z.boolean().optional(),
  showMobileMoney: z.boolean().optional(),
  showPaymentLink: z.boolean().optional(),
  showNotes: z.boolean().optional(),
  showTerms: z.boolean().optional(),
});

export const draftInput = z
  .object({
    clientId: z.uuid('Choose a client.'),
    currency: currencyCode,
    issueDate: optionalDate,
    dueDate: optionalDate,
    supplyDate: optionalDate,
    servicePeriodStart: optionalDate,
    servicePeriodEnd: optionalDate,
    reference: optionalText(100),
    title: optionalText(200),
    summary: optionalText(2000),
    lineStyle: z.enum(lineStyles),
    pricesIncludeTax: z.boolean(),
    discounts: z.array(discountInput).max(5).default([]),
    prepayments: z.array(prepaymentInput).max(5).default([]),
    notes: optionalText(2000),
    terms: optionalText(2000),
    template: z.string().min(1).max(40),
    options: documentOptionsInput.default({}),
    lines: z.array(lineInput).max(200, 'An invoice can have at most 200 lines.'),
  })
  .refine((d) => !d.dueDate || !d.issueDate || d.dueDate >= d.issueDate, {
    message: 'The due date cannot be before the issue date.',
    path: ['dueDate'],
  })
  .refine((d) => !d.servicePeriodStart || !d.servicePeriodEnd || d.servicePeriodEnd >= d.servicePeriodStart, {
    message: 'The period cannot end before it starts.',
    path: ['servicePeriodEnd'],
  });
export type DraftInput = z.infer<typeof draftInput>;

export const paymentInput = z.object({
  documentId: z.uuid(),
  amount: minorAmount.min(1, 'Enter the amount received.'),
  paidOn: businessDate,
  method: z.enum(paymentMethods),
  reference: optionalText(100),
  note: optionalText(500),
  idempotencyKey: z.string().min(8).max(100),
});
export type PaymentInput = z.infer<typeof paymentInput>;

export const creditNoteInput = z.object({
  invoiceId: z.uuid(),
  reason: requiredText(500, 'Say why the credit note is issued.'),
  /** Credit the whole balance, or these lines. */
  lines: z.array(lineInput).max(200).optional(),
  idempotencyKey: z.string().min(8).max(100),
});
export type CreditNoteInput = z.infer<typeof creditNoteInput>;

export const voidInput = z.object({
  documentId: z.uuid(),
  reason: requiredText(500, 'Say why the document is voided.'),
});

/** First error message per field path, for showing next to form fields. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
