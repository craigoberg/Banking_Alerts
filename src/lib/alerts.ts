export type AlertDecision =
  | { kind: "under"; send: boolean }
  | { kind: "resolved"; send: boolean }
  | { kind: "none"; send: false };

export function isUnderThreshold(
  currentAmount: number | null,
  thresholdMinor: number,
): boolean | null {
  if (currentAmount === null) return null;
  return currentAmount < thresholdMinor;
}

export function decideAlert(input: {
  under: boolean | null;
  previouslyUnder: boolean;
  lastAlertOn: string | null;
  today: string;
}): AlertDecision {
  if (input.under === null) return { kind: "none", send: false };
  if (input.under) {
    return { kind: "under", send: input.lastAlertOn !== input.today };
  }
  if (input.previouslyUnder) return { kind: "resolved", send: true };
  return { kind: "none", send: false };
}
