import s from './site.module.css';

/** The example studio's clients and what each owes; they add up to the dashboard's £6,420.00. */
const CLIENTS = [
  {
    name: 'Meridian Architects LLP',
    initials: 'MA',
    owes: '£2,280.00',
    note: '1 invoice, due 3 Nov',
    tone: 'due',
  },
  { name: 'Calder Moss Opticians', initials: 'CM', owes: '£1,080.00', note: 'Due 30 Oct', tone: 'due' },
  { name: 'Oakridge Dental', initials: 'OD', owes: '£1,440.00', note: '12 days late', tone: 'late' },
  { name: 'Fennick & Shaw', initials: 'FS', owes: '£800.00', note: '4 days late', tone: 'late' },
  { name: 'Northlight Books', initials: 'NB', owes: '£820.00', note: 'Due 14 Nov', tone: 'due' },
  {
    name: 'Harbour Lights Cafe Ltd',
    initials: 'HL',
    owes: '£0.00',
    note: 'A draft, not sent',
    tone: 'quiet',
  },
  { name: 'Ashby Print Co', initials: 'AP', owes: 'Paid up', note: 'Last paid 18 Oct', tone: 'paid' },
] as const;

/** Meridian Architects' history with the studio, newest first. */
const HISTORY = [
  {
    date: '20 Oct',
    kind: 'invoice',
    title: 'Invoice INV-0044',
    what: 'Brand and wayfinding, phase one',
    amount: '£2,280.00',
    status: 'Sent',
  },
  {
    date: '14 Oct',
    kind: 'payment',
    title: 'Payment for INV-0039',
    what: 'Bank transfer, in full',
    amount: '£1,600.00',
    status: 'Received',
  },
  {
    date: '2 Oct',
    kind: 'credit',
    title: 'Credit note CN-0003',
    what: 'Against INV-0036, one workshop not run',
    amount: '−£240.00',
    status: 'Credited',
  },
  {
    date: '19 Sep',
    kind: 'invoice',
    title: 'Invoice INV-0039',
    what: 'Signage drawings',
    amount: '£1,600.00',
    status: 'Paid',
  },
  {
    date: '28 Aug',
    kind: 'payment',
    title: 'Payment for INV-0036',
    what: 'Bank transfer, after the credit',
    amount: '£1,720.00',
    status: 'Received',
  },
] as const;

const ICONS = {
  invoice: 'M6.5 3.5h7l4 4v13h-11z M13.5 3.5v4h4 M9.5 12.5h5 M9.5 16h5',
  payment: 'M12 4v10 M7.5 9.5L12 14l4.5-4.5 M5 19.5h14',
  credit: 'M6.5 3.5h7l4 4v13h-11z M13.5 3.5v4h4 M9.5 14h5',
};

const LABEL =
  'Linden & Rowe Studio’s clients and what each owes: Meridian Architects LLP £2,280.00, Calder Moss Opticians £1,080.00, Oakridge Dental £1,440.00 and Fennick & Shaw £800.00 overdue, Northlight Books £820.00, Harbour Lights Cafe Ltd a draft not sent, Ashby Print Co paid up. Meridian Architects LLP’s page: it owes £2,280.00, has paid £9,860.00 this year and pays in 11 days on average. Its history: invoice INV-0044 for £2,280.00 sent on 20 October, a payment of £1,600.00 on 14 October, credit note CN-0003 for £240.00 on 2 October, invoice INV-0039 for £1,600.00 paid, and a payment of £1,720.00 on 28 August.';

/**
 * The client side of the app, drawn as the app shows it: the list of clients with what each owes, and one client's
 * page with its figures and its history of invoices, payments and a credit note. On phones, the client's page alone.
 */
export function Clients() {
  return (
    <section id="clients" className={`${s.wrap} ${s.clients}`} aria-labelledby="clients-heading">
      <div className={`${s.grid} ${s.sectionIntro}`}>
        <div className={s.introHeading}>
          <span className={s.label}>Clients</span>
          <h2 id="clients-heading" className={`${s.display} ${s.h2}`}>
            <span className={s.keep}>Every client,</span> <span className={s.keep}>the whole history.</span>
          </h2>
        </div>
        <p className={`${s.lead} ${s.introLead}`}>
          Each client has a page with what you have billed them, what they have paid, any credit you have
          given and what they still owe. Bill repeat work from it in a minute, and see at a glance who is
          late.
        </p>
      </div>
      <figure className={s.clientsFigure}>
        <div className={`${s.clientsWindow} ${s.figures}`} role="img" aria-label={LABEL}>
          <div className={s.clientList} aria-hidden="true">
            <div className={s.clientListHead}>
              <strong>Clients</strong>
              <span className={s.clientCount}>7</span>
            </div>
            <div className={s.clientSearch}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4 4" strokeLinecap="round" />
              </svg>
              Search clients
            </div>
            <ul>
              {CLIENTS.map((c, i) => (
                <li key={c.name} className={s.clientRow} data-open={i === 0 ? '' : undefined}>
                  <span className={s.clientInitials}>{c.initials}</span>
                  <span className={s.clientName}>
                    <strong>{c.name}</strong>
                    <span data-tone={c.tone}>{c.note}</span>
                  </span>
                  <span className={s.clientOwes} data-tone={c.tone}>
                    {c.owes}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className={s.clientPage} aria-hidden="true">
            <div className={s.clientHead}>
              <span className={s.clientBadge}>MA</span>
              <div>
                <strong className={s.display}>Meridian Architects LLP</strong>
                <span>Accounts, Leeds. A client since March 2025</span>
              </div>
              <div className={s.clientActions}>
                <span className={s.clientButton}>New invoice</span>
                <span className={s.clientGhost}>Statement</span>
              </div>
            </div>
            <div className={s.clientFigures}>
              <div>
                <span>Owes you</span>
                <strong className={s.display}>£2,280.00</strong>
                <span>1 invoice, due 3 Nov</span>
              </div>
              <div>
                <span>Paid this year</span>
                <strong className={s.display}>£9,860.00</strong>
                <span>5 payments</span>
              </div>
              <div>
                <span>Pays in</span>
                <strong className={s.display}>11 days</strong>
                <span>on average</span>
              </div>
            </div>
            <div className={s.clientTabs}>
              <span data-open="">History</span>
              <span>Invoices</span>
              <span>Details</span>
            </div>
            <ul className={s.history}>
              {HISTORY.map((h) => (
                <li key={h.title} className={s.historyRow}>
                  <span className={s.historyDate}>{h.date}</span>
                  <span className={s.historyIcon} data-kind={h.kind}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d={ICONS[h.kind]} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className={s.historyWhat}>
                    <strong>{h.title}</strong>
                    <span>{h.what}</span>
                  </span>
                  <span className={s.historyAmount}>{h.amount}</span>
                  <span className={s.historyStatus} data-status={h.status}>
                    {h.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <figcaption className={s.caption}>
          The same studio&rsquo;s clients, with Meridian Architects open
        </figcaption>
      </figure>
    </section>
  );
}
