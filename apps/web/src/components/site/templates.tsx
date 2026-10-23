import { renderDocumentHtml, sampleSnapshot } from '@invoica/documents';
import { Paper } from '@/components/paper';
import s from './site.module.css';

const fontUrl = (f: string) => `/doc-fonts/${f}`;

/** Three real invoices in different layouts, rendered by the documents package. */
export function Templates() {
  const studio = renderDocumentHtml(
    sampleSnapshot({ template: 'studio', seller: { name: 'Northlight Studio', brandColour: '#d9480f' } }),
    { fontUrl },
  );
  const counsel = renderDocumentHtml(
    sampleSnapshot({
      template: 'counsel',
      seller: {
        name: 'Harrow & Vale',
        brandColour: '#1d3c5a',
        taxRegistered: true,
        taxNumber: 'GB 000 0000 00',
      },
    }),
    { fontUrl },
  );
  const letter = renderDocumentHtml(
    sampleSnapshot({ template: 'letter', seller: { name: 'Ama Owusu Photography', brandColour: '#5b2a4e' } }),
    { fontUrl },
  );
  return (
    <section id="templates" className={s.templates} aria-labelledby="templates-heading">
      <div className={`${s.wrap} ${s.grid} ${s.band} ${s.templatesGrid}`}>
        <div className={s.templatesText}>
          <span className={s.label}>Templates</span>
          <h2 id="templates-heading" className={`${s.display} ${s.h2}`}>
            <span className={s.keep}>Seven layouts.</span>{' '}
            <span className={s.keep}>Your logo, your colour.</span>
          </h2>
          <p className={s.lead}>
            Pick the layout that suits your work and see it with your own details before you choose. Every
            invoice after that carries the same look, so your clients come to know it as yours.
          </p>
        </div>
        <div
          className={s.fan}
          role="img"
          aria-label="Three example invoices in different layouts: Studio, Counsel and Letter"
        >
          <div className={s.fanInner}>
            <Paper html={studio} width={240} title="Studio layout" className={s.fanLeft} />
            <Paper html={counsel} width={240} title="Counsel layout" className={s.fanMiddle} />
            <Paper html={letter} width={240} title="Letter layout" className={s.fanRight} />
          </div>
        </div>
      </div>
    </section>
  );
}
