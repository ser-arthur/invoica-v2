// Demo data for development: three businesses with invented clients and invoices. Never run against production.
// Usage: pnpm db:seed (reads DATABASE_URL from apps/web/.env.local or the environment).
import { hashPassword } from 'better-auth/crypto';
import { addDays, todayIn } from '@invoica/core';
import {
  createClient,
  createCreditNote,
  creditableLines,
  createDraft,
  createItem,
  createOrganisation,
  createDatabase,
  getDocument,
  issueDocument,
  listTaxCodes,
  markSent,
  recordPayment,
  schema,
  updateOrganisationProfile,
  voidDocument,
  withOrganisation,
  type Actor,
  type Tx,
} from '@invoica/db';
import { clientInput, draftInput, organisationProfileInput, type DraftInput } from '@invoica/schemas';
import { randomUUID } from 'node:crypto';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Set DATABASE_URL (the app role connection).');
  process.exit(1);
}
if (/prod|neon\.tech|amazonaws|supabase/i.test(url)) {
  console.error('Refusing to seed what looks like a hosted database.');
  process.exit(1);
}
const PASSWORD = 'demo-password-2026';
const { db, pool } = createDatabase(url, { max: 2 });
const now = new Date();

async function user(email: string, name: string): Promise<string> {
  const existing = await db.select().from(schema.authUser);
  if (existing.some((u) => u.email === email))
    throw new Error(`${email} already exists. Seed a fresh database.`);
  const id = randomUUID();
  await db.insert(schema.authUser).values({ id, email, name, emailVerified: true });
  await db.insert(schema.authAccount).values({
    id: randomUUID(),
    userId: id,
    accountId: id,
    providerId: 'credential',
    password: await hashPassword(PASSWORD),
  });
  return id;
}

const profile = (over: Record<string, unknown>) =>
  organisationProfileInput.parse({
    businessType: 'sole_trader',
    countryCode: 'GB',
    baseCurrency: 'GBP',
    timeZone: 'Europe/London',
    taxRegistered: false,
    pricesIncludeTax: false,
    taxLevel: 'line',
    rounding: 'half-up',
    defaultPaymentTermsDays: 30,
    invoicePrefix: 'INV-',
    creditNotePrefix: 'CN-',
    numberPadding: 4,
    brandColour: '#17795a',
    defaultTemplate: 'signature',
    paymentDetails: {},
    ...over,
  });

const client = (name: string, over: Record<string, unknown> = {}) =>
  clientInput.parse({
    name,
    email: `accounts@${name.toLowerCase().replace(/[^a-z]+/g, '')}.example`,
    countryCode: 'GB',
    ...over,
  });

interface InvoicePlan {
  clientId: string;
  daysAgo: number;
  lines: DraftInput['lines'];
  title?: string;
  summary?: string;
  style?: DraftInput['lineStyle'];
  currency?: string;
  sent?: boolean;
  paid?: 'full' | 'part' | null;
  draft?: boolean;
  discounts?: DraftInput['discounts'];
  deposit?: number;
}

async function invoice(tx: Tx, actor: Actor, today: string, plan: InvoicePlan) {
  const issueDate = addDays(today, -plan.daysAgo);
  const id = await createDraft(
    tx,
    actor,
    draftInput.parse({
      clientId: plan.clientId,
      currency: plan.currency ?? 'GBP',
      issueDate: plan.draft ? null : issueDate,
      lineStyle: plan.style ?? 'amount',
      pricesIncludeTax: false,
      template: 'signature',
      title: plan.title,
      summary: plan.summary,
      discounts: plan.discounts ?? [],
      prepayments: plan.deposit
        ? [
            {
              label: 'Deposit received',
              amount: plan.deposit,
              paidOn: addDays(issueDate, -14),
              method: 'bank_transfer',
            },
          ]
        : [],
      lines: plan.lines,
    }),
  );
  if (plan.draft) return id;
  await issueDocument(tx, actor, id, now);
  if (plan.sent !== false) await markSent(tx, actor, id, now);
  const balance = (await getDocument(tx, id, today))!.balance;
  if (plan.paid) {
    const amount = plan.paid === 'full' ? balance : Math.floor(balance / 2);
    await recordPayment(tx, actor, {
      documentId: id,
      amount,
      paidOn:
        addDays(issueDate, plan.paid === 'full' ? 12 : 20) > today
          ? today
          : addDays(issueDate, plan.paid === 'full' ? 12 : 20),
      method: 'bank_transfer',
      reference: null,
      note: null,
      idempotencyKey: `seed-${id}`,
    });
  }
  return id;
}

const line = (title: string, price: number, extra: Partial<DraftInput['lines'][number]> = {}) => ({
  title,
  quantity: 1000,
  unitPrice: price,
  description: null,
  unit: null,
  serviceDate: null,
  taxCodeId: null,
  itemId: null,
  ...extra,
});

async function freelancer() {
  const userId = await user('demo@invoica.example', 'Kofi Mensah');
  const orgId = await createOrganisation(db, userId, {
    name: 'Field Office',
    businessType: 'sole_trader',
    countryCode: 'GB',
    baseCurrency: 'GBP',
    timeZone: 'Europe/London',
    taxRegistered: false,
    taxNumber: null,
  });
  const actor = { userId, organisationId: orgId };
  await withOrganisation(db, actor, async (tx) => {
    const today = todayIn('Europe/London', now);
    await updateOrganisationProfile(
      tx,
      actor,
      profile({
        name: 'Field Office',
        email: 'hello@fieldoffice.example',
        addressLine1: '12 Example Yard',
        city: 'Bristol',
        postcode: 'BS1 4XX',
        brandColour: '#d9480f',
        defaultTemplate: 'studio',
        defaultNotes: 'Thank you for working with me.',
        defaultTerms: 'Payment within 30 days, by bank transfer.',
        paymentDetails: {
          bank: {
            accountName: 'Field Office',
            bankName: 'Example Bank',
            sortCode: '00-00-00',
            accountNumber: '00000000',
          },
        },
      }),
    );
    const mara = await createClient(
      tx,
      actor,
      client('Mara Linden Ceramics', { city: 'Bath', postcode: 'BA1 1AA', addressLine1: '3 Pottery Lane' }),
    );
    const ridge = await createClient(
      tx,
      actor,
      client('Ridgeway Labs', { city: 'Oxford', addressLine1: '40 Sample Road', paymentTermsDays: 14 }),
    );
    const north = await createClient(
      tx,
      actor,
      client('Northlane Logistics Ltd', { city: 'Leeds', addressLine1: '1 Sample Street' }),
    );
    await createClient(
      tx,
      actor,
      client('Osei Homes', { countryCode: 'GH', city: 'Accra', currency: 'GHS' }),
    );
    await createItem(tx, actor, {
      name: 'Design day',
      description: 'A day of design work',
      unitPrice: 45_000,
      unit: 'day',
      taxCodeId: null,
    });
    await createItem(tx, actor, {
      name: 'Logo pack',
      description: 'Logo, colours and a one-page guide',
      unitPrice: 120_000,
      unit: null,
      taxCodeId: null,
    });
    const plans: InvoicePlan[] = [
      {
        clientId: mara,
        daysAgo: 160,
        title: 'Brand refresh',
        lines: [line('Discovery and moodboard', 45_000), line('Logo pack', 120_000)],
        paid: 'full',
      },
      {
        clientId: ridge,
        daysAgo: 128,
        style: 'hours',
        title: 'Product design, May',
        lines: [
          line('Design sessions', 6000, { quantity: 14_500 }),
          line('Prototype review', 6000, { quantity: 3000 }),
        ],
        paid: 'full',
      },
      {
        clientId: north,
        daysAgo: 96,
        title: 'Annual report layout',
        lines: [line('Layout of 32 pages', 210_000), line('Print liaison', 25_000)],
        paid: 'full',
      },
      {
        clientId: mara,
        daysAgo: 70,
        title: 'Website for the spring collection',
        summary: 'Design and build of a new shop site, from first sketches to launch.',
        lines: [
          line('Discovery and moodboard', 45_000),
          line('Design of six page templates', 120_000),
          line('Build and content entry', 160_000),
          line('Launch support', 25_000),
        ],
        discounts: [{ label: 'Returning client', kind: 'percent', ratePpm: 50_000 }],
        paid: 'full',
      },
      {
        clientId: ridge,
        daysAgo: 48,
        style: 'hours',
        title: 'Product design, August',
        lines: [line('Design sessions', 6000, { quantity: 22_000 })],
        paid: 'part',
      },
      {
        clientId: north,
        daysAgo: 41,
        title: 'Signage system',
        lines: [line('Wayfinding design', 180_000), line('Artwork for production', 60_000)],
        paid: null,
      },
      {
        clientId: mara,
        daysAgo: 9,
        title: 'Autumn lookbook',
        lines: [line('Art direction, two days', 90_000), line('Layout and retouching', 70_000)],
        deposit: 40_000,
        paid: null,
      },
      {
        clientId: ridge,
        daysAgo: 0,
        draft: true,
        title: 'Product design, October',
        style: 'hours',
        lines: [line('Design sessions', 6000, { quantity: 8000 })],
      },
    ];
    for (const p of plans) await invoice(tx, actor, today, p);
  });
  return 'demo@invoica.example';
}

async function agency() {
  const userId = await user('agency@invoica.example', 'Ama Owusu');
  const orgId = await createOrganisation(db, userId, {
    name: 'Harrow & Vale',
    businessType: 'limited_company',
    countryCode: 'GB',
    baseCurrency: 'GBP',
    timeZone: 'Europe/London',
    taxRegistered: true,
    taxNumber: 'GB 000 0000 00',
  });
  const actor = { userId, organisationId: orgId };
  await withOrganisation(db, actor, async (tx) => {
    const today = todayIn('Europe/London', now);
    await updateOrganisationProfile(
      tx,
      actor,
      profile({
        name: 'Harrow & Vale',
        legalName: 'Harrow and Vale Consulting Ltd',
        businessType: 'limited_company',
        companyNumber: '00000000',
        email: 'accounts@harrowvale.example',
        addressLine1: '2 Example Square',
        city: 'London',
        postcode: 'EC1A 1AA',
        taxRegistered: true,
        taxNumber: 'GB 000 0000 00',
        brandColour: '#1d3c5a',
        defaultTemplate: 'counsel',
        defaultTerms:
          'Payment within 30 days. Late payments may incur interest under the Late Payment of Commercial Debts (Interest) Act 1998.',
        paymentDetails: {
          bank: {
            accountName: 'Harrow and Vale Consulting Ltd',
            bankName: 'Example Bank',
            sortCode: '00-00-00',
            accountNumber: '00000000',
          },
        },
      }),
    );
    const codes = await listTaxCodes(tx);
    const std = codes.find((c) => c.presetKey === 'uk_vat_standard')!.id;
    const zero = codes.find((c) => c.presetKey === 'uk_vat_zero')!.id;
    const a = await createClient(
      tx,
      actor,
      client('Northlane Logistics Ltd', {
        addressLine1: '1 Sample Street',
        city: 'Leeds',
        postcode: 'LS1 1AA',
        taxNumber: 'GB 111 1111 11',
      }),
    );
    const b = await createClient(
      tx,
      actor,
      client('Lumen Health Trust', {
        addressLine1: '8 Example Road',
        city: 'Manchester',
        postcode: 'M1 1AA',
      }),
    );
    const c = await createClient(
      tx,
      actor,
      client('Aura Coffee Roasters', {
        addressLine1: '22 Sample Street',
        city: 'Brighton',
        postcode: 'BN1 1AA',
      }),
    );
    const vat = (l: ReturnType<typeof line>) => ({ ...l, taxCodeId: std });
    await invoice(tx, actor, today, {
      clientId: a,
      daysAgo: 120,
      style: 'quantity',
      title: 'Operations review, phase one',
      lines: [
        vat(line('Site visits', 65_000, { quantity: 4000, unit: 'days' })),
        vat(line('Findings report', 180_000)),
      ],
      paid: 'full',
    });
    await invoice(tx, actor, today, {
      clientId: b,
      daysAgo: 75,
      style: 'dated',
      title: 'Advisory retainer, August',
      lines: Array.from({ length: 22 }, (_, i) =>
        vat(
          line(
            ['Board preparation', 'Policy drafting', 'Stakeholder interviews', 'Programme review'][i % 4]!,
            9_500,
            { quantity: [3000, 2500, 4000, 1500][i % 4]!, serviceDate: addDays(today, -105 + i) },
          ),
        ),
      ),
      paid: 'full',
    });
    const disputed = await invoice(tx, actor, today, {
      clientId: c,
      daysAgo: 52,
      style: 'quantity',
      title: 'Training workshop',
      lines: [
        vat(line('Workshop day', 120_000)),
        { ...line('Printed workbooks', 1_250, { quantity: 30_000 }), taxCodeId: zero },
      ],
      paid: null,
    });
    const workbooks = (await creditableLines(tx, disputed)).find((l) => l.title === 'Printed workbooks')!;
    await createCreditNote(
      tx,
      actor,
      {
        mode: 'lines',
        invoiceId: disputed,
        reason: 'Ten workbooks were not needed.',
        lines: [{ lineId: workbooks.id, quantity: 10_000 }],
        idempotencyKey: `seed-credit-${disputed}`,
      },
      now,
    );
    await invoice(tx, actor, today, {
      clientId: a,
      daysAgo: 38,
      style: 'quantity',
      title: 'Operations review, phase two',
      lines: [vat(line('Process mapping workshop', 120_000)), vat(line('Implementation plan', 240_000))],
      paid: 'part',
    });
    const voided = await invoice(tx, actor, today, {
      clientId: b,
      daysAgo: 20,
      style: 'quantity',
      lines: [vat(line('Advisory retainer, September', 380_000))],
      sent: false,
      paid: null,
    });
    await voidDocument(tx, actor, voided, 'Raised against the wrong purchase order.', now);
    await invoice(tx, actor, today, {
      clientId: b,
      daysAgo: 18,
      style: 'quantity',
      title: 'Advisory retainer, September',
      lines: [vat(line('Advisory retainer', 380_000))],
      paid: null,
    });
    await invoice(tx, actor, today, {
      clientId: c,
      daysAgo: 0,
      draft: true,
      style: 'quantity',
      lines: [vat(line('Coaching sessions', 15_000, { quantity: 6000 }))],
    });
  });
  return 'agency@invoica.example';
}

async function ghana() {
  const userId = await user('ghana@invoica.example', 'Yaw Asante');
  const orgId = await createOrganisation(db, userId, {
    name: 'Asante Building Supplies',
    businessType: 'limited_company',
    countryCode: 'GH',
    baseCurrency: 'GHS',
    timeZone: 'Africa/Accra',
    taxRegistered: true,
    taxNumber: 'C0000000000',
  });
  const actor = { userId, organisationId: orgId };
  await withOrganisation(db, actor, async (tx) => {
    const today = todayIn('Africa/Accra', now);
    await updateOrganisationProfile(
      tx,
      actor,
      profile({
        name: 'Asante Building Supplies',
        legalName: 'Asante Building Supplies Ltd',
        businessType: 'limited_company',
        countryCode: 'GH',
        baseCurrency: 'GHS',
        timeZone: 'Africa/Accra',
        addressLine1: 'Plot 4, Example Road',
        city: 'Kumasi',
        region: 'Ashanti',
        taxRegistered: true,
        taxNumber: 'C0000000000',
        taxLevel: 'document',
        brandColour: '#7a2e1d',
        paymentDetails: {
          mobileMoney: {
            provider: 'MTN MoMo',
            number: '000 000 0000',
            accountName: 'Asante Building Supplies',
          },
          bank: {
            accountName: 'Asante Building Supplies Ltd',
            bankName: 'Example Bank Ghana',
            accountNumber: '0000000000',
          },
        },
      }),
    );
    const std = (await listTaxCodes(tx)).find((c) => c.presetKey === 'gh_standard')!.id;
    const osei = await createClient(
      tx,
      actor,
      client('Osei Homes Ltd', { countryCode: 'GH', city: 'Accra', currency: 'GHS' }),
    );
    const kente = await createClient(
      tx,
      actor,
      client('Kente Court Developments', { countryCode: 'GH', city: 'Tema', currency: 'GHS' }),
    );
    const exp = await createClient(
      tx,
      actor,
      client('Lagoon Trading Co', { countryCode: 'NG', city: 'Lagos', currency: 'USD' }),
    );
    const g = (l: ReturnType<typeof line>) => ({ ...l, taxCodeId: std });
    await invoice(tx, actor, today, {
      clientId: osei,
      currency: 'GHS',
      daysAgo: 64,
      style: 'quantity',
      lines: [
        g(line('Cement, 50 kg bags', 9_850, { quantity: 120_000, unit: 'bags' })),
        g(line('Iron rods, 12 mm', 14_200, { quantity: 80_000, unit: 'lengths' })),
        g(line('Delivery to site', 60_000)),
      ],
      paid: 'full',
    });
    await invoice(tx, actor, today, {
      clientId: kente,
      currency: 'GHS',
      daysAgo: 35,
      style: 'quantity',
      lines: [
        g(line('Roofing sheets', 21_500, { quantity: 60_000, unit: 'sheets' })),
        g(line('Delivery to site', 45_000)),
      ],
      paid: 'part',
    });
    await invoice(tx, actor, today, {
      clientId: exp,
      currency: 'USD',
      daysAgo: 12,
      style: 'quantity',
      lines: [line('Floor tiles, export order', 1_850, { quantity: 400_000, unit: 'm²' })],
      paid: null,
    });
  });
  return 'ghana@invoica.example';
}

const emails = [await freelancer(), await agency(), await ghana()];
await pool.end();
console.log(
  `Seeded ${emails.length} demo businesses. Sign in with any of: ${emails.join(', ')}. Password: ${PASSWORD}`,
);
