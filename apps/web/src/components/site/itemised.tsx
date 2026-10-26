import { Logo } from '@/components/logo';
import s from './site.module.css';
import { Tilt } from './tilt';

const LINES = [
  {
    title: 'Clients in one place',
    body: "Each client's details, invoices, payments and balance, together on one page.",
  },
  {
    title: 'Pounds, cedis and more',
    body: 'Bill each client in their own currency, with VAT shown in pounds where the rules ask for it.',
  },
  {
    title: 'Credit notes and refunds',
    body: 'Correct an issued invoice the proper way, and record any money you send back.',
  },
  { title: 'Saved items', body: 'Your usual services and prices, ready to add to any invoice.' },
  {
    title: 'Your records, yours',
    body: 'Download everything Invoica holds for you, as a spreadsheet or a file.',
  },
  {
    title: 'Figures you can trust',
    body: 'Totals, tax and rounding worked out the same way every time, to the penny.',
  },
];

function Scissors() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24">
      <circle cx="6" cy="7" r="3" fill="none" stroke="#56676A" strokeWidth="1.6" />
      <circle cx="6" cy="17" r="3" fill="none" stroke="#56676A" strokeWidth="1.6" />
      <path
        d="M8.6 8.6L20 18M8.6 15.4L20 6"
        fill="none"
        stroke="#56676A"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The rest of the product as line items on an invoice, each at £0.00 during the free trial, stamped
 * "Free for 30 days" the way a paid invoice is stamped, and the sign-up as the invoice's tear-off slip.
 */
export function Itemised() {
  return (
    <section id="pricing" className={`${s.wrap} ${s.details}`} aria-labelledby="itemised-heading">
      <div className={`${s.grid} ${s.detailsGrid}`}>
        <div className={s.detailsText}>
          <span className={s.label}>What you get</span>
          <h2 id="itemised-heading" className={`${s.display} ${s.h2}`}>
            Everything you need, itemised.
          </h2>
          <p className={s.lead}>
            Every account comes with all of it. Your first 30 days cost nothing and need no card. After that,
            up to three clients stay free.
          </p>
          <a href="/pricing" className={`${s.textLink} ${s.moreLink}`}>
            Compare plans and prices
          </a>
        </div>
        <div className={s.detailsBill}>
          <Tilt className={s.billShadow} max={3}>
            <div className={s.bill}>
              <span className={s.billFlap} aria-hidden="true" />
              <div className={s.billBody}>
                <div className={s.billTop}>
                  <Logo className={s.billLogo} shaded />
                  <dl className={`${s.billMeta} ${s.figures}`}>
                    <dt>Invoice</dt>
                    <dd>INV-0001</dd>
                    <dt>Issued</dt>
                    <dd>Today</dd>
                    <dt>Billed to</dt>
                    <dd>Your business</dd>
                  </dl>
                </div>
                <div className={s.billColumns} aria-hidden="true">
                  <span>Description</span>
                  <span>Amount</span>
                </div>
                <ul className={s.lines}>
                  {LINES.map((line) => (
                    <li key={line.title} className={s.line}>
                      <div>
                        <h3>{line.title}</h3>
                        <p>{line.body}</p>
                      </div>
                      <span className={`${s.lineAmount} ${s.figures}`}>£0.00</span>
                    </li>
                  ))}
                </ul>
                <div className={s.billFoot}>
                  <p className={s.stamp}>
                    <span className={s.stampBig}>Free</span>
                    <span className={s.stampSmall}>for 30 days</span>
                    <span className={s.stampTiny}>No card needed</span>
                  </p>
                  <dl className={`${s.totals} ${s.figures}`}>
                    <dt className={s.quiet}>Subtotal</dt>
                    <dd>£0.00</dd>
                    <dt className={s.totalDue}>Total due</dt>
                    <dd className={`${s.display} ${s.totalAmount}`}>£0.00</dd>
                  </dl>
                </div>
                <p className={s.billNote}>
                  For your first 30 days. <a href="/pricing">See every plan</a>
                </p>
              </div>
              <div className={s.cut} aria-hidden="true">
                <Scissors />
              </div>
              <div className={s.slip}>
                <div>
                  <h2 className={`${s.display} ${s.slipHeading}`}>
                    <span className={s.keep}>Start with</span>{' '}
                    <span className={s.keep}>your next invoice.</span>
                  </h2>
                  <form className={s.slipForm} action="/sign-up" method="get">
                    <label>
                      Your email
                      <input className={s.field} type="email" name="email" autoComplete="email" required />
                    </label>
                    <button type="submit" className={s.button}>
                      Create your free account
                    </button>
                  </form>
                </div>
                <dl className={`${s.remittance} ${s.figures}`}>
                  <dt>Pay to</dt>
                  <dd>Invoica</dd>
                  <dt>Reference</dt>
                  <dd>Your first 30 days</dd>
                  <dt>Amount</dt>
                  <dd>£0.00</dd>
                  <dt>Due</dt>
                  <dd>Whenever you are ready</dd>
                </dl>
              </div>
            </div>
          </Tilt>
        </div>
      </div>
    </section>
  );
}
