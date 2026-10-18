import { TEMPLATE_LIST } from '@invoica/documents';

/** Invoice templates offered in Settings and the editor. */
export const TEMPLATES = TEMPLATE_LIST.map((t) => ({ id: t.id, name: `${t.name}: ${t.description}` }));
