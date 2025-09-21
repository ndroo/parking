import { DateTime, Duration } from "luxon";
import { PriceBreakdown } from "@/lib/types";

const DAY_CENTS = 1500; // $15
const WEEK_CENTS = 5000; // $50
const MONTH_CENTS = 10000; // $100

export function calculateBestPrice(startIso: string, endIso: string): PriceBreakdown {
  const start = DateTime.fromISO(startIso, { zone: "America/Toronto" });
  const end = DateTime.fromISO(endIso, { zone: "America/Toronto" });
  const totalHours = end.diff(start, "hours").hours;
  if (totalHours <= 0) {
    return { months: 0, weeks: 0, days: 0, totalCents: 0 };
  }

  const totalDays = Math.ceil(totalHours / 24);

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


