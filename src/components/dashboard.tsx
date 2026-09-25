"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateLabel, formatSydney } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { AccountCard, PullRun, TransactionRow } from "@/lib/types";

type HomePayload = {
  from: string;
  to: string;
  q: string;
  accountId: string;
  cards: AccountCard[];
  transactions: TransactionRow[];
  latestPull: PullRun | null;
};

export function Dashboard() {
  const router = useRouter();
  const [accountId, setAccountId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<HomePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const timer = useRef<number | null>(null);
  const filters = useRef({ accountId: "all", from: "", to: "", q: "" });

  async function load(next: { accountId: string; from: string; to: string; q: string }) {
    filters.current = next;
    setUpdating(true);
    setError(null);
    const params = new URLSearchParams();
    if (next.accountId && next.accountId !== "all") params.set("accountId", next.accountId);
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    if (next.q) params.set("q", next.q);
    try {
      const response = await fetch(`/api/home?${params.toString()}`);
      const body = (await response.json()) as HomePayload & { error?: string };
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) {
        setError(body.error ?? "Could not load balances.");
        return;
      }
      setData(body);
      setFrom((current) => current || body.from);
      setTo((current) => current || body.to);
      filters.current = {
        ...next,
        from: next.from || body.from,
        to: next.to || body.to,
      };
    } catch {
      setError("Could not load balances.");
    } finally {
      setLoading(false);
      setUpdating(false);
    }
  }

  function schedule(next: { accountId: string; from: string; to: string; q: string }) {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void load(next);
    }, 250);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/home");
        const body = (await response.json()) as HomePayload & { error?: string };
        if (cancelled) return;
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        if (!response.ok) {
          setError(body.error ?? "Could not load balances.");
          setLoading(false);
          return;
        }
        setData(body);
        setFrom(body.from);
        setTo(body.to);
        filters.current = { accountId: "all", from: body.from, to: body.to, q: "" };
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Could not load balances.");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) return <DashboardSkeleton />;
  if (error && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not load balances</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3">
          <p className="text-sm text-alarm" role="alert">
            {error}
          </p>
          <Button onClick={() => void load(filters.current)}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  const cards = data?.cards ?? [];
  const transactions = data?.transactions ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium">Balances</h1>
        <p className="text-sm text-muted-foreground">
          A card is marked Under while that balance is under its threshold. Search checks every
          column, including the reference, merchant, and amount.
        </p>
        {data?.latestPull ? (
          <p className="text-sm text-muted-foreground">
            Last pull {formatSydney(data.latestPull.finishedAt ?? data.latestPull.startedAt)} ·{" "}
            {data.latestPull.status}
          </p>
        ) : null}
      </div>

      {cards.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No accounts yet</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
            <p>Add a bank and a nickname to start the list.</p>
            <Button render={<Link href="/accounts" />}>Add an account</Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <li key={card.id}>
              <AccountBalanceCard card={card} />
            </li>
          ))}
        </ul>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-medium">Transactions</h2>
          {updating ? <p className="text-sm text-muted-foreground">Updating…</p> : null}
        </div>
        {error ? (
          <p className="text-sm text-alarm" role="alert">
            {error}
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account">Account</Label>
            <Select
              value={accountId}
              onValueChange={(value) => {
                if (!value) return;
                setAccountId(value);
                schedule({ accountId: value, from, to, q: query });
              }}
            >
              <SelectTrigger id="account" className="w-full min-w-0">
                <SelectValue placeholder="All accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {cards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.nickname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(event) => {
                const value = event.target.value;
                setFrom(value);
                schedule({ accountId, from: value, to, q: query });
              }}
              className="h-10"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(event) => {
                const value = event.target.value;
                setTo(value);
                schedule({ accountId, from, to: value, q: query });
              }}
              className="h-10"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              value={query}
              onChange={(event) => {
                const value = event.target.value;
                setQuery(value);
                schedule({ accountId, from, to, q: value });
              }}
              placeholder="Description, reference, merchant, amount…"
              className="h-10"
            />
          </div>
        </div>

        {transactions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              {query.trim()
                ? "No transactions match that search."
                : "No transactions in this date range."}
            </CardContent>
          </Card>
        ) : (
          <>
            <ul className="flex flex-col gap-3 md:hidden">
              {transactions.map((row) => (
                <li key={row.id}>
                  <TransactionCard row={row} />
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <TransactionTable rows={transactions} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function AccountBalanceCard({ card }: { card: AccountCard }) {
  const tone =
    card.under === true ? "border-l-alarm" : card.under === false ? "border-l-ok" : "border-l-warning";
  return (
    <Card className={`border-l-4 ${tone}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle>{card.nickname}</CardTitle>
          <ThresholdMark under={card.under} />
        </div>
        <p className="text-sm text-muted-foreground">{card.bankName}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="text-2xl font-medium">
          {card.currentAmount === null ? "No balance" : formatMoney(card.currentAmount, card.currency)}
        </p>
        <p className="text-sm text-muted-foreground">
          Threshold {formatMoney(card.thresholdMinor, card.currency)}
        </p>
        {card.accountNumberMasked ? (
          <p className="text-sm text-muted-foreground">Ending {card.accountNumberMasked}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Not linked to RedBark yet</p>
        )}
        {card.freshness === "stale" || card.freshness === "unavailable" ? (
          <p className="text-sm text-warning">Balance {card.freshness}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ThresholdMark({ under }: { under: boolean | null }) {
  if (under === true) return <span className="text-sm font-medium text-alarm">Under</span>;
  if (under === false) return <span className="text-sm font-medium text-ok">Above</span>;
  return <span className="text-sm font-medium text-warning">No balance</span>;
}

function TransactionCard({ row }: { row: TransactionRow }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium">{row.description}</p>
          <Amount amount={row.amountMinor} currency={row.currency} />
        </div>
        <p className="text-sm text-muted-foreground">
          {formatDateLabel(row.date)} · {row.nickname} · {row.bankName}
        </p>
        <p className="text-sm text-muted-foreground">
          {[row.merchantName, row.reference, row.status, row.direction].filter(Boolean).join(" · ")}
        </p>
        {row.extendedDescription ? (
          <p className="text-sm text-muted-foreground">{row.extendedDescription}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function TransactionTable({ rows }: { rows: TransactionRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Account</TableHead>
          <TableHead>Bank</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead>Merchant</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{formatDateLabel(row.date)}</TableCell>
            <TableCell>{row.nickname}</TableCell>
            <TableCell>{row.bankName}</TableCell>
            <TableCell>
              <div>{row.description}</div>
              {row.extendedDescription ? (
                <div className="text-muted-foreground">{row.extendedDescription}</div>
              ) : null}
            </TableCell>
            <TableCell>{row.reference ?? "—"}</TableCell>
            <TableCell>{row.merchantName ?? "—"}</TableCell>
            <TableCell>{row.category ?? row.providerCategory ?? "—"}</TableCell>
            <TableCell>
              {[row.status, row.direction].filter(Boolean).join(" · ") || "—"}
            </TableCell>
            <TableCell className="text-right">
              <Amount amount={row.amountMinor} currency={row.currency} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Amount({ amount, currency }: { amount: number; currency: string }) {
  return (
    <span className={amount > 0 ? "text-ok" : "text-foreground"}>{formatMoney(amount, currency)}</span>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-xl bg-card" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-card" />
      <p className="sr-only">Loading balances</p>
    </div>
  );
}
