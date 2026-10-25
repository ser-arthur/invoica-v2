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
  parseExchangeRate,
  REMINDER_PLACEHOLDERS,
  unknownPlaceholders,
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
  /** Made when the new-code form opens, so saving it again creates one code. */
  idempotencyKey: z.string().min(8).max(100).optional(),
  label: requiredText(80, 'Give the tax code a name.'),
  treatment: z
    .enum(TAX_TREATMENTS as [string, ...string[]])
    .transform((v) => v as (typeof TAX_TREATMENTS)[number]),
  components: z.array(taxComponentInput).max(5),
  isDefault: z.boolean().default(false),
});
export type TaxCodeInput = z.infer<typeof taxCodeInput>;

/** The version of a record a form showed (docs/specs/changes-elsewhere.md); left out by an older page. */
export const recordVersion = z
  .string()
  .regex(/^[0-9a-f]{64}$/)
  .nullable()
  .optional();

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
  sterlingRateMethod: z.enum(['hmrc_period', 'market']).default('hmrc_period'),
  invoicePrefix: prefix,
  creditNotePrefix: prefix,
  numberPadding: z.number().int().min(1).max(8),
  brandColour: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Choose a colour.'),
  /** The business's own second colour; null or empty for one worked out from the brand colour. */
  accentColour: z.preprocess(
    (v) => (v === '' ? null : v),
    z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Choose a colour, or automatic.')
      .transform((v) => v.toLowerCase())
      .nullable()
      .optional(),
  ),
  logoGround: z.enum(['none', 'white', 'cream', 'black']).default('white'),
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
  /** Made when the new-client form opens, so saving it again creates one client. */
  idempotencyKey: z.string().min(8).max(100).optional(),
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
  /** Left out, a new client gets reminders and an existing one keeps its setting. */
  remindersEnabled: z.boolean().optional(),
  fields: z.array(clientFieldInput).max(10).default([]),
});
export type ClientInput = z.infer<typeof clientInput>;

/** Wording whose placeholders are all ones Invoica fills in, so a typo never reaches a client. */
const reminderText = (max: number, message: string) =>
  requiredText(max, message).superRefine((text, ctx) => {
    const unknown = unknownPlaceholders(text);
    if (unknown.length === 0) return;
    const use = REMINDER_PLACEHOLDERS.map((p) => `{${p}}`);
    ctx.addIssue({
      code: 'custom',
      message: `Invoica cannot fill in ${unknown.join(', ')}. Use ${use.slice(0, -1).join(', ')} or ${use.at(-1)}.`,
    });
  });

const reminderWordingInput = z.object({
  subject: reminderText(200, 'Write a subject.'),
  body: reminderText(4000, 'Write the email.'),
});

/** Reminder settings (docs/specs/reminders.md). A kind of reminder left out uses the default wording. */
export const reminderSettingsInput = z.object({
  remindersEnabled: z.boolean(),
  reminderOffsets: z
    .array(z.union([z.literal(-3), z.literal(0), z.literal(7), z.literal(14), z.literal(30)]))
    .max(5)
    .transform((list) => [...new Set(list)].sort((a, b) => a - b)),
  reminderWording: z
    .object({
      before: reminderWordingInput.optional(),
      due: reminderWordingInput.optional(),
      late: reminderWordingInput.optional(),
    })
    .default({}),
});
export type ReminderSettingsInput = z.infer<typeof reminderSettingsInput>;

export const itemInput = z.object({
  /** Made when the new-item form opens, so saving it again creates one item. */
  idempotencyKey: z.string().min(8).max(100).optional(),
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

/** A rate as typed, units of the currency to £1 with up to six decimal places; blank is none. */
const exchangeRate = z
  .union([z.string().max(20), z.null()])
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value === null || value.trim() === '') return null;
    const rate = parseExchangeRate(value);
    if (rate === null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enter the rate as a number with up to six decimal places, for example 1.1500.',
      });
      return z.NEVER;
    }
    return rate;
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
    /** Units of the invoice's currency to £1, for VAT in sterling (docs/specs/vat-in-sterling.md). */
    sterlingRate: exchangeRate,
    /**
     * What the editor worked the rate out for when it was typed (`sterlingRateFor` in `@invoica/core`), so the same
     * figure typed again for a new month or day is told apart from one carried over.
     */
    sterlingRateFor: z.string().max(60).nullable().optional(),
    lines: z.array(lineInput).max(200, 'An invoice can have at most 200 lines.'),
    /** Sent with the first save of a new invoice, so a repeated save finds the same draft. */
    idempotencyKey: z.string().min(8).max(100).optional(),
    /** The version of the draft the page opened (`draftVersion`), so a change made elsewhere since is not lost. */
    version: z
      .string()
      .regex(/^\d{1,20}$/)
      .optional(),
    /** Replace a change made elsewhere since the page opened, when the person says to. */
    overwrite: z.boolean().optional(),
  })
  .refine((d) => !d.dueDate || !d.issueDate || d.dueDate >= d.issueDate, {
    message: 'The due date cannot be before the issue date.',
    path: ['dueDate'],
  })
  // A period is both dates or neither, so the tax point, the rate for VAT in sterling and the printed period agree.
  .refine((d) => !d.servicePeriodEnd || !!d.servicePeriodStart, {
    message: 'Enter both dates of the period, or neither.',
    path: ['servicePeriodStart'],
  })
  .refine((d) => !d.servicePeriodStart || !!d.servicePeriodEnd, {
    message: 'Enter both dates of the period, or neither.',
    path: ['servicePeriodEnd'],
  })
  .refine((d) => !d.servicePeriodStart || !d.servicePeriodEnd || d.servicePeriodEnd >= d.servicePeriodStart, {
    message: 'The period cannot end before it starts.',
    path: ['servicePeriodEnd'],
  });
export type DraftInput = z.infer<typeof draftInput>;
/** A draft as a form sends it, before parsing: the exchange rate is still text. */
export type DraftFormInput = z.input<typeof draftInput>;

/** What the person saw when they confirmed issuing: the total, in the invoice's minor units. */
export const issueConfirmation = z.object({
  total: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
});

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

/**
 * The refund made with a credit note above the balance owed (docs/specs/refunds.md). `amount` is the refund the
 * person confirmed; the server works it out again and refuses the request when the two differ.
 */
export const refundInput = z.object({
  amount: z.number().int('Amounts are whole minor units.').min(1).max(Number.MAX_SAFE_INTEGER),
  refundedOn: businessDate,
  method: z.enum(paymentMethods),
  reference: optionalText(100),
});
export type RefundInput = z.infer<typeof refundInput>;

const creditNoteBase = {
  invoiceId: z.uuid(),
  reason: requiredText(500, 'Say why the credit note is issued.'),
  idempotencyKey: z.string().min(8).max(100),
  refund: refundInput.optional(),
};

/**
 * A credit note credits the whole invoice, quantities of its lines, an amount in the invoice's price basis (before
 * tax when its prices exclude tax, including tax when they include it), or everything still owed. Prices and tax
 * always come from the invoice.
 */
export const creditNoteInput = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('whole'), ...creditNoteBase }),
  z.object({
    mode: z.literal('lines'),
    ...creditNoteBase,
    lines: z
      .array(z.object({ lineId: z.uuid(), quantity: z.number().int().min(0).max(MAX_QUANTITY) }))
      .min(1, 'Choose at least one line to credit.')
      .max(200),
  }),
  z.object({
    mode: z.literal('amount'),
    ...creditNoteBase,
    amount: minorAmount.min(1, 'Enter the amount to credit.'),
  }),
  z.object({
    mode: z.literal('balance'),
    ...creditNoteBase,
    /** The balance the person confirmed: refused when the balance owed is another by the time it is issued. */
    balance: z.number().int('Amounts are whole minor units.').min(1).max(Number.MAX_SAFE_INTEGER),
  }),
]);
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

export const sendDocumentInput = z.object({
  documentId: z.uuid(),
  to: z.email('Enter the client’s email address.').max(254),
  subject: requiredText(200, 'Add a subject.'),
  message: requiredText(4000, 'Add a short message.'),
  idempotencyKey: z.string().min(8).max(100),
});
