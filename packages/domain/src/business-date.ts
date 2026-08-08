/**
 * @altora/domain/business-date — Business date for Altora Resto.
 *
 * Restaurants often close after midnight. A transaction at 01:30 on Aug 9
 * may belong to business date Aug 8. The cutoff is configurable per outlet.
 *
 * All reporting uses businessDate, not DATE(createdAt).
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BusinessDateConfig {
  /** Timezone IANA (e.g., "Asia/Jakarta", "Asia/Makassar") */
  timezone: string;
  /** Hour (0-23) when business day rolls over. Default: 4 (4 AM) */
  cutoffHour: number;
}

const DEFAULT_CONFIG: BusinessDateConfig = {
  timezone: "Asia/Jakarta",
  cutoffHour: 4,
};

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Get business date for a given moment.
 *
 * @param now - The actual timestamp (default: now)
 * @param config - Outlet business date config
 * @returns Business date as YYYY-MM-DD string
 */
export function getBusinessDate(
  now: Date = new Date(),
  config: BusinessDateConfig = DEFAULT_CONFIG,
): string {
  // Convert to outlet timezone
  const outletDate = new Date(
    now.toLocaleString("en-US", { timeZone: config.timezone }),
  );

  const hour = outletDate.getHours();
  const date = new Date(outletDate);

  // If before cutoff, it's still yesterday's business day
  if (hour < config.cutoffHour) {
    date.setDate(date.getDate() - 1);
  }

  return formatDate(date);
}

/**
 * Get business date range for reporting.
 */
export function getBusinessDateRange(
  startDate: string,
  endDate: string,
  config: BusinessDateConfig = DEFAULT_CONFIG,
): { start: Date; end: Date } {
  return {
    start: parseDate(startDate, config.cutoffHour),
    end: endOfDay(parseDate(endDate, config.cutoffHour)),
  };
}

/**
 * Check if a timestamp falls within a business date.
 */
export function isWithinBusinessDate(
  timestamp: Date,
  businessDate: string,
  config: BusinessDateConfig = DEFAULT_CONFIG,
): boolean {
  const bd = getBusinessDate(timestamp, config);
  return bd === businessDate;
}

/**
 * Get the previous business date.
 */
export function getPreviousBusinessDate(
  currentBusinessDate: string,
): string {
  const date = parseDate(currentBusinessDate);
  date.setDate(date.getDate() - 1);
  return formatDate(date);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(dateStr: string, cutoffHour = 4): Date {
  const parts = dateStr.split("-").map(Number); const y = parts[0] ?? 0; const m = parts[1] ?? 1; const d = parts[2] ?? 1;
  const date = new Date(y, m - 1, d, cutoffHour);
  return date;
}

function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Format business date for display (e.g., "2026-08-08" → "8 Agustus 2026")
 */
export function displayBusinessDate(businessDate: string): string {
  const [y, m, d] = businessDate.split("-").map(Number);
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  return `${d} ${months[m - 1]} ${y}`;
}
