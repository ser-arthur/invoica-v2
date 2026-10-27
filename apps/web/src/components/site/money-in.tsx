import s from './site.module.css';

/** An example studio's money in, by month, in whole pounds. Invented for the website. */
const MONTHS = [
  { short: 'May', long: 'May', amount: 4200, shown: '£4,200', from: '#EDFBB8', to: '#D9F27E' },
  { short: 'Jun', long: 'June', amount: 6850, shown: '£6,850', from: '#D3F27C', to: '#AEE35B' },
  { short: 'Jul', long: 'July', amount: 5100, shown: '£5,100', from: '#ABE78C', to: '#7FD98B' },
  { short: 'Aug', long: 'August', amount: 7420, shown: '£7,420', from: '#86E7B0', to: '#56CF96' },
  { short: 'Sep', long: 'September', amount: 6300, shown: '£6,300', from: '#5DD6AE', to: '#2FB3A6' },
  { short: 'Oct', long: 'October so far', amount: 7610, shown: '£7,610', from: '#3CC0AE', to: '#138C86' },
];

/** Money in as folded slabs: each bar a sheet folded along its right edge, its front and its side in two flat
 * shades, lime to teal across the year. */
export function MoneyIn() {
  const top = Math.max(...MONTHS.map((m) => m.amount));
  const label = `Money in at an example studio by month: ${MONTHS.map((m) => `${m.long} ${m.shown}`).join(', ')}.`;
  return (
    <figure className={s.money} role="img" aria-label={label}>
      <div className={s.slabs} aria-hidden="true">
        {MONTHS.map((m) => (
          <div key={m.short} className={s.slab} style={{ height: `${((m.amount / top) * 100).toFixed(1)}%` }}>
            <span className={s.slabFront} style={{ background: m.from }}>
              <span className={s.slabMonth}>{m.short === 'Oct' ? 'Oct so far' : m.short}</span>
              <span className={`${s.slabValue} ${s.figures}`}>{m.shown}</span>
            </span>
            <span className={s.slabFace} style={{ background: m.to }} />
          </div>
        ))}
      </div>
      <div className={s.slabShort} aria-hidden="true">
        {MONTHS.map((m) => (
          <span key={m.short}>{m.short}</span>
        ))}
      </div>
      <figcaption className={s.caption}>
        An example studio&rsquo;s money in<span className={s.captionMore}>, May to October</span>
      </figcaption>
    </figure>
  );
}
