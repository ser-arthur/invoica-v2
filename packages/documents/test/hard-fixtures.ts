import { SUPPORTED_CURRENCIES, type DocumentSnapshot, type TaxCode } from '@invoica/core';
import { snapshot } from './fixtures';

/**
 * The hard document pack (decision 0003): the documents most likely to break a layout. Every template renders
 * each one, and the PDF tests check what each must keep.
 */

const VAT20: TaxCode = {
  label: 'Standard rate',
  treatment: 'standard',
  components: [{ name: 'VAT', ratePpm: 200_000, compound: false }],
};

function withReference(reference: string, s: DocumentSnapshot): DocumentSnapshot {
  return { ...s, reference };
}

const LONG_WORD = 'Wolstenholme-Fitzgeraldson-Montgomery-Hargreaves-Featherstonehaugh';

const paragraph =
  'The work covered the discovery sessions, a review of the existing service, interviews with the people who run it ' +
  'day to day, a written account of what we found and a plan for the next quarter with costs and owners.';

/** Unbroken text a client might really send: a purchase order reference and a web address. */
const UNBROKEN_REFERENCE = 'PO2026000000000000000000000000000000099';
const UNBROKEN_WEBSITE = 'https://www.wolstenholmefitzgeraldsonconsultingandadvisory.example/pay';

export const HARD: Record<string, DocumentSnapshot> = {
  longNames: withReference(
    UNBROKEN_REFERENCE,
    snapshot({
      number: 'INV-2026-000000123',
      currency: 'GBP',
      lineStyle: 'quantity',
      template: 'signature',
      seller: {
        name: `${LONG_WORD} Consulting`,
        legalName: `${LONG_WORD} Consulting and Advisory Services Limited Liability Partnership`,
        taxRegistered: true,
        taxNumber: 'GB 000 0000 00',
        email: 'accounts.receivable.department@wolstenholme-fitzgeraldson-consulting.example',
        website: UNBROKEN_WEBSITE,
      },
      buyer: {
        name: `The ${LONG_WORD} Regional Health and Social Care Partnership Trust`,
        contactName: 'Accounts payable, finance shared service centre, second floor',
        fields: [
          { label: 'Purchase order', value: 'PO-2026-0000000000000000000099' },
          { label: 'Cost centre', value: 'CC-REGIONAL-TRANSFORMATION-PROGRAMME-07' },
        ],
      },
      title: `${LONG_WORD} service review and transformation programme, phase one of three`,
      summary: paragraph,
      lines: [
        { title: `Discovery with ${LONG_WORD}`, quantity: 4000, unitPrice: 65_000, unit: 'days', tax: VAT20 },
        {
          title: 'Supercalifragilisticexpialidocious-workshop-facilitation',
          quantity: 1000,
          unitPrice: 120_000,
          tax: VAT20,
        },
      ],
    }),
  ),
  longDescription: snapshot({
    number: 'INV-0412',
    currency: 'GBP',
    lineStyle: 'amount',
    template: 'signature',
    seller: { name: 'Field Office' },
    buyer: { name: 'Northlane Logistics Ltd' },
    lines: [
      {
        title: 'Programme of work',
        description: `${Array.from({ length: 18 }, () => paragraph).join('\n\n')}\n\nEnd of description.`,
        quantity: 1000,
        unitPrice: 2_400_000,
      },
      { title: 'Expenses', quantity: 1000, unitPrice: 18_000 },
    ],
  }),
  manyLines: snapshot({
    number: 'INV-0999',
    currency: 'GBP',
    lineStyle: 'quantity',
    template: 'signature',
    seller: { name: 'Calder Supplies', taxRegistered: true, taxNumber: 'GB 000 0000 00' },
    buyer: { name: 'Wren Bakery' },
    deposit: 50_000,
    lines: Array.from({ length: 120 }, (_, i) => ({
      title: `Item ${String(i + 1).padStart(3, '0')}`,
      quantity: ((i % 7) + 1) * 1000,
      unitPrice: 1_250 + i * 37,
      unit: 'each',
      tax: VAT20,
    })),
  }),
  bareAddresses: snapshot({
    number: 'INV-0001',
    currency: 'GBP',
    lineStyle: 'amount',
    template: 'signature',
    seller: {
      name: 'Jo',
      email: null,
      address: { line1: null, line2: null, city: null, region: null, postcode: null, countryCode: 'GB' },
    },
    buyer: {
      name: 'Al',
      address: { line1: null, line2: null, city: null, region: null, postcode: null, countryCode: 'GB' },
    },
    lines: [{ title: 'Logo', quantity: 1000, unitPrice: 15_000 }],
  }),
  fullAddresses: snapshot({
    number: 'INV-0002',
    currency: 'EUR',
    lineStyle: 'amount',
    template: 'signature',
    seller: {
      name: 'Harrow & Vale',
      phone: '+44 20 0000 0000',
      website: 'https://harrowvale.example',
      address: {
        line1: 'Unit 4, The Old Print Works, 112 to 118 Example Road',
        line2: 'Riverside Business Quarter, Second Floor, East Wing',
        city: 'Newcastle upon Tyne',
        region: 'Tyne and Wear',
        postcode: 'NE1 4XX',
        countryCode: 'GB',
      },
    },
    buyer: {
      name: 'Atelier Montclair',
      contactName: 'Service comptabilité fournisseurs',
      address: {
        line1: '27 rue de l’Exemple, bâtiment C, escalier 2',
        line2: 'Zone d’activités du Grand Large, cinquième étage',
        city: 'Saint-Germain-en-Laye',
        region: 'Île-de-France',
        postcode: '78100',
        countryCode: 'FR',
      },
      taxNumber: 'FR00000000000',
    },
    lines: [{ title: 'Brand identity', quantity: 1000, unitPrice: 480_000 }],
  }),
};

/** A short invoice in each supported currency, so every currency's figures are checked on every template. */
export const CURRENCIES: DocumentSnapshot[] = SUPPORTED_CURRENCIES.map((c) =>
  snapshot({
    number: `INV-${c.code}`,
    currency: c.code,
    lineStyle: 'quantity',
    template: 'signature',
    seller: { name: 'Field Office' },
    buyer: { name: 'Northlane Logistics Ltd' },
    lines: [
      { title: 'Design', quantity: 3000, unitPrice: 123_457 },
      { title: 'Hosting', quantity: 1500, unitPrice: 9_999 },
    ],
  }),
);
