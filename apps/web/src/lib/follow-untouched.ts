const isPlain = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** An empty field and one stored as nothing read the same: the form holds '' where the server keeps null. */
const blank = (value: unknown) => value === undefined || value === null || value === '';

const same = (a: unknown, b: unknown): boolean => {
  if (blank(a) && blank(b)) return true;
  if (isPlain(a) && isPlain(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].every((k) => same(a[k], b[k]));
  }
  return JSON.stringify(a) === JSON.stringify(b);
};

/**
 * What a form shows once the record it was opened from has changed elsewhere (docs/specs/changes-elsewhere.md, rule
 * 8): each field the person has not changed since `loaded` takes its `latest` value, and what they typed stays.
 * Nested details are compared field by field, including details that were missing when the page opened.
 */
export function followUntouched<T>(loaded: T, current: T, latest: T): T {
  if (same(current, loaded)) return latest;
  const typedIn = isPlain(current) && isPlain(latest);
  if (!typedIn || !(isPlain(loaded) || blank(loaded))) return current;
  const before: Record<string, unknown> = isPlain(loaded) ? loaded : {};
  const out: Record<string, unknown> = { ...current };
  for (const key of new Set([...Object.keys(latest), ...Object.keys(current)])) {
    out[key] = followUntouched(before[key], current[key], latest[key]);
  }
  return out as T;
}
