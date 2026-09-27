"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { describeMonthScroller, stepMonth } from "@/lib/dates";

export function MonthScroller({
  from,
  to,
  today,
  onChange,
}: {
  from: string;
  to: string;
  today: string;
  onChange: (from: string, to: string) => void;
}) {
  const state = describeMonthScroller(from, to, today);
  return (
    <div className="flex flex-col gap-1.5">
      <Label id="month-label">Month</Label>
      <div className="flex h-10 items-center gap-1 rounded-lg border border-input bg-transparent px-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Previous month"
          disabled={!state.canGoPrevious}
          onClick={() => {
            const next = stepMonth(from, today, -1);
            if (next) onChange(next.from, next.to);
          }}
        >
          <ChevronLeft />
        </Button>
        <span
          id="month-value"
          data-month-label={state.label}
          className="min-w-0 flex-1 truncate text-center text-sm"
          title={state.label}
          aria-live="polite"
        >
          {state.label}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Next month"
          disabled={!state.canGoNext}
          onClick={() => {
            const next = stepMonth(from, today, 1);
            if (next) onChange(next.from, next.to);
          }}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
