import { MAX_PULL_WINDOW_DAYS } from "@/lib/constants";

export function sydneyDate(date = new Date()): string {
  return sydneyClock(date).date;
}

export function sydneyClock(date: Date): {
  hour: number;
  minute: number;
  date: string;
} {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    hour: "2-digit",
    minute: "2-digit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  let hour = Number(read("hour"));
  if (hour === 24) hour = 0;
  return {
    hour,
    minute: Number(read("minute")),
    date: `${read("year")}-${read("month")}-${read("day")}`,
  };
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function windowFor(today: string, days: number): { from: string; to: string } {
  const clamped = Math.min(MAX_PULL_WINDOW_DAYS, Math.max(1, Math.trunc(days)));
  return { from: addDays(today, -(clamped - 1)), to: today };
}

export function formatDateLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type MonthRange = {
  year: number;
  month: number;
  from: string;
  to: string;
  label: string;
  isCurrent: boolean;
};

function parseIsoDate(isoDate: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1);
}

function fromMonthIndex(index: number): { year: number; month: number } {
  const year = Math.floor(index / 12);
  return { year, month: index - year * 12 + 1 };
}

export function monthWindow(year: number, month: number, today: string): MonthRange {
  const current = parseIsoDate(today);
  const isCurrent = current?.year === year && current.month === month;
  const endDay = isCurrent && current ? current.day : lastDayOfMonth(year, month);
  const base = `${SHORT_MONTHS[month - 1]} ${year}`;
  return {
    year,
    month,
    from: isoDate(year, month, 1),
    to: isoDate(year, month, endDay),
    label: isCurrent ? `${base} · month to date` : base,
    isCurrent,
  };
}

export function currentMonthWindow(today: string): MonthRange {
  const current = parseIsoDate(today);
  if (!current) return monthWindow(1970, 1, "1970-01-01");
  return monthWindow(current.year, current.month, today);
}

export function describeMonthScroller(from: string, to: string, today: string): {
  label: string;
  canGoNext: boolean;
  canGoPrevious: boolean;
} {
  const anchor = parseIsoDate(from) ?? parseIsoDate(today);
  const current = parseIsoDate(today);
  if (!anchor || !current) {
    return { label: "Custom dates", canGoNext: false, canGoPrevious: false };
  }
  const window = monthWindow(anchor.year, anchor.month, today);
  const matches = from === window.from && to === window.to;
  return {
    label: matches ? window.label : "Custom dates",
    canGoNext: stepMonth(from || today, today, 1) !== null,
    canGoPrevious: stepMonth(from || today, today, -1) !== null,
  };
}

export function stepMonth(from: string, today: string, delta: -1 | 1): MonthRange | null {
  const anchor = parseIsoDate(from) ?? parseIsoDate(today);
  const current = parseIsoDate(today);
  if (!anchor || !current) return null;
  const dest = fromMonthIndex(monthIndex(anchor.year, anchor.month) + delta);
  if (dest.year < 1) return null;
  if (monthIndex(dest.year, dest.month) > monthIndex(current.year, current.month)) return null;
  return monthWindow(dest.year, dest.month, today);
}

export function formatSydney(iso: string | null): string {
  if (!iso) return "Unknown time";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
