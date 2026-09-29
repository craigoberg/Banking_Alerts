import { NextResponse } from "next/server";
import { currentMonthWindow, earliestSelectableDate, formatDateLabel, sydneyDate } from "@/lib/dates";
import { jsonError, requireUser, unauthorized } from "@/lib/http";
import { getStore, searchTransactions } from "@/lib/store";

export async function GET(request: Request) {
  try {
    const username = await requireUser();
    if (!username) return unauthorized();
    const url = new URL(request.url);
    const today = sydneyDate();
    const fallback = currentMonthWindow(today);
    const from = url.searchParams.get("from") || fallback.from;
    const to = url.searchParams.get("to") || fallback.to;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return NextResponse.json({ error: "Use dates as YYYY-MM-DD." }, { status: 400 });
    }
    if (from > to) {
      return NextResponse.json({ error: "The start date is after the end date." }, { status: 400 });
    }
    const earliest = earliestSelectableDate(today);
    if (from < earliest || to < earliest) {
      return NextResponse.json(
        { error: `Choose a date on or after ${formatDateLabel(earliest)} (seven years).` },
        { status: 400 },
      );
    }
    const accountId = url.searchParams.get("accountId");
    const q = url.searchParams.get("q") ?? "";
    const store = await getStore();
    const [cards, transactions, latestPull, groups] = await Promise.all([
      store.listCards(),
      searchTransactions(store, {
        accountId: accountId && accountId !== "all" ? accountId : null,
        from,
        to,
        q,
      }),
      store.latestPull(),
      store.listGroups(),
    ]);
    return NextResponse.json({
      from,
      to,
      today,
      q,
      accountId: accountId && accountId !== "all" ? accountId : "all",
      cards,
      groups,
      transactions,
      latestPull,
    });
  } catch (error) {
    return jsonError(error);
  }
}
