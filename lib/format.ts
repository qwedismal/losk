/**
 * Russian pluralisation for UI counters. Kept tiny and dependency-free so both
 * server and client components can share it.
 */
export function plural(n: number, forms: readonly [string, string, string]): string {
  const abs = Math.abs(Math.trunc(n)) % 100;
  const lastDigit = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (lastDigit > 1 && lastDigit < 5) return forms[1];
  if (lastDigit === 1) return forms[0];
  return forms[2];
}

export function withCount(n: number, forms: readonly [string, string, string]): string {
  return `${n} ${plural(n, forms)}`;
}
