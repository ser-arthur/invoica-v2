'use client';

import { useMemo } from 'react';
import { RANGE, renderDocumentHtml, SHOWCASE, showcaseSnapshot, TEMPLATE_LIST } from '@invoica/documents';
import { FitPaper } from './fit-paper';
import s from './site.module.css';
import { fontUrl, TryIt, useVisitor } from './try-it';

/**
 * The Templates page's range: all sixteen in the picker's order, each made out by its own invented business, named
 * with who it is for. A business name or a colour redraws all sixteen as the visitor's. On a wide screen the controls
 * stay in sight beside the range as it scrolls.
 */
export function TemplatesRange() {
  const visitor = useVisitor();
  const { typed, colour, chosen } = visitor;

  const cards = useMemo(() => {
    const yours = { name: typed || undefined, colour: colour ?? undefined };
    return TEMPLATE_LIST.map((t) => {
      const example =
        SHOWCASE.find((e) => e.template === t.id) ?? RANGE.find((r) => r.template === t.id) ?? null;
      return {
        id: t.id,
        name: t.name,
        forWhom: t.description,
        html: renderDocumentHtml(showcaseSnapshot(t.id, yours), {
          fontUrl,
          logoUrl: chosen || !example ? null : example.logo,
        }),
      };
    });
  }, [typed, colour, chosen]);

  return (
    <div className={`${s.wrap} ${s.range}`}>
      <div className={s.rangeControls}>
        <TryIt visitor={visitor} />
      </div>
      <ul className={s.rangeList} aria-label="All sixteen templates">
        {cards.map((c) => (
          <li key={c.id}>
            <FitPaper html={c.html} title={`${c.name} template`} />
            <strong>{c.name}</strong>
            <span>{c.forWhom}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
