import { formatMoney } from "@/lib/money";
import type { TransactionRow } from "@/lib/types";

export function transactionSearchText(row: TransactionRow): string {
  const signed = formatMoney(row.amountMinor, row.currency);
  const absolute = formatMoney(Math.abs(row.amountMinor), row.currency);
  return [
    row.nickname,
    row.bankName,
    row.date,
    row.description,
    row.reference,
    row.extendedDescription,
    row.merchantName,
    row.category,
    row.providerCategory,
    row.merchantCategoryCode,
    row.direction,
    row.status,
    row.redbarkTransactionId,
    row.currency,
    String(row.amountMinor),
    signed,
    absolute,
  ]
    .filter((part) => part)
    .join(" ")
    .toLowerCase();
}

export function filterTransactions(rows: TransactionRow[], query: string): TransactionRow[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) => transactionSearchText(row).includes(needle));
}
