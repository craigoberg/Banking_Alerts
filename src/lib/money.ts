export function formatMoney(amountMinor: number, currency = "aud"): string {
  const code = currency.trim().toUpperCase() || "AUD";
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: code,
    }).format(amountMinor / 100);
  } catch {
    const sign = amountMinor < 0 ? "-" : "";
    const abs = Math.abs(amountMinor);
    return `${sign}$${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
  }
}

export function dollarsToMinor(value: string): number | null {
  const cleaned = value.trim().replace(/[$,\s]/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const negative = cleaned.startsWith("-");
  const unsigned = negative ? cleaned.slice(1) : cleaned;
  const [whole, frac = ""] = unsigned.split(".");
  const digits = `${whole}${frac.padEnd(2, "0")}`;
  const minor = Number(digits);
  if (!Number.isSafeInteger(minor)) return null;
  return negative ? -minor : minor;
}

export type AmountTotals = {
  currency: string;
  incomeMinor: number;
  expenseMinor: number;
};

export function sumAmountTotals(rows: { amountMinor: number; currency: string }[]): AmountTotals[] {
  const totals = new Map<string, AmountTotals>();
  for (const row of rows) {
    const currency = row.currency.trim().toLowerCase() || "aud";
    const current = totals.get(currency) ?? { currency, incomeMinor: 0, expenseMinor: 0 };
    if (row.amountMinor > 0) current.incomeMinor += row.amountMinor;
    else if (row.amountMinor < 0) current.expenseMinor += row.amountMinor;
    totals.set(currency, current);
  }
  return [...totals.values()];
}

export function minorToDollarInput(amountMinor: number): string {
  const negative = amountMinor < 0;
  const abs = Math.abs(amountMinor);
  const text = `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
  return negative ? `-${text}` : text;
}
