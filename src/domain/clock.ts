/** A small, injectable clock seam for retention and job timestamps. */
let currentNow: () => number = () => Date.now();

export function now(): number {
  return currentNow();
}

/** Test hook. Application code should always call now(), never Date.now(). */
export function setNowForTests(clock: (() => number) | undefined): void {
  currentNow = clock ?? (() => Date.now());
}
