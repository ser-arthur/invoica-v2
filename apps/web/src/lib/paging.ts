/** One page of a list, from a page number in the address (counted from one), with where it starts and ends. */
export function pageOf<T>(items: readonly T[], requested: string | undefined, size: number) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const asked = /^\d+$/.test(requested ?? '') ? Number(requested) : 1;
  const page = Math.min(Math.max(asked, 1), pages);
  const start = (page - 1) * size;
  const slice = items.slice(start, start + size);
  return {
    items: slice,
    page,
    pages,
    total: items.length,
    from: slice.length ? start + 1 : 0,
    to: start + slice.length,
  };
}
