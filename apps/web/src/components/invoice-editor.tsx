'use client';

import { useRouter } from 'next/navigation';
import { useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';
import { ArrowDown, ArrowUp, Eye, PenLine, Plus, Trash2, X } from 'lucide-react';
import {
  addDays,
  assembleSnapshot,
  computeDocument,
  DomainError,
  formatMoney,
  isBusinessDate,
  parseMoney,
  parseQuantity,
  parseRate,
  QUANTITY_SCALE,
  sumMinor,
  toDecimalString,
  type DocumentSnapshot,
  type Entitlements,
  type DocumentTotals,
  type LineStyle,
  type RawPaymentDetails,
  type TaxCode,
  type TaxLevel,
  type RoundingMode,
} from '@invoica/core';
import { renderDocumentHtml, TEMPLATE_LIST } from '@invoica/documents';
import { saveAndIssueAction, saveDraftAction } from '@/lib/actions/documents';
import { requestKey } from '@/lib/request-key';
import { ClientForm } from './client-form';
import { Dialog } from './dialog';
import { DocumentFrame } from './document-frame';
import { Button, Checkbox, Field, FormMessage, Input, Panel, Select, Textarea, cx } from './ui';

export interface EditorClient {
  id: string;
  name: string;
  /** Archived clients can still be invoiced; the picker lists them apart. */
  archived: boolean;
  currency: string | null;
  paymentTermsDays: number | null;
  buyer: DocumentSnapshot['buyer'];
}

export interface EditorItem {
  id: string;
  name: string;
  description: string | null;
  unitPrice: number;
  unit: string | null;
  taxCodeId: string | null;
}

export interface EditorTaxCode {
  id: string;
  label: string;
  isDefault: boolean;
  code: TaxCode;
}

export interface EditorLine {
  key: string;
  title: string;
  description: string;
  showDescription: boolean;
  quantity: string;
  unit: string;
  unitPrice: string;
  serviceDate: string;
  taxCodeId: string | null;
  itemId: string | null;
}

export interface EditorDiscount {
  key: string;
  label: string;
  kind: 'percent' | 'amount';
  value: string;
}

export interface EditorDeposit {
  key: string;
  label: string;
  amount: string;
  paidOn: string;
  method: 'bank_transfer' | 'card' | 'cash' | 'mobile_money' | 'cheque' | 'other';
}

export interface EditorState {
  clientId: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  dueTouched: boolean;
  supplyMode: 'date' | 'period';
  supplyDate: string;
  periodStart: string;
  periodEnd: string;
  reference: string;
  title: string;
  summary: string;
  lineStyle: LineStyle;
  pricesIncludeTax: boolean;
  lines: EditorLine[];
  discounts: EditorDiscount[];
  deposits: EditorDeposit[];
  notes: string;
  terms: string;
  template: string;
  options: {
    showBank: boolean;
    showMobileMoney: boolean;
    showPaymentLink: boolean;
    showNotes: boolean;
    showTerms: boolean;
  };
}

export interface EditorProps {
  id: string | null;
  initial: EditorState;
  today: string;
  clients: EditorClient[];
  items: EditorItem[];
  taxCodes: EditorTaxCode[];
  org: {
    seller: DocumentSnapshot['seller'];
    locale: string;
    taxLevel: TaxLevel;
    rounding: RoundingMode;
    defaultPaymentTermsDays: number;
    paymentDetails: RawPaymentDetails;
    nextNumber: string;
  };
  logoUrl: string | null;
  /** What the organisation's plan allows, so the preview looks as the issued invoice will. */
  entitlements: Entitlements;
}

let keyCounter = 0;
export const newKey = () => `k${Date.now().toString(36)}${(keyCounter++).toString(36)}`;

const STYLES: { value: LineStyle; label: string; hint: string }[] = [
  {
    value: 'amount',
    label: 'Amount only',
    hint: 'A description and a price. For fixed fees and project phases.',
  },
  { value: 'quantity', label: 'Quantity × price', hint: 'For products, licences, days or anything counted.' },
  { value: 'hours', label: 'Hours × rate', hint: 'For time billed by the hour.' },
  { value: 'dated', label: 'Dated entries', hint: 'A date on each line, for time logs and day rates.' },
];

const METHODS: { value: EditorDeposit['method']; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

interface Parsed {
  input: Record<string, unknown>;
  lineErrors: Record<string, string>;
  totals: DocumentTotals | null;
  totalsError: string | null;
  lines: {
    title: string;
    description: string | null;
    quantity: number;
    unit: string | null;
    unitPrice: number;
    serviceDate: string | null;
    tax: TaxCode | null;
  }[];
}

/** Turns what is typed into the draft the server validates, and works out every figure with the core. */
function parse(state: EditorState, taxCodes: EditorTaxCode[], org: EditorProps['org']): Parsed {
  const lineErrors: Record<string, string> = {};
  const codes = new Map(taxCodes.map((t) => [t.id, t.code]));
  const lines: Parsed['lines'] = [];
  const inputLines: unknown[] = [];
  for (const l of state.lines) {
    const blank = !l.title.trim() && !l.unitPrice.trim();
    if (blank) continue;
    const quantity = state.lineStyle === 'amount' ? QUANTITY_SCALE : parseQuantity(l.quantity);
    const unitPrice = parseMoney(l.unitPrice, state.currency);
    if (!l.title.trim()) lineErrors[l.key] = 'Describe this line.';
    else if (quantity === null || quantity <= 0)
      lineErrors[l.key] =
        `Enter the ${state.lineStyle === 'hours' ? 'hours' : 'quantity'}, up to three decimals.`;
    else if (unitPrice === null || unitPrice < 0)
      lineErrors[l.key] = 'Enter a price, for example 450 or 450.00.';
    else if (state.lineStyle === 'dated' && l.serviceDate && !isBusinessDate(l.serviceDate))
      lineErrors[l.key] = 'Enter a real date.';
    const tax = l.taxCodeId ? (codes.get(l.taxCodeId) ?? null) : null;
    if (!lineErrors[l.key] && !org.seller.taxRegistered && tax && tax.components.length > 0)
      lineErrors[l.key] = 'You are not registered for tax, so this line cannot show a tax rate.';
    if (lineErrors[l.key]) continue;
    lines.push({
      title: l.title.trim(),
      description: l.description.trim() || null,
      quantity: quantity!,
      unit: l.unit.trim() || null,
      unitPrice: unitPrice!,
      serviceDate: state.lineStyle === 'dated' && l.serviceDate ? l.serviceDate : null,
      tax,
    });
    inputLines.push({
      title: l.title,
      description: l.description,
      quantity,
      unit: l.unit,
      unitPrice,
      serviceDate: state.lineStyle === 'dated' ? l.serviceDate : null,
      taxCodeId: l.taxCodeId,
      itemId: l.itemId,
    });
  }
  const discounts = state.discounts
    .filter((d) => d.value.trim())
    .map((d) =>
      d.kind === 'percent'
        ? { label: d.label || 'Discount', kind: 'percent' as const, ratePpm: parseRate(d.value) ?? -1 }
        : {
            label: d.label || 'Discount',
            kind: 'amount' as const,
            amount: parseMoney(d.value, state.currency) ?? -1,
          },
    );
  const deposits = state.deposits
    .filter((d) => d.amount.trim())
    .map((d) => ({
      label: d.label || 'Deposit received',
      amount: parseMoney(d.amount, state.currency) ?? -1,
      paidOn: d.paidOn,
      method: d.method,
    }));

  let totals: DocumentTotals | null = null;
  let totalsError: string | null = null;
  try {
    if (discounts.some((d) => (d.kind === 'percent' ? d.ratePpm < 0 : d.amount < 0)))
      throw new DomainError('discount', 'Check the discount: a percentage up to 100, or an amount.');
    if (deposits.some((d) => d.amount <= 0))
      throw new DomainError('deposit', 'Check the payment received: enter an amount above zero.');
    totals = computeDocument({
      currency: state.currency,
      pricesIncludeTax: state.pricesIncludeTax,
      taxLevel: org.taxLevel,
      rounding: org.rounding,
      lines,
      discounts,
      paid: sumMinor(deposits.map((d) => d.amount)),
    });
    if (totals.balance < 0) totalsError = 'Payments already received are more than the total.';
  } catch (error) {
    totalsError = error instanceof DomainError ? error.message : 'These figures cannot be worked out yet.';
  }

  const input = {
    clientId: state.clientId,
    currency: state.currency,
    issueDate: state.issueDate || null,
    dueDate: state.dueDate || null,
    supplyDate: state.supplyMode === 'date' ? state.supplyDate || null : null,
    servicePeriodStart: state.supplyMode === 'period' ? state.periodStart || null : null,
    servicePeriodEnd: state.supplyMode === 'period' ? state.periodEnd || null : null,
    reference: state.reference,
    title: state.title,
    summary: state.summary,
    lineStyle: state.lineStyle,
    pricesIncludeTax: state.pricesIncludeTax,
    discounts,
    prepayments: deposits,
    notes: state.notes,
    terms: state.terms,
    template: state.template,
    options: state.options,
    lines: inputLines,
  };
  return { input, lineErrors, totals, totalsError, lines };
}

export function InvoiceEditor(props: EditorProps) {
  const { org, taxCodes, items, today } = props;
  const router = useRouter();
  const [state, setState] = useState<EditorState>(props.initial);
  const [clients, setClients] = useState(props.clients);
  const [docId, setDocId] = useState(props.id);
  // Sent with the first save of a new invoice, so a repeat of that save finds the same draft.
  const [createKey] = useState(() => requestKey());
  const [dirty, setDirty] = useState(false);
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');
  const [addingClient, setAddingClient] = useState(false);
  const [confirmIssue, setConfirmIssue] = useState(false);
  const [message, setMessage] = useState<{ tone: 'danger' | 'info'; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  // The line open for editing on phones.
  const [openLine, setOpenLine] = useState<string | null>(null);
  const update = (patch: Partial<EditorState>) => {
    setState((s) => ({ ...s, ...patch }));
    setDirty(true);
  };
  const updateLine = (key: string, patch: Partial<EditorLine>) => {
    // The line being typed in stays open on phones.
    setOpenLine(key);
    update({ lines: state.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) });
  };

  const client = clients.find((c) => c.id === state.clientId) ?? null;
  const defaultTax = taxCodes.find((t) => t.isDefault)?.id ?? null;
  const registered = org.seller.taxRegistered;

  // Due date follows the client's or the business's terms until it is changed by hand.
  useEffect(() => {
    if (state.dueTouched) return;
    const terms = client?.paymentTermsDays ?? org.defaultPaymentTermsDays;
    const next = addDays(state.issueDate && isBusinessDate(state.issueDate) ? state.issueDate : today, terms);
    if (next !== state.dueDate) setState((s) => ({ ...s, dueDate: next }));
  }, [
    client?.paymentTermsDays,
    org.defaultPaymentTermsDays,
    state.issueDate,
    state.dueTouched,
    state.dueDate,
    today,
  ]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const parsed = useMemo(() => parse(state, taxCodes, org), [state, taxCodes, org]);
  const deferred = useDeferredValue(parsed);

  const previewHtml = useMemo(() => {
    const totals =
      deferred.totals ??
      computeDocument({
        currency: state.currency,
        pricesIncludeTax: false,
        taxLevel: org.taxLevel,
        rounding: org.rounding,
        lines: [],
      });
    const inputLines = deferred.totals ? deferred.lines : [];
    const snap = assembleSnapshot({
      kind: 'invoice',
      number: org.nextNumber,
      issueDate: state.issueDate && isBusinessDate(state.issueDate) ? state.issueDate : today,
      dueDate: state.dueDate && isBusinessDate(state.dueDate) ? state.dueDate : null,
      supplyDate:
        state.supplyMode === 'date'
          ? state.supplyDate && isBusinessDate(state.supplyDate)
            ? state.supplyDate
            : state.issueDate || today
          : null,
      servicePeriodStart:
        state.supplyMode === 'period' && isBusinessDate(state.periodStart) ? state.periodStart : null,
      servicePeriodEnd:
        state.supplyMode === 'period' && isBusinessDate(state.periodEnd) ? state.periodEnd : null,
      reference: state.reference || null,
      title: state.title || null,
      summary: state.summary || null,
      currency: state.currency,
      locale: org.locale,
      lineStyle: state.lineStyle,
      pricesIncludeTax: state.pricesIncludeTax,
      taxLevel: org.taxLevel,
      rounding: org.rounding,
      seller: org.seller,
      buyer: client?.buyer ?? {
        name: 'Your client',
        contactName: null,
        email: null,
        address: { line1: null, line2: null, city: null, region: null, postcode: null, countryCode: null },
        taxNumber: null,
        fields: [],
      },
      lines: inputLines,
      totals,
      prepayments: (
        (deferred.input as { prepayments: { label: string; amount: number; paidOn: string }[] })
          .prepayments ?? []
      ).filter((p) => p.amount > 0 && isBusinessDate(p.paidOn)),
      notes: state.notes || null,
      terms: state.terms || null,
      template: state.template,
      options: state.options,
      paymentDetails: org.paymentDetails,
      credits: null,
      entitlements: props.entitlements,
    });
    return renderDocumentHtml(snap, {
      fontUrl: (f) => `/doc-fonts/${f}`,
      logoUrl: props.entitlements.ownBrand ? props.logoUrl : null,
      draft: true,
    });
  }, [deferred, state, org, client, today, props.logoUrl, props.entitlements]);

  function addLine(from?: EditorItem) {
    const key = newKey();
    setOpenLine(key);
    update({
      lines: [
        ...state.lines,
        {
          key,
          title: from?.name ?? '',
          description: from?.description ?? '',
          showDescription: !!from?.description,
          quantity: '1',
          unit: from?.unit ?? '',
          unitPrice: from ? toDecimalString(from.unitPrice, state.currency) : '',
          serviceDate: state.lineStyle === 'dated' ? today : '',
          taxCodeId: registered ? (from?.taxCodeId ?? defaultTax) : null,
          itemId: from?.id ?? null,
        },
      ],
    });
  }

  function moveLine(index: number, by: number) {
    const lines = [...state.lines];
    const [moved] = lines.splice(index, 1);
    lines.splice(index + by, 0, moved!);
    update({ lines });
  }

  function chooseClient(id: string) {
    if (id === '__new') {
      setAddingClient(true);
      return;
    }
    const c = clients.find((x) => x.id === id);
    update({ clientId: id, currency: c?.currency ?? state.currency });
  }

  function save(issue: boolean) {
    setMessage(null);
    if (Object.keys(parsed.lineErrors).length) {
      setMessage({ tone: 'danger', text: 'Some lines need attention before saving.' });
      return;
    }
    if (parsed.totalsError) {
      setMessage({ tone: 'danger', text: parsed.totalsError });
      return;
    }
    start(async () => {
      const input = docId ? parsed.input : { ...parsed.input, idempotencyKey: createKey };
      const result = issue ? await saveAndIssueAction(docId, input) : await saveDraftAction(docId, input);
      setConfirmIssue(false);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage({ tone: 'danger', text: result.message });
        return;
      }
      setDirty(false);
      setErrors({});
      if (issue) {
        router.push(`/invoices/${result.data.id}?issued=1`);
        router.refresh();
        return;
      }
      setMessage({ tone: 'info', text: 'Draft saved.' });
      if (!docId) {
        setDocId(result.data.id);
        router.replace(`/invoices/${result.data.id}/edit`);
      }
      router.refresh();
    });
  }

  const totals = parsed.totals;
  const money = (n: number) => formatMoney(n, state.currency);
  const qtyLabel = state.lineStyle === 'hours' ? 'Hours' : 'Qty';
  const priceLabel = state.lineStyle === 'hours' || state.lineStyle === 'dated' ? 'Rate' : 'Price';

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex rounded-[10px] border border-line bg-surface p-1 lg:hidden"
        role="tablist"
        aria-label="Editor view"
      >
        {(['edit', 'preview'] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={mobileView === v}
            type="button"
            onClick={() => setMobileView(v)}
            className={cx(
              'flex h-9 flex-1 items-center justify-center gap-2 rounded-[8px] text-sm font-medium',
              mobileView === v ? 'bg-ink text-surface' : 'text-muted',
            )}
          >
            {v === 'edit' ? (
              <PenLine className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
            {v === 'edit' ? 'Edit' : 'Preview'}
          </button>
        ))}
      </div>

      {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,620px)_minmax(0,1fr)]">
        <div className={cx('flex flex-col gap-5', mobileView === 'preview' && 'hidden lg:flex')}>
          <Panel className="p-5">
            <h2 className="mb-4 text-[15px] font-semibold">Client</h2>
            {clients.length === 0 && !addingClient ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-muted">
                  Add the client this invoice is for. You only do this once per client.
                </p>
                <Button type="button" variant="secondary" onClick={() => setAddingClient(true)}>
                  <Plus className="size-4" aria-hidden /> Add a client
                </Button>
              </div>
            ) : addingClient ? (
              <div className="flex flex-col gap-3">
                <ClientForm
                  id={null}
                  compact
                  defaultCountry={org.seller.address.countryCode ?? 'GB'}
                  onSaved={(id, name) => {
                    const added: EditorClient = {
                      id,
                      name,
                      archived: false,
                      currency: null,
                      paymentTermsDays: null,
                      buyer: {
                        name,
                        contactName: null,
                        email: null,
                        address: {
                          line1: null,
                          line2: null,
                          city: null,
                          region: null,
                          postcode: null,
                          countryCode: null,
                        },
                        taxNumber: null,
                        fields: [],
                      },
                    };
                    setClients([...clients, added].sort((a, b) => a.name.localeCompare(b.name)));
                    update({ clientId: id });
                    setAddingClient(false);
                    router.refresh();
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="self-start"
                  onClick={() => setAddingClient(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
                <Field label="Bill to" htmlFor="e-client" error={errors.clientId}>
                  <Select
                    id="e-client"
                    value={state.clientId}
                    onChange={(e) => chooseClient(e.target.value)}
                    aria-invalid={!!errors.clientId}
                  >
                    <option value="">Choose a client</option>
                    {clients
                      .filter((c) => !c.archived)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    {clients.some((c) => c.archived) ? (
                      <optgroup label="Archived clients">
                        {clients
                          .filter((c) => c.archived)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </optgroup>
                    ) : null}
                    <option value="__new">Add a new client</option>
                  </Select>
                </Field>
                <Field label="Currency" htmlFor="e-currency">
                  <Input id="e-currency" value={state.currency} readOnly aria-readonly className="bg-sunk" />
                </Field>
              </div>
            )}
          </Panel>

          <Panel className="p-5">
            <h2 className="mb-4 text-[15px] font-semibold">Dates and reference</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Issue date"
                htmlFor="e-issue"
                hint="Leave blank to use the day you issue it."
                error={errors.issueDate}
              >
                <Input
                  id="e-issue"
                  type="date"
                  value={state.issueDate}
                  onChange={(e) => update({ issueDate: e.target.value })}
                />
              </Field>
              <Field
                label="Due date"
                htmlFor="e-due"
                error={errors.dueDate}
                hint={state.dueTouched ? undefined : 'Set from the payment terms.'}
              >
                <Input
                  id="e-due"
                  type="date"
                  value={state.dueDate}
                  onChange={(e) => update({ dueDate: e.target.value, dueTouched: true })}
                />
              </Field>
              <Field label="Work was done" htmlFor="e-supplymode">
                <Select
                  id="e-supplymode"
                  value={state.supplyMode}
                  onChange={(e) => update({ supplyMode: e.target.value as 'date' | 'period' })}
                >
                  <option value="date">On a date</option>
                  <option value="period">Over a period</option>
                </Select>
              </Field>
              {state.supplyMode === 'date' ? (
                <Field label="Date of the work" htmlFor="e-supply" hint="Blank uses the issue date.">
                  <Input
                    id="e-supply"
                    type="date"
                    value={state.supplyDate}
                    onChange={(e) => update({ supplyDate: e.target.value })}
                  />
                </Field>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="From" htmlFor="e-ps">
                    <Input
                      id="e-ps"
                      type="date"
                      value={state.periodStart}
                      onChange={(e) => update({ periodStart: e.target.value })}
                    />
                  </Field>
                  <Field label="To" htmlFor="e-pe" error={errors.servicePeriodEnd}>
                    <Input
                      id="e-pe"
                      type="date"
                      value={state.periodEnd}
                      onChange={(e) => update({ periodEnd: e.target.value })}
                    />
                  </Field>
                </div>
              )}
              <Field
                label="Their reference"
                htmlFor="e-ref"
                hint="A purchase order number, if they gave you one."
                className="sm:col-span-2"
              >
                <Input
                  id="e-ref"
                  value={state.reference}
                  onChange={(e) => update({ reference: e.target.value })}
                />
              </Field>
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="mb-1 text-[15px] font-semibold">What it is for</h2>
            <p className="mb-4 text-[13px] text-muted">
              Optional. A title and a few words about the project read well at the top of an invoice.
            </p>
            <div className="grid gap-4">
              <Field label="Title" htmlFor="e-title">
                <Input
                  id="e-title"
                  value={state.title}
                  onChange={(e) => update({ title: e.target.value })}
                  placeholder="Website for the spring collection"
                />
              </Field>
              <Field label="Summary" htmlFor="e-summary">
                <Textarea
                  id="e-summary"
                  value={state.summary}
                  onChange={(e) => update({ summary: e.target.value })}
                  className="min-h-16"
                />
              </Field>
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-[15px] font-semibold">Lines</h2>
              <Select
                aria-label="How lines are shown"
                value={state.lineStyle}
                onChange={(e) => update({ lineStyle: e.target.value as LineStyle })}
                className="h-9 sm:w-52"
              >
                {STYLES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <p className="-mt-2 mb-4 text-[13px] text-muted">
              {STYLES.find((s) => s.value === state.lineStyle)?.hint}
              {registered && org.seller.address.countryCode === 'GB' && state.lineStyle === 'amount'
                ? ' As you are VAT registered, the invoice still shows a quantity of 1, the price and the VAT rate on each line.'
                : ''}
            </p>
            <ol className="flex flex-col gap-3">
              {state.lines.map((l, index) => {
                const amount = (() => {
                  const q = state.lineStyle === 'amount' ? QUANTITY_SCALE : parseQuantity(l.quantity);
                  const p = parseMoney(l.unitPrice, state.currency);
                  if (q === null || p === null || q <= 0) return null;
                  try {
                    return computeDocument({
                      currency: state.currency,
                      pricesIncludeTax: false,
                      taxLevel: 'line',
                      rounding: org.rounding,
                      lines: [{ quantity: q, unitPrice: p, tax: null }],
                    }).subtotal;
                  } catch {
                    return null;
                  }
                })();
                const error = parsed.lineErrors[l.key];
                // On phones a finished line folds to one row; the line being edited, a blank one and one with an
                // error stay open. Wider screens always show every line in full.
                const expanded = l.key === openLine || !!error || (!l.title.trim() && !l.unitPrice.trim());
                const taxLabel = l.taxCodeId ? taxCodes.find((t) => t.id === l.taxCodeId)?.label : null;
                return (
                  <li
                    key={l.key}
                    className={cx(
                      'rounded-[12px] border bg-surface',
                      expanded ? 'p-3' : 'sm:p-3',
                      error ? 'border-danger' : 'border-line',
                    )}
                  >
                    {!expanded ? (
                      <button
                        type="button"
                        onClick={() => setOpenLine(l.key)}
                        className="flex min-h-14 w-full items-center justify-between gap-3 px-3 py-2.5 text-left sm:hidden"
                      >
                        <span className="min-w-0">
                          <span className="sr-only">Edit line {index + 1}: </span>
                          <span className="block truncate font-medium">{l.title}</span>
                          {(() => {
                            const detail =
                              state.lineStyle === 'amount'
                                ? [l.description.split('\n')[0], taxLabel].filter(Boolean).join(', ')
                                : `${l.quantity}${l.unit ? ` ${l.unit}` : ''} × ${l.unitPrice ? money(parseMoney(l.unitPrice, state.currency) ?? 0) : ''}${taxLabel ? `, ${taxLabel}` : ''}`;
                            return detail ? (
                              <span className="block truncate text-[13px] text-muted">{detail}</span>
                            ) : null;
                          })()}
                        </span>
                        <span className="shrink-0 font-medium tabular">
                          {amount === null ? '' : money(amount)}
                        </span>
                      </button>
                    ) : null}
                    <div className={expanded ? '' : 'hidden sm:block'}>
                      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                        <div className="grid gap-3">
                          {state.lineStyle === 'dated' ? (
                            <Input
                              type="date"
                              aria-label={`Line ${index + 1} date`}
                              value={l.serviceDate}
                              onChange={(e) => updateLine(l.key, { serviceDate: e.target.value })}
                              className="sm:w-44"
                            />
                          ) : null}
                          <Input
                            aria-label={`Line ${index + 1} description`}
                            placeholder="What you are charging for"
                            value={l.title}
                            onChange={(e) => updateLine(l.key, { title: e.target.value })}
                          />
                          {l.showDescription ? (
                            <Textarea
                              aria-label={`Line ${index + 1} detail`}
                              placeholder="More detail, shown under the line"
                              value={l.description}
                              onChange={(e) => updateLine(l.key, { description: e.target.value })}
                              className="min-h-14"
                            />
                          ) : (
                            <button
                              type="button"
                              className="min-h-11 justify-self-start text-[13px] text-brand hover:underline sm:min-h-0"
                              onClick={() => updateLine(l.key, { showDescription: true })}
                            >
                              Add detail
                            </button>
                          )}
                        </div>
                        <div className="flex items-start gap-1 sm:flex-col">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-11 min-w-11 sm:h-8 sm:min-w-0"
                            aria-label={`Move line ${index + 1} up`}
                            disabled={index === 0}
                            onClick={() => moveLine(index, -1)}
                          >
                            <ArrowUp className="size-4" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-11 min-w-11 sm:h-8 sm:min-w-0"
                            aria-label={`Move line ${index + 1} down`}
                            disabled={index === state.lines.length - 1}
                            onClick={() => moveLine(index, 1)}
                          >
                            <ArrowDown className="size-4" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-11 min-w-11 sm:h-8 sm:min-w-0"
                            aria-label={`Remove line ${index + 1}`}
                            onClick={() => update({ lines: state.lines.filter((x) => x.key !== l.key) })}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {state.lineStyle !== 'amount' ? (
                          <Input
                            aria-label={`Line ${index + 1} ${qtyLabel.toLowerCase()}`}
                            inputMode="decimal"
                            value={l.quantity}
                            onChange={(e) => updateLine(l.key, { quantity: e.target.value })}
                            placeholder={qtyLabel}
                            className="w-16 text-right tabular"
                          />
                        ) : null}
                        {state.lineStyle === 'quantity' ? (
                          <Input
                            aria-label={`Line ${index + 1} unit`}
                            value={l.unit}
                            onChange={(e) => updateLine(l.key, { unit: e.target.value })}
                            placeholder="Unit"
                            className="w-16"
                          />
                        ) : null}
                        {state.lineStyle !== 'amount' ? (
                          <span aria-hidden className="text-muted">
                            ×
                          </span>
                        ) : null}
                        <Input
                          aria-label={`Line ${index + 1} ${priceLabel.toLowerCase()}`}
                          inputMode="decimal"
                          value={l.unitPrice}
                          onChange={(e) => updateLine(l.key, { unitPrice: e.target.value })}
                          placeholder={state.lineStyle === 'amount' ? 'Amount' : priceLabel}
                          className="w-28 text-right tabular"
                        />
                        {registered || l.taxCodeId ? (
                          <Select
                            aria-label={`Line ${index + 1} tax`}
                            value={l.taxCodeId ?? ''}
                            onChange={(e) => updateLine(l.key, { taxCodeId: e.target.value || null })}
                            className="w-auto max-w-40"
                          >
                            <option value="">No tax</option>
                            {taxCodes
                              .filter(
                                (t) => registered || t.code.components.length === 0 || t.id === l.taxCodeId,
                              )
                              .map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.label}
                                </option>
                              ))}
                          </Select>
                        ) : null}
                        <output
                          className="ml-auto min-w-24 text-right font-medium tabular"
                          aria-label={`Line ${index + 1} amount`}
                        >
                          {amount === null ? '' : money(amount)}
                        </output>
                      </div>
                      {error ? <p className="mt-2 text-[13px] text-danger">{error}</p> : null}
                      {l.key === openLine && !error && l.title.trim() ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-11 sm:hidden"
                          onClick={() => setOpenLine(null)}
                        >
                          Done with this line
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => addLine()}>
                <Plus className="size-4" aria-hidden /> Add a line
              </Button>
              {items.length ? (
                <Select
                  aria-label="Add a saved item"
                  value=""
                  onChange={(e) => {
                    const it = items.find((i) => i.id === e.target.value);
                    if (it) addLine(it);
                  }}
                  className="h-8 w-auto text-[13px]"
                >
                  <option value="">Add a saved item</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </Select>
              ) : null}
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="mb-4 text-[15px] font-semibold">Discounts and money already received</h2>
            <div className="flex flex-col gap-3">
              {state.discounts.map((d) => (
                <div key={d.key} className="grid grid-cols-[1fr_7rem_6rem_auto] items-end gap-2">
                  <Field label="Discount" htmlFor={`d-l-${d.key}`}>
                    <Input
                      id={`d-l-${d.key}`}
                      value={d.label}
                      placeholder="Returning client"
                      onChange={(e) =>
                        update({
                          discounts: state.discounts.map((x) =>
                            x.key === d.key ? { ...x, label: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </Field>
                  <Field label="Kind" htmlFor={`d-k-${d.key}`}>
                    <Select
                      id={`d-k-${d.key}`}
                      value={d.kind}
                      onChange={(e) =>
                        update({
                          discounts: state.discounts.map((x) =>
                            x.key === d.key ? { ...x, kind: e.target.value as 'percent' | 'amount' } : x,
                          ),
                        })
                      }
                    >
                      <option value="percent">Percent</option>
                      <option value="amount">Amount</option>
                    </Select>
                  </Field>
                  <Field label={d.kind === 'percent' ? '%' : state.currency} htmlFor={`d-v-${d.key}`}>
                    <Input
                      id={`d-v-${d.key}`}
                      inputMode="decimal"
                      value={d.value}
                      onChange={(e) =>
                        update({
                          discounts: state.discounts.map((x) =>
                            x.key === d.key ? { ...x, value: e.target.value } : x,
                          ),
                        })
                      }
                      className="text-right tabular"
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label="Remove discount"
                    onClick={() => update({ discounts: state.discounts.filter((x) => x.key !== d.key) })}
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                </div>
              ))}
              {state.deposits.map((d) => (
                <div
                  key={d.key}
                  className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_6.5rem_9.5rem_8rem_auto]"
                >
                  <Field label="Received" htmlFor={`p-l-${d.key}`} className="col-span-2 sm:col-span-1">
                    <Input
                      id={`p-l-${d.key}`}
                      value={d.label}
                      placeholder="Deposit"
                      onChange={(e) =>
                        update({
                          deposits: state.deposits.map((x) =>
                            x.key === d.key ? { ...x, label: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </Field>
                  <Field label={state.currency} htmlFor={`p-a-${d.key}`}>
                    <Input
                      id={`p-a-${d.key}`}
                      inputMode="decimal"
                      value={d.amount}
                      onChange={(e) =>
                        update({
                          deposits: state.deposits.map((x) =>
                            x.key === d.key ? { ...x, amount: e.target.value } : x,
                          ),
                        })
                      }
                      className="text-right tabular"
                    />
                  </Field>
                  <Field label="On" htmlFor={`p-d-${d.key}`}>
                    <Input
                      id={`p-d-${d.key}`}
                      type="date"
                      value={d.paidOn}
                      onChange={(e) =>
                        update({
                          deposits: state.deposits.map((x) =>
                            x.key === d.key ? { ...x, paidOn: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </Field>
                  <Field label="By" htmlFor={`p-m-${d.key}`}>
                    <Select
                      id={`p-m-${d.key}`}
                      value={d.method}
                      onChange={(e) =>
                        update({
                          deposits: state.deposits.map((x) =>
                            x.key === d.key ? { ...x, method: e.target.value as EditorDeposit['method'] } : x,
                          ),
                        })
                      }
                    >
                      {METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label="Remove payment"
                    onClick={() => update({ deposits: state.deposits.filter((x) => x.key !== d.key) })}
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    update({
                      discounts: [
                        ...state.discounts,
                        { key: newKey(), label: '', kind: 'percent', value: '' },
                      ],
                    })
                  }
                >
                  <Plus className="size-4" aria-hidden /> Add a discount
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    update({
                      deposits: [
                        ...state.deposits,
                        {
                          key: newKey(),
                          label: 'Deposit received',
                          amount: '',
                          paidOn: today,
                          method: 'bank_transfer',
                        },
                      ],
                    })
                  }
                >
                  <Plus className="size-4" aria-hidden /> Add a deposit received
                </Button>
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="mb-4 text-[15px] font-semibold">Notes, terms and look</h2>
            <div className="grid gap-4">
              <Field label="Note to the client" htmlFor="e-notes">
                <Textarea
                  id="e-notes"
                  value={state.notes}
                  onChange={(e) => update({ notes: e.target.value })}
                  className="min-h-16"
                />
              </Field>
              <Field label="Terms" htmlFor="e-terms">
                <Textarea
                  id="e-terms"
                  value={state.terms}
                  onChange={(e) => update({ terms: e.target.value })}
                  className="min-h-16"
                />
              </Field>
              <Field label="Template" htmlFor="e-template">
                <Select
                  id="e-template"
                  value={state.template}
                  onChange={(e) => update({ template: e.target.value })}
                >
                  {TEMPLATE_LIST.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}: {t.description}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Checkbox
                  label="Show bank details"
                  checked={state.options.showBank}
                  onChange={(e) => update({ options: { ...state.options, showBank: e.target.checked } })}
                />
                <Checkbox
                  label="Show mobile money"
                  checked={state.options.showMobileMoney}
                  onChange={(e) =>
                    update({ options: { ...state.options, showMobileMoney: e.target.checked } })
                  }
                />
                <Checkbox
                  label="Show payment link"
                  checked={state.options.showPaymentLink}
                  onChange={(e) =>
                    update({ options: { ...state.options, showPaymentLink: e.target.checked } })
                  }
                />
                {registered ? (
                  <Checkbox
                    label="Prices include tax"
                    checked={state.pricesIncludeTax}
                    onChange={(e) => update({ pricesIncludeTax: e.target.checked })}
                  />
                ) : null}
              </div>
            </div>
          </Panel>
        </div>

        <aside
          className={cx('flex flex-col gap-4 lg:sticky lg:top-24', mobileView === 'edit' && 'hidden lg:flex')}
          aria-label="Preview"
        >
          <DocumentFrame html={previewHtml} />
        </aside>
      </div>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 border-t border-line bg-surface px-4 py-3 sm:-mx-6 sm:px-6 md:bottom-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13px] text-muted">{totals && totals.paid > 0 ? 'Balance due' : 'Total'}</p>
            <p className="font-display text-xl font-semibold tabular">
              {totals ? money(totals.balance) : money(0)}
            </p>
            {parsed.totalsError ? <p className="text-[13px] text-danger">{parsed.totalsError}</p> : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" disabled={pending} onClick={() => save(false)}>
              {pending ? 'Saving' : 'Save draft'}
            </Button>
            <Button type="button" disabled={pending || !state.clientId} onClick={() => setConfirmIssue(true)}>
              Issue invoice
            </Button>
          </div>
        </div>
      </div>

      {confirmIssue ? (
        <Dialog title={`Issue ${org.nextNumber}?`} onClose={() => setConfirmIssue(false)}>
          <p className="text-muted">
            Issuing gives it this number and freezes it, so it can be sent and kept. To correct it afterwards,
            you issue a credit note.
          </p>
          {totals ? (
            <p className="mt-4 font-display text-2xl font-semibold tabular">
              {money(totals.total)}
              {client ? <span className="block text-sm font-normal text-muted">to {client.name}</span> : null}
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setConfirmIssue(false)}>
              Keep editing
            </Button>
            <Button type="button" disabled={pending} onClick={() => save(true)} autoFocus>
              {pending ? 'Issuing' : 'Issue invoice'}
            </Button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
