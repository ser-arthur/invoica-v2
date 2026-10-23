import Image from 'next/image';
import issuePaper from './images/issue-paper.webp';
import remindChasing from './images/remind-chasing.webp';
import writeLines from './images/write-lines.webp';
import writePreview from './images/write-preview.webp';
import s from './site.module.css';
import { Tilt } from './tilt';

/**
 * How one invoice gets paid, in five steps. Each step has a numeral in one flat colour, stepping along the page's
 * lime to teal scale, and a picture on a tinted panel, so the white cards on it stand clear; on phones the picture
 * gives way to one piece of the app at a size that can be read. A line runs down the margin
 * through all five, the invoice's route, filling from lime to teal as the page scrolls past.
 */
const STEPS = [
  {
    name: 'Write',
    numeral: '#5B8E14',
    tint: '#EFF6CF',
    heading: ['Look established', 'from the first line.'],
    body: 'Your logo, colours and payment details go in once. After that, type the work you did and the invoice lays itself out beside it, with VAT worked out to the penny. Leave it as a draft and finish it later, on any device.',
    visual: <WriteVisual />,
    piece: <WritePiece />,
  },
  {
    name: 'Issue',
    numeral: '#3F8A1E',
    tint: '#E4F4D6',
    heading: ['Numbered properly,', 'kept exactly as sent.'],
    body: 'Issuing gives the invoice the next number in your sequence, with no gaps, and keeps its PDF just as it was. If something needs correcting later, a credit note puts it right the way your accountant would expect.',
    visual: <IssueVisual />,
    piece: (
      <div className={s.pieceCard}>
        <IssueCardContent />
      </div>
    ),
  },
  {
    name: 'Send',
    numeral: '#179A55',
    tint: '#DAF1E3',
    heading: ['In their inbox,', 'under your name.'],
    body: 'Send it from Invoica with the PDF attached. It arrives from your business, and when your client replies, the reply comes straight to you.',
    visual: <SendVisual />,
    piece: (
      <div className={`${s.pieceCard} ${s.pieceMail}`}>
        <MailContent />
      </div>
    ),
  },
  {
    name: 'Remind',
    numeral: '#118A6E',
    tint: '#D4EEEA',
    heading: ['Late payers,', 'followed up politely.'],
    body: 'Choose when reminders go out and what they say. Invoica sends each one on schedule and stops as soon as the invoice is paid, so the awkward email is never yours to write.',
    visual: <RemindVisual />,
    piece: (
      <div className={s.pieceCard}>
        <ReminderContent />
      </div>
    ),
  },
];

export function Steps() {
  return (
    <div id="how">
      <div className={`${s.wrap} ${s.grid} ${s.sectionIntro} ${s.howIntro}`}>
        <div className={s.introHeading}>
          <span className={s.label}>How it works</span>
          <h2 className={`${s.display} ${s.h2}`}>
            <span className={s.keep}>From the first line</span> <span className={s.keep}>to paid.</span>
          </h2>
        </div>
        <p className={`${s.lead} ${s.introLead}`}>
          Every invoice follows the same five steps. Invoica handles the paperwork at each one, so you always
          know where an invoice stands and what happens next.
        </p>
      </div>
      <div className={s.journey}>
        <span className={s.journeyTrack} aria-hidden="true">
          <span className={s.journeyFill} />
        </span>
        <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {STEPS.map((step, i) => (
            <li key={step.name} className={`${s.wrap} ${s.grid} ${s.step}`}>
              <div className={s.stepText}>
                <Marker n={i + 1} name={step.name} colour={step.numeral} />
                <h3 className={`${s.display} ${s.stepHeading}`}>
                  <span className={s.keep}>{step.heading[0]}</span>{' '}
                  <span className={s.keep}>{step.heading[1]}</span>
                </h3>
                <p className={s.lead}>{step.body}</p>
              </div>
              <Tilt
                className={`${s.stepVisual} ${s.stage}`}
                style={{ background: step.tint }}
                aria-hidden="true"
              >
                <div className={s.stageInner}>{step.visual}</div>
                <div className={s.piece} data-piece="">
                  {step.piece}
                </div>
              </Tilt>
            </li>
          ))}
          <li className={`${s.wrap} ${s.step}`}>
            <div className={`${s.grid} ${s.paidHead}`}>
              <div className={s.introHeading}>
                <Marker n={5} name="Get paid" colour="#0F7F7A" />
                <h3 className={`${s.display} ${s.stepHeading}`}>
                  <span className={s.keep}>Always know</span>{' '}
                  <span className={s.keep}>where your money is.</span>
                </h3>
              </div>
              <p className={s.lead}>
                Record payments in full or in parts as they come in. Your dashboard shows what you are owed,
                what is late and what has arrived this month, with no spreadsheet to keep.
              </p>
            </div>
            <OwedCard />
          </li>
        </ol>
      </div>
    </div>
  );
}

function Marker({ n, name, colour }: { n: number; name: string; colour: string }) {
  return (
    <div className={s.marker}>
      <span className={s.numeral} style={{ color: colour }} aria-hidden="true">
        {n}
      </span>
      <span className={s.stepName}>{name}</span>
    </div>
  );
}

function WriteVisual() {
  return (
    <>
      <Image
        src={writePreview}
        alt=""
        unoptimized
        className={`${s.lift} ${s.driftSlow}`}
        style={{
          position: 'absolute',
          right: 40,
          top: 44,
          width: 300,
          height: 'auto',
          borderRadius: 26,
          transform: 'rotate(3deg)',
        }}
      />
      <Image
        src={writeLines}
        alt=""
        unoptimized
        className={`${s.lift} ${s.driftFast}`}
        style={{ position: 'absolute', left: 40, top: 72, width: 470, height: 'auto', borderRadius: 22 }}
      />
    </>
  );
}

function Tick() {
  return (
    <span className={s.done}>
      <svg width="11" height="11" viewBox="0 0 12 12">
        <path
          d="M2.5 6.2l2.4 2.4 4.6-5"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function IssueVisual() {
  return (
    <>
      <Image
        src={issuePaper}
        alt=""
        unoptimized
        className={`${s.lift} ${s.driftSlow}`}
        style={{
          position: 'absolute',
          left: 56,
          top: 40,
          width: 330,
          height: 'auto',
          borderRadius: 4,
          transform: 'rotate(-2deg)',
        }}
      />
      <div
        className={`${s.card} ${s.lift} ${s.driftFast} ${s.figures}`}
        style={{ right: 40, bottom: 56, width: 392, padding: '20px 22px' }}
      >
        <IssueCardContent />
      </div>
    </>
  );
}

function SendVisual() {
  return (
    <>
      <Image
        src={issuePaper}
        alt=""
        unoptimized
        className={`${s.lift} ${s.driftSlow}`}
        style={{
          position: 'absolute',
          right: 48,
          top: 36,
          width: 220,
          height: 'auto',
          borderRadius: 4,
          transform: 'rotate(6deg)',
        }}
      />
      <div
        className={`${s.card} ${s.lift} ${s.driftFast}`}
        style={{ left: 48, top: 52, width: 470, overflow: 'hidden' }}
      >
        <MailContent />
      </div>
    </>
  );
}

function RemindVisual() {
  return (
    <>
      <Image
        src={remindChasing}
        alt=""
        unoptimized
        className={`${s.lift} ${s.driftSlow}`}
        style={{ position: 'absolute', left: 40, top: 96, width: 560, height: 'auto', borderRadius: 22 }}
      />
      <div
        className={`${s.card} ${s.lift} ${s.driftFast}`}
        style={{ right: 40, top: 302, width: 390, padding: '20px 22px' }}
      >
        <ReminderContent />
      </div>
    </>
  );
}

/** For phones: the line being typed, with its VAT and the total worked out beside it. */
function WritePiece() {
  return (
    <div className={s.pieceCard}>
      <span className={s.pieceLabel}>Line 2</span>
      <div className={s.pieceField}>Wayfinding concepts</div>
      <div className={s.pieceRow}>
        <div className={`${s.pieceField} ${s.figures}`}>1</div>
        <div className={`${s.pieceField} ${s.pieceActive} ${s.figures}`}>950.00</div>
        <span className={`${s.pieceAmount} ${s.figures}`}>£950.00</span>
      </div>
      <span className={s.piecePill}>Standard rate, 20%</span>
      <div className={`${s.pieceSums} ${s.figures}`}>
        <div>
          <span>Subtotal</span>
          <span>£1,900.00</span>
        </div>
        <div>
          <span>VAT at 20%</span>
          <span>£380.00</span>
        </div>
        <div className={s.pieceTotal}>
          <span>Total</span>
          <span>£2,280.00</span>
        </div>
      </div>
    </div>
  );
}

/** The issued invoice's card: its number, its route from draft to paid, and its kept PDF. */
function IssueCardContent() {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <strong className={s.display} style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
          INV-0044
        </strong>
        <span className={s.quiet} style={{ fontSize: 13 }}>
          Meridian Architects LLP
        </span>
      </div>
      <div className={s.route}>
        <span className={s.routeTrack} />
        <span className={s.routeStop}>
          <Tick />
          <span>
            <strong>Draft</strong>
            <br />
            <span className={s.quiet}>19 Oct</span>
          </span>
        </span>
        <span className={s.routeStop}>
          <Tick />
          <span>
            <strong>Issued</strong>
            <br />
            <span className={s.quiet}>20 Oct</span>
          </span>
        </span>
        <span className={`${s.routeStop} ${s.quiet}`}>
          <span className={s.open} />
          <span>
            <strong>Sent</strong>
            <br />
            next
          </span>
        </span>
        <span className={`${s.routeStop} ${s.quiet}`}>
          <span className={s.open} />
          <span>
            <strong>Paid</strong>
            <br />
            due 3 Nov
          </span>
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 16,
          paddingTop: 14,
          borderTop: '1px solid #E3E8E6',
          fontSize: 13.5,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path
            d="M4 1.5h5.5L13 5v9.5H4z M9 1.5V5h4"
            fill="none"
            stroke="#09191C"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        INV-0044.pdf, kept as issued
      </div>
    </>
  );
}

/** The email as the client receives it, with the PDF attached. */
function MailContent() {
  return (
    <>
      <div className={s.mailHead}>
        <span className={s.quiet}>From</span>
        <strong>Linden &amp; Rowe Studio</strong>
        <span className={s.quiet}>To</span>
        <span>accounts@meridian.example</span>
        <span className={s.quiet}>Subject</span>
        <strong>Invoice INV-0044 from Linden &amp; Rowe Studio</strong>
      </div>
      <div className={s.mailBody}>
        <p>Hello,</p>
        <p>
          Please find attached invoice INV-0044 for <strong>£2,280.00</strong>, due on 3 November 2026.
        </p>
        <p>
          Thank you,
          <br />
          Linden &amp; Rowe Studio
        </p>
        <div className={s.attachment}>
          <span className={s.pdfTag}>PDF</span>
          INV-0044.pdf
        </div>
      </div>
      <div className={s.mailFoot}>Replies go to hello@lindenrowe.example</div>
    </>
  );
}

/** A reminder as it goes out on its own. */
function ReminderContent() {
  return (
    <>
      <div className={s.reminderMeta}>Sent on its own, Sunday 09:00</div>
      <div style={{ marginTop: 10, fontSize: 15, fontWeight: 700 }}>A reminder about INV-0038</div>
      <p style={{ margin: '8px 0 0', fontSize: 14.5, lineHeight: 1.55, color: '#3E4F51' }}>
        Hello, a quick reminder that invoice INV-0038 for £800.00 was due on 18 October. If it is already on
        its way, thank you.
      </p>
    </>
  );
}

/** The dashboard's owed card, drawn as it is in the app, with its corner turned. */
function OwedCard() {
  return (
    <figure style={{ margin: 0 }}>
      <Tilt
        className={`${s.owed} ${s.figures}`}
        max={3}
        role="img"
        aria-label="An example dashboard: £6,420.00 owed across 5 invoices, £4,180.00 not due yet and £2,240.00 overdue, with £8,950.00 paid in the last 30 days."
      >
        <span className={s.owedFlap} />
        <div aria-hidden="true">
          <div className={s.owedTop}>
            <div>
              <div className={s.owedLabel}>Owed to you</div>
              <div className={`${s.display} ${s.owedAmount}`}>
                £6,420<span>.00</span>
              </div>
              <p className={s.owedNote}>5 invoices with clients</p>
            </div>
            <span className={s.chase}>Chase the two overdue</span>
          </div>
          <div className={s.split}>
            <div className={s.barDue} />
            <div className={s.barLate} />
            <div>
              <div className={s.statLabel}>Not due yet</div>
              <div className={s.statValue}>£4,180.00</div>
              <div className={s.statNote}>3 invoices, next due 30 Oct</div>
            </div>
            <div>
              <div className={s.statLate}>Overdue</div>
              <div className={s.statValue}>£2,240.00</div>
              <div className={s.statNote}>2 invoices</div>
            </div>
          </div>
          <div className={s.owedStats}>
            <div>
              <div className={s.statLabel}>Paid in the last 30 days</div>
              <div className={s.statValue}>£8,950.00</div>
              <div className={s.statNote}>6 payments</div>
            </div>
            <div>
              <div className={s.statLabel}>Drafts, not sent</div>
              <div className={s.statValue}>£1,280.00</div>
              <div className={s.statNote}>2 drafts</div>
            </div>
            <div>
              <div className={s.statLabel}>Invoiced this month</div>
              <div className={s.statValue}>£3,940.00</div>
              <div className={s.statNote}>after £240.00 credited</div>
            </div>
          </div>
        </div>
      </Tilt>
      <figcaption className={s.caption}>An example studio&rsquo;s dashboard</figcaption>
    </figure>
  );
}
