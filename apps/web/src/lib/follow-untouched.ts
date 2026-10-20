const isPlain = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * What a form shows once the record it was opened from has changed elsewhere (docs/specs/changes-elsewhere.md, rule
 * 8): each field the person has not changed since `loaded` takes its `latest` value, and what they typed stays.
 * Nested details are compared field by field.
 */
export function followUntouched<T>(loaded: T, current: T, latest: T): T {
  if (same(current, loaded)) return latest;
  if (!isPlain(loaded) || !isPlain(current) || !isPlain(latest)) return current;
  const out: Record<string, unknown> = { ...current };
  for (const key of new Set([...Object.keys(latest), ...Object.keys(current)])) {
    out[key] = followUntouched(loaded[key], current[key], latest[key]);
  }
  return out as T;
}
