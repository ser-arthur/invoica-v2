import s from './site.module.css';

const PILLARS = [
  {
    label: 'Your identity',
    heading: ['Your brand,', 'on every invoice.'],
    body: 'Add your logo and colour once, then choose the layout that suits your work. Every invoice and reminder your clients receive looks as considered as the work behind it.',
    rule: 'linear-gradient(90deg, #CFF26A, #86D94F)',
  },
  {
    label: 'Financial clarity',
    heading: ['Know where', 'your money is.'],
    body: 'Your dashboard shows what you are owed, what is late and what has come in, worked out from your records the moment anything changes. No spreadsheet, no guessing.',
    rule: 'linear-gradient(90deg, #6CD47A, #37C66B)',
  },
  {
    label: 'Client management',
    heading: ['Every client,', 'kept in order.'],
    body: 'Each client has a page with their details, invoices, payments and balance. Repeat work takes a minute to bill, and nothing owed slips past you.',
    rule: 'linear-gradient(90deg, #2FB3A6, #138C86)',
  },
];

/** What Invoica does for a business, before how it works: identity, financial clarity and clients. */
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
      <ul className={s.pillarList}>
        {PILLARS.map((p) => (
          <li key={p.label} className={s.pillar}>
            <span className={s.pillarRule} style={{ backgroundImage: p.rule }} aria-hidden="true" />
            <span className={s.label}>{p.label}</span>
            <h3 className={`${s.display} ${s.pillarHeading}`}>
              <span className={s.keep}>{p.heading[0]}</span> <span className={s.keep}>{p.heading[1]}</span>
            </h3>
            <p className={s.pillarBody}>{p.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
