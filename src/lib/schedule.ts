import { sydneyClock } from "@/lib/dates";

export function shouldRunScheduledPull(
  now: Date,
  hour: number,
  minute: number,
): boolean {
  const clock = sydneyClock(now);
  return clock.hour === hour && clock.minute === minute;
}

export function cronExpressionsForSydneyHour(hour: number, minute: number): string[] {
  const utcHours = [(hour - 10 + 24) % 24, (hour - 11 + 24) % 24];
  return [...new Set(utcHours)]
    .sort((a, b) => a - b)
    .map((utcHour) => `${minute} ${utcHour} * * *`);
}
