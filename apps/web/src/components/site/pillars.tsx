import type { CSSProperties, ReactNode } from 'react';
import s from './site.module.css';

/** One invoice, as three businesses would send it, each in its own colour. White reads at 4.5:1 or more on each. */
const BRANDS = ['#c2410c', '#5b2a4e', '#17795a'];

/**
 * What the example studio invoiced in the last three months. What is not due yet and what is overdue are the
 * dashboard's own; the total is not the dashboard's £6,420.00, so the picture does not repeat the one just above it.
 */
const OWED = {
  total: '£21,560.00',
  parts: [
    { name: 'Paid', amount: '£15,140', full: '£15,140.00', share: 70.2, tone: 'paid' },
    { name: 'Not due yet', amount: '£4,180', full: '£4,180.00', share: 19.4, tone: 'due' },
    { name: 'Overdue', amount: '£2,240', full: '£2,240.00', share: 10.4, tone: 'late' },
  ],
} as const;

/** Three of the studio's clients, as the clients section further down lists them. */
const CLIENTS = [
  { initials: 'MA', name: 'Meridian Architects LLP', owes: '£2,280.00', note: 'Due 3 Nov', tone: 'due' },
  { initials: 'OD', name: 'Oakridge Dental', owes: '£1,440.00', note: '12 days late', tone: 'late' },
  { initials: 'AP', name: 'Ashby Print Co', owes: 'Paid up', note: 'Last paid 18 Oct', tone: 'paid' },
] as const;

function Invoices() {
  return (
    <figure
      className={`${s.filedPiece} ${s.filedInvoices}`}
      role="img"
      aria-label="One invoice, INV-0047, made out in three businesses’ colours: orange, plum and green."
    >
      {BRANDS.map((brand) => (
        <div
          key={brand}
          className={s.miniInvoice}
          style={{ '--brand': brand } as CSSProperties}
          aria-hidden="true"
        >
          <div className={s.miniHead}>
            <span className={s.miniLogo} />
            <span className={s.miniName} />
            <span className={s.miniNumber}>INV-0047</span>
          </div>
          <div className={s.miniLines}>
            <span />
            <span />
            <span />
          </div>
        </div>
      ))}
    </figure>
  );
}

function Owed() {
  const label = `Invoiced in the last three months, ${OWED.total}: ${OWED.parts
    .map((p) => `${p.full} ${p.name.toLowerCase()}`)
    .join(', ')}.`;
  return (
    <figure className={`${s.filedPiece} ${s.invoiced}`} role="img" aria-label={label}>
      <div className={s.invoicedHead} aria-hidden="true">
        <span className={`${s.display} ${s.invoicedTotal}`}>{OWED.total}</span>
        <span className={s.invoicedWhat}>invoiced in the last three months</span>
      </div>
      <div className={s.invoicedBar} aria-hidden="true">
        {OWED.parts.map((p) => (
          <span key={p.name} data-tone={p.tone} style={{ width: `${p.share}%` }} />
        ))}
      </div>
      <div className={s.invoicedKey} aria-hidden="true">
        {OWED.parts.map((p) => (
          <span key={p.name} data-tone={p.tone}>
            {p.name} <b>{p.amount}</b>
          </span>
        ))}
      </div>
    </figure>
  );
}

function Clients() {
  const label = `Three clients and what each owes: ${CLIENTS.map((c) => `${c.name}, ${c.owes}, ${c.note.toLowerCase()}`).join('; ')}.`;
  return (
    <figure className={`${s.filedPiece} ${s.filedClients}`} role="img" aria-label={label}>
      {CLIENTS.map((c) => (
        <div key={c.name} className={s.filedClient} aria-hidden="true">
          <span className={`${s.display} ${s.filedInitials}`}>{c.initials}</span>
          <span className={s.filedName}>{c.name}</span>
          <span className={s.filedOwes}>
            {c.owes}
            <span data-tone={c.tone}>{c.note}</span>
          </span>
        </div>
      ))}
    </figure>
  );
}

const FOLDERS: { label: string; heading: [string, string]; body: string; piece: ReactNode }[] = [
  {
    label: 'Your identity',
    heading: ['Your brand,', 'on every invoice.'],
    body: 'Add your logo and colour once, then choose the layout that suits your work. Every invoice and reminder your clients receive looks as considered as the work behind it.',
    piece: <Invoices />,
  },
  {
    label: 'Financial clarity',
    heading: ['Know where', 'your money is.'],
    body: 'Your dashboard shows what you are owed, what is late and what has come in, worked out from your records the moment anything changes. No spreadsheet, no guessing.',
    piece: <Owed />,
  },
  {
    label: 'Client management',
    heading: ['Every client,', 'kept in order.'],
    body: 'Each client has a page with their details, invoices, payments and balance. Repeat work takes a minute to bill, and nothing owed slips past you.',
    piece: <Clients />,
  },
];

/**
 * What Invoica does for a business, before how it works: a file of three folders, identity, financial clarity and
 * clients, each named on its tab in its own colour and showing what is filed in it. Each folder is a little wider
 * than the one before and stands in front of it; the tabs step across like dividers.
 */
export function Pillars() {
  return (
    <section id="why" className={`${s.wrap} ${s.pillars}`} aria-labelledby="why-heading">
      <div className={`${s.grid} ${s.sectionIntro}`}>
        <div className={s.introHeading}>
          <span className={s.label}>Why Invoica</span>
          <h2 id="why-heading" className={`${s.display} ${s.h2}`}>
            <span className={s.keep}>The business side</span>{' '}
            <span className={s.keep}>of your business,</span> <span className={s.keep}>in order.</span>
          </h2>
        </div>
        <p className={`${s.lead} ${s.introLead}`}>
          Invoica brings your brand, your clients and your money into one place. Your clients see a business
          with its paperwork in order, and you see exactly how it is doing.
        </p>
      </div>
      <ul className={s.file}>
        {FOLDERS.map((f) => (
          <li key={f.label} className={s.folder}>
            <span className={s.folderTab} data-tab="">
              <span className={s.label}>{f.label}</span>
            </span>
            <div className={s.folderWords}>
              <h3 className={`${s.display} ${s.folderHeading}`}>
                <span className={s.keep}>{f.heading[0]}</span> <span className={s.keep}>{f.heading[1]}</span>
              </h3>
              <p className={s.folderBody}>{f.body}</p>
            </div>
            {f.piece}
          </li>
        ))}
      </ul>
    </section>
  );
}
