import Link from 'next/link';
import { EVERY_PLAN, PLANS, type Plan } from './plans';
import p from './pricing.module.css';
import s from './site.module.css';
import { Tilt } from './tilt';

const QUESTIONS = [
  {
    q: 'What happens after the 30 days?',
    a: 'Your account moves to Free unless you choose a plan. Nothing is lost: clients you added during the trial can still be invoiced, and every invoice you issued is kept exactly as it was sent.',
  },
  {
    q: 'Do I need a card to start?',
    a: 'No. You add a card only when you choose Pro or Studio.',
  },
  {
    q: 'What counts as an active client?',
    a: 'Any client you have not archived. Archive a client you no longer work with to make room on Free; their invoices and payments stay in your records.',
  },
  {
    q: 'Are invoices limited on Free?',
    a: 'No. On every plan you can write, issue and send as many invoices and credit notes as you need. A correct invoice is never behind a paywall.',
  },
  {
    q: 'Do you take a fee from my payments?',
    a: 'No. Invoica takes nothing from the money your clients pay you.',
  },
  {
    q: 'Is there a price for Ghana and Nigeria?',
    a: 'Yes. Plans there will be priced lower and charged in cedis and naira.',
  },
  {
    q: 'Is there an offer for early customers?',
    a: 'The first 200 businesses to subscribe to Pro pay £5 a month for as long as they stay subscribed, whatever the price becomes later.',
  },
];

function Tick() {
  return (
    <svg className={p.tick} width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="9" fill="currentColor" opacity="0.14" />
      <path
        d="M5.2 9.3l2.4 2.4 5-5.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const id = `plan-${plan.name.toLowerCase()}`;
  const pro = plan.name === 'Pro';
  return (
    <Tilt as="article" aria-labelledby={id} className={`${p.plan} ${pro ? p.pro : ''}`} max={4}>
      {pro ? <span className={p.flap} aria-hidden="true" /> : null}
      {pro ? <span className={p.tag}>Your first 30 days</span> : null}
      <h2 id={id} className={`${s.display} ${p.planName}`}>
        {plan.name}
      </h2>
      <p className={p.forWhom}>{plan.forWhom}</p>
      {plan.name === 'Free' ? (
        <p className={p.price}>
          <b className={s.display}>{plan.monthly}</b> <span>for as long as you like</span>
        </p>
      ) : (
        <p className={p.price}>
          <span className={p.monthly}>
            <b className={s.display}>{plan.monthly}</b> <span>a month</span>
          </span>
          <span className={p.yearly}>
            <b className={s.display}>{plan.yearly}</b> <span>a year, two months free</span>
          </span>
        </p>
      )}
      <Link href="/sign-up" className={`${s.button} ${pro ? p.limeButton : ''} ${p.planButton}`}>
        {plan.cta}
      </Link>
      <ul className={p.features}>
        {plan.features.map((f) => (
          <li key={f.text}>
            <Tick />
            <span>
              {f.text}
              {f.soon ? <span className={p.soon}> coming soon</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </Tilt>
  );
}

/** The pricing page's body: the trial first, the three plans, what every plan includes, and questions. */
export function Pricing() {
  return (
    <div className={p.pricing}>
      <section className={`${s.wrap} ${p.intro}`} aria-labelledby="pricing-heading">
        <span className={s.label}>Pricing</span>
        <h1 id="pricing-heading" className={`${s.display} ${p.title}`}>
          <span className={s.keep}>Plans that grow</span> <span className={s.keep}>with your business.</span>
        </h1>
        <p className={s.lead}>
          Start with everything for 30 days. Then stay on Free for as long as it suits you, or choose the plan
          that fits.
        </p>
      </section>

      <section className={s.wrap} aria-labelledby="trial-heading">
        <div className={p.trial}>
          <p className={p.trialStamp} aria-hidden="true">
            <span>30</span>
            <span>days free</span>
          </p>
          <div className={p.trialText}>
            <h2 id="trial-heading" className={`${s.display} ${p.trialHeading}`}>
              Every account starts with 30 days of Pro, free.
            </h2>
            <p>
              No card needed. When the 30 days end, your account moves to Free unless you choose a plan, and
              everything you made stays yours.
            </p>
          </div>
          <Link href="/sign-up" className={`${s.button} ${p.trialButton}`}>
            Start your 30 days
          </Link>
        </div>
      </section>

      <section className={`${s.wrap} ${p.plansSection}`} aria-label="Plans">
        <fieldset className={p.switch}>
          <legend className={p.switchLegend}>Prices shown</legend>
          <label>
            <input type="radio" name="billing" value="monthly" defaultChecked />
            <span>Monthly</span>
          </label>
          <label>
            <input type="radio" name="billing" value="yearly" />
            <span>
              Yearly <em>two months free</em>
            </span>
          </label>
        </fieldset>
        <div className={p.planGrid}>
          {PLANS.map((plan) => (
            <PlanCard key={plan.name} plan={plan} />
          ))}
        </div>
      </section>

      <section className={`${s.wrap} ${p.every}`} aria-labelledby="every-heading">
        <div className={p.everyHead}>
          <span className={s.label}>On every plan</span>
          <h2 id="every-heading" className={`${s.display} ${s.h2}`}>
            <span className={s.keep}>The essentials are</span>{' '}
            <span className={s.keep}>never paywalled.</span>
          </h2>
        </div>
        <ul className={p.everyList}>
          {EVERY_PLAN.map((item) => (
            <li key={item}>
              <Tick />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className={`${s.wrap} ${p.faq}`} aria-labelledby="faq-heading">
        <div className={p.faqHead}>
          <span className={s.label}>Questions</span>
          <h2 id="faq-heading" className={`${s.display} ${s.h2}`}>
            Before you start.
          </h2>
        </div>
        <div className={p.faqList}>
          {QUESTIONS.map((item) => (
            <details key={item.q} className={p.question}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={s.wrap} aria-labelledby="closing-heading">
        <div className={p.closing}>
          <h2 id="closing-heading" className={`${s.display} ${s.h2}`}>
            <span className={s.keep}>Start with</span> <span className={s.keep}>your next invoice.</span>
          </h2>
          <Link href="/sign-up" className={s.button}>
            Start free for 30 days
          </Link>
        </div>
      </section>
    </div>
  );
}
