import { Showcase } from './showcase';
import s from './site.module.css';

/** The templates: six on a shelf as they were designed, redrawn with the visitor's own name and colour. */
export function Templates() {
  return (
    <section id="templates" className={`${s.templates} ${s.band}`} aria-labelledby="templates-heading">
      <div className={`${s.wrap} ${s.showcaseHead}`}>
        <span className={s.label}>Templates</span>
        <h2 id="templates-heading" className={`${s.display} ${s.h2}`}>
          <span className={s.keep}>Fifteen layouts.</span>{' '}
          <span className={s.keep}>Your logo, your colour.</span>
        </h2>
        <p className={s.lead}>
          Pick the layout that suits your work and see it with your own details before you choose. Every
          invoice after that carries the same look, so your clients come to know it as yours.
        </p>
      </div>
      <Showcase />
    </section>
  );
}
