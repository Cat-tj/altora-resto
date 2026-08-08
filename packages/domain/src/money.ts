/**
 * @altora/domain/money — Money utilities for Altora Resto.
 *
 * All money values are stored as integer minor units (IDR: whole rupiah).
 * No floating point. No Decimal for calculations — only for storage/display.
 *
 * Invariant: sum(children) == parent (always, after rounding).
 */

// ─── Types ──────────────────────────────────────────────────────────────────

/** Integer minor units. For IDR: 50000 = Rp50.000 */
export type Money = number;

export interface MoneyBreakdown {
  subtotal: Money;
  discount: Money;
  tax: Money;
  serviceCharge: Money;
  total: Money;
}

// ─── Construction ───────────────────────────────────────────────────────────

/** Create Money from whole units (e.g., fromInput(50000) for Rp50.000) */
export function fromInput(value: number): Money {
  if (!Number.isFinite(value)) throw new Error("Money: non-finite value");
  if (value < 0) throw new Error("Money: negative value not allowed (use discount for reductions)");
  return Math.round(value);
}

/** Create Money from display string (e.g., "50.000" → 50000) */
export function fromDisplay(display: string): Money {
  const cleaned = display.replace(/[^\d]/g, "");
  if (!cleaned) return 0;
  return parseInt(cleaned, 10);
}

/** Format Money to display string (e.g., 50000 → "50.000") */
export function toDisplay(money: Money): string {
  return money.toLocaleString("id-ID");
}

/** Format Money to Rupiah string (e.g., 50000 → "Rp50.000") */
export function toRupiah(money: Money): string {
  return `Rp${toDisplay(money)}`;
}

// ─── Arithmetic ─────────────────────────────────────────────────────────────

export function add(...values: Money[]): Money {
  return values.reduce((sum, v) => sum + v, 0);
}

export function subtract(a: Money, b: Money): Money {
  const result = a - b;
  if (result < 0) throw new Error(`Money: subtraction resulted in negative (${result})`);
  return result;
}

/** Calculate percentage of money (e.g., percent(100000, 10) = 10000) */
export function percent(money: Money, pct: number): Money {
  return Math.round((money * pct) / 100);
}

/** Calculate percentage discount (e.g., discountPercent(100000, 10) = 10000) */
export function discountPercent(original: Money, pct: number): Money {
  if (pct < 0 || pct > 100) throw new Error(`Money: invalid discount percent ${pct}`);
  return percent(original, pct);
}

/** Apply fixed discount (capped at original amount) */
export function discountFixed(original: Money, amount: Money): Money {
  return Math.min(original, amount);
}

// ─── Tax ────────────────────────────────────────────────────────────────────

/** Calculate tax (tax-inclusive: tax = total - base; tax-exclusive: tax = base * rate) */
export function calcTaxInclusive(totalInclusive: Money, taxRate: number): { base: Money; tax: Money } {
  // total = base * (1 + rate)
  // base = total / (1 + rate)
  const base = Math.round(totalInclusive / (1 + taxRate / 100));
  const tax = totalInclusive - base;
  return { base, tax };
}

export function calcTaxExclusive(base: Money, taxRate: number): Money {
  return Math.round((base * taxRate) / 100);
}

// ─── Rounding ───────────────────────────────────────────────────────────────

/**
 * Split money into N parts with largest-remainder rounding.
 * Invariant: sum(result) === total.
 *
 * Example: split(100000, 3) → [33334, 33333, 33333]
 */
export function split(total: Money, parts: number): Money[] {
  if (parts <= 0) throw new Error("Money: split requires positive parts");
  if (parts === 1) return [total];

  const base = Math.floor(total / parts);
  const remainder = total - base * parts;

  const result: Money[] = [];
  for (let i = 0; i < parts; i++) {
    result.push(i < remainder ? base + 1 : base);
  }

  // Verify invariant
  const sum = result.reduce((a, b) => a + b, 0);
  if (sum !== total) {
    throw new Error(`Money: split invariant violated — sum(${sum}) !== total(${total})`);
  }

  return result;
}

/**
 * Allocate discount proportionally across items.
 * Invariant: sum(allocations) === discount.
 */
export function allocateDiscount(
  amounts: Money[],
  totalDiscount: Money,
): Money[] {
  const total = amounts.reduce((a, b) => a + b, 0);
  if (total === 0) return amounts.map(() => 0);

  const raw = amounts.map((a) => (a * totalDiscount) / total);
  const floored = raw.map((r) => Math.floor(r));
  const remainders = raw.map((r, i) => ({ index: i, diff: r - (floored[i] as number) }));

  // Sort by largest remainder
  remainders.sort((a, b) => b.diff - a.diff);

  // Distribute rounding difference
  let distributed = floored.reduce((a, b) => a + b, 0);
  const toDistribute = totalDiscount - distributed;

  for (let i = 0; i < toDistribute; i++) {
    floored[remainders[i]!.index as number]++;
  }

  // Verify invariant
  const sum = floored.reduce((a, b) => a + b, 0);
  if (sum !== totalDiscount) {
    throw new Error(`Money: allocation invariant violated — sum(${sum}) !== discount(${totalDiscount})`);
  }

  return floored;
}

// ─── Validation ─────────────────────────────────────────────────────────────

export function isPositive(m: Money): boolean {
  return m > 0;
}

export function isZero(m: Money): boolean {
  return m === 0;
}

export function assertNonNegative(m: Money, label: string): void {
  if (m < 0) throw new Error(`Money: ${label} is negative (${m})`);
}

export function assertPositive(m: Money, label: string): void {
  if (m <= 0) throw new Error(`Money: ${label} must be positive (${m})`);
}
