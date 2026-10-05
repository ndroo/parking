import { DateTime, Duration } from "luxon";
import { PriceBreakdown } from "@/lib/types";

const DAY_CENTS = 1500; // $15
const WEEK_CENTS = 5000; // $50
const MONTH_CENTS = 12500; // $125

export function calculateBestPrice(startIso: string, endIso: string): PriceBreakdown {
  const start = DateTime.fromISO(startIso, { zone: "America/Toronto" });
  const end = DateTime.fromISO(endIso, { zone: "America/Toronto" });
  if (end <= start) {
    return { months: 0, weeks: 0, days: 0, totalCents: 0 };
  }

  // Whole calendar days in Toronto time, rounded up. (Hours / 24 over-counts by a day
  // whenever the range crosses a daylight-saving change in the autumn.)
  const totalDays = Math.max(1, Math.ceil(end.diff(start, "days").days - 1e-6));

  // Greedy on months -> weeks -> days is optimal given flat rates
  const months = Math.floor(totalDays / 30);
  let remainingDays = totalDays - months * 30;
  const weeks = Math.floor(remainingDays / 7);
  remainingDays = remainingDays - weeks * 7;
  const days = remainingDays;

  const optionGreedy = months * MONTH_CENTS + weeks * WEEK_CENTS + days * DAY_CENTS;

  // Also consider rounding up to next larger unit for potential savings
  const optionAllWeeks = Math.ceil(totalDays / 7) * WEEK_CENTS;
  const optionAllMonths = Math.ceil(totalDays / 30) * MONTH_CENTS;
  const optionAllDays = totalDays * DAY_CENTS;

  const bestTotal = Math.min(optionGreedy, optionAllWeeks, optionAllMonths, optionAllDays);

  // Return decomposition matching the bestTotal for clarity
  if (bestTotal === optionAllMonths) {
    return { months: Math.ceil(totalDays / 30), weeks: 0, days: 0, totalCents: bestTotal };
  }
  if (bestTotal === optionAllWeeks) {
    return { months: 0, weeks: Math.ceil(totalDays / 7), days: 0, totalCents: bestTotal };
  }
  if (bestTotal === optionAllDays) {
    return { months: 0, weeks: 0, days: totalDays, totalCents: bestTotal };
  }
  return { months, weeks, days, totalCents: bestTotal };
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}


