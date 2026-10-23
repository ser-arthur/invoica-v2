'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { renderDocumentHtml, sampleSnapshot, TEMPLATE_LIST } from '@invoica/documents';
import { Paper } from '@/components/paper';
import s from './site.module.css';

const COLOURS = [
  { name: 'Orange', value: '#d9480f' },
  { name: 'Navy', value: '#1d3c5a' },
  { name: 'Plum', value: '#5b2a4e' },
  { name: 'Forest', value: '#17795a' },
  { name: 'Teal', value: '#138c86' },
  { name: 'Charcoal', value: '#2f3a3d' },
];

const fontUrl = (f: string) => `/doc-fonts/${f}`;

/**
 * Try the templates with your own name: type a business name, pick a colour and a layout, and the invoice in
 * front of the fan redraws itself, rendered by the same code that renders real invoices. Without the page's
 * script it shows the default invoice.
 */
export function TemplateDemo({ left, right }: { left: string; right: string }) {
  const [name, setName] = useState('');
  const [colour, setColour] = useState(COLOURS[0]!.value);
  const [template, setTemplate] = useState('studio');
  const deferredName = useDeferredValue(name);
  const html = useMemo(
    () =>
      renderDocumentHtml(
        sampleSnapshot({
          template,
          seller: { name: deferredName.trim() || 'Northlight Studio', brandColour: colour },
        }),
        { fontUrl },
      ),
    [deferredName, colour, template],
  );
  const layout = TEMPLATE_LIST.find((t) => t.id === template)?.name ?? 'Studio';
  return (
    <>
      <form className={s.demo} onSubmit={(event) => event.preventDefault()}>
        <p className={s.demoTitle}>Try it with your business</p>
        <label className={s.demoField}>
          <span>Business name</span>
          <input
            className={s.field}
            value={name}
            maxLength={60}
            placeholder="Northlight Studio"
            autoComplete="organization"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <fieldset className={s.demoSet}>
          <legend>Colour</legend>
          <div className={s.swatches}>
            {COLOURS.map((c) => (
              <label
                key={c.value}
                className={s.swatch}
                style={{ '--swatch': c.value } as React.CSSProperties}
              >
                <input
                  type="radio"
                  name="demo-colour"
                  value={c.value}
                  checked={colour === c.value}
                  onChange={() => setColour(c.value)}
                />
                <span className={s.srOnly}>{c.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className={s.demoSet}>
          <legend>Layout</legend>
          <div className={s.layouts}>
            {TEMPLATE_LIST.map((t) => (
              <label key={t.id} className={s.layoutPill}>
                <input
                  type="radio"
                  name="demo-layout"
                  value={t.id}
                  checked={template === t.id}
                  onChange={() => setTemplate(t.id)}
                />
                <span>{t.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </form>
      <div
        className={s.fan}
        role="img"
        aria-label={`An example invoice in the ${layout} layout, in front of two others`}
      >
        <div className={s.fanInner}>
          <Paper html={left} width={240} title="Counsel layout" className={s.fanLeft} />
          <Paper html={html} width={260} title={`${layout} layout`} className={s.fanMiddle} />
          <Paper html={right} width={240} title="Letter layout" className={s.fanRight} />
        </div>
      </div>
    </>
  );
}
