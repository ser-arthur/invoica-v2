import 'server-only';
import { toDecimalString, quantityToString, type TaxCode } from '@invoica/core';
import {
  buyerFrom,
  clientsForEditor,
  listItems,
  listTaxCodes,
  organisationEntitlements,
  peekNextNumber,
  sellerFrom,
  type Tx,
  type DocumentDetail,
} from '@invoica/db';
import type { EditorProps, EditorState } from '@/components/invoice-editor';
import type { Workspace } from './session';

let n = 0;
const key = () => `s${(n++).toString(36)}`;

export async function loadEditorData(tx: Tx, ws: Workspace): Promise<Omit<EditorProps, 'id' | 'initial'>> {
  const org = ws.organisation;
  const clients = await clientsForEditor(tx);
  const items = await listItems(tx);
  const codes = await listTaxCodes(tx);
  const nextNumber = await peekNextNumber(tx, 'invoice', org);
  return {
    today: ws.today,
    clients: clients.map(({ row, fields }) => ({
      id: row.id,
      name: row.name,
      currency: row.currency,
      paymentTermsDays: row.paymentTermsDays,
      buyer: buyerFrom(row, fields),
    })),
    items: items.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      unitPrice: i.unitPrice,
      unit: i.unit,
      taxCodeId: i.taxCodeId,
    })),
    taxCodes: codes.map((c) => ({
      id: c.id,
      label: c.label,
      isDefault: c.isDefault,
      code: { label: c.label, treatment: c.treatment, components: c.components } satisfies TaxCode,
    })),
    org: {
      seller: sellerFrom(org),
      locale: org.locale,
      taxLevel: org.taxLevel,
      rounding: org.rounding,
      defaultPaymentTermsDays: org.defaultPaymentTermsDays,
      paymentDetails: org.paymentDetails,
      nextNumber,
    },
    logoUrl: org.logoFileId ? `/files/${org.logoFileId}` : null,
    entitlements: organisationEntitlements(org, new Date()),
  };
}

export function newDraftState(
  ws: Workspace,
  data: Omit<EditorProps, 'id' | 'initial'>,
  clientId: string | null,
): EditorState {
  const org = ws.organisation;
  const client = data.clients.find((c) => c.id === clientId) ?? null;
  const defaultTax = org.taxRegistered ? (data.taxCodes.find((t) => t.isDefault)?.id ?? null) : null;
  return {
    clientId: client?.id ?? '',
    currency: client?.currency ?? org.baseCurrency,
    issueDate: '',
    dueDate: '',
    dueTouched: false,
    supplyMode: 'date',
    supplyDate: '',
    periodStart: '',
    periodEnd: '',
    reference: '',
    title: '',
    summary: '',
    lineStyle: org.taxRegistered ? 'quantity' : 'amount',
    pricesIncludeTax: org.pricesIncludeTax,
    lines: [
      {
        key: key(),
        title: '',
        description: '',
        showDescription: false,
        quantity: '1',
        unit: '',
        unitPrice: '',
        serviceDate: '',
        taxCodeId: defaultTax,
        itemId: null,
      },
    ],
    discounts: [],
    deposits: [],
    notes: org.defaultNotes ?? '',
    terms: org.defaultTerms ?? '',
    template: org.defaultTemplate,
    options: {
      showBank: true,
      showMobileMoney: true,
      showPaymentLink: true,
      showNotes: true,
      showTerms: true,
    },
  };
}

export function draftState(detail: DocumentDetail): EditorState {
  const d = detail.document;
  const cur = d.currency;
  return {
    clientId: d.clientId,
    currency: cur,
    issueDate: d.issueDate ?? '',
    dueDate: d.dueDate ?? '',
    dueTouched: !!d.dueDate,
    supplyMode: d.servicePeriodStart ? 'period' : 'date',
    supplyDate: d.supplyDate ?? '',
    periodStart: d.servicePeriodStart ?? '',
    periodEnd: d.servicePeriodEnd ?? '',
    reference: d.reference ?? '',
    title: d.title ?? '',
    summary: d.summary ?? '',
    lineStyle: d.lineStyle,
    pricesIncludeTax: d.pricesIncludeTax,
    lines: detail.lines.map((l) => ({
      key: key(),
      title: l.title,
      description: l.description ?? '',
      showDescription: !!l.description,
      quantity: quantityToString(l.quantity),
      unit: l.unit ?? '',
      unitPrice: toDecimalString(l.unitPrice, cur),
      serviceDate: l.serviceDate ?? '',
      taxCodeId: l.taxCodeId,
      itemId: l.itemId,
    })),
    discounts: d.discounts.map((x) =>
      x.kind === 'percent'
        ? { key: key(), label: x.label, kind: 'percent' as const, value: String(x.ratePpm / 10_000) }
        : { key: key(), label: x.label, kind: 'amount' as const, value: toDecimalString(x.amount, cur) },
    ),
    deposits: d.prepayments.map((p) => ({
      key: key(),
      label: p.label,
      amount: toDecimalString(p.amount, cur),
      paidOn: p.paidOn,
      method: p.method,
    })),
    notes: d.notes ?? '',
    terms: d.terms ?? '',
    template: d.template,
    options: {
      showBank: d.options.showBank !== false,
      showMobileMoney: d.options.showMobileMoney !== false,
      showPaymentLink: d.options.showPaymentLink !== false,
      showNotes: d.options.showNotes !== false,
      showTerms: d.options.showTerms !== false,
    },
  };
}
