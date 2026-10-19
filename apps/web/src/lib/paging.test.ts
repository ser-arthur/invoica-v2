import { describe, expect, it } from 'vitest';
import { pageOf } from './paging';

describe('pageOf', () => {
  const items = Array.from({ length: 120 }, (_, i) => i);

  it('gives the page asked for, with where it starts and ends', () => {
    expect(pageOf(items, '2', 50)).toMatchObject({ page: 2, pages: 3, from: 51, to: 100, total: 120 });
    expect(pageOf(items, '2', 50).items).toEqual(items.slice(50, 100));
  });

  it('starts at page one, and keeps a page number within the pages there are', () => {
    expect(pageOf(items, undefined, 50).page).toBe(1);
    expect(pageOf(items, 'abc', 50).page).toBe(1);
    expect(pageOf(items, '-3', 50).page).toBe(1);
    expect(pageOf(items, '9', 50)).toMatchObject({ page: 3, from: 101, to: 120 });
  });

  it('has one empty page when there is nothing', () => {
    expect(pageOf([], '1', 50)).toMatchObject({ page: 1, pages: 1, from: 0, to: 0, total: 0, items: [] });
  });
});
