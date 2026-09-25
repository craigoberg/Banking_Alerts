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
