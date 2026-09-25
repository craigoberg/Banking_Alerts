"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { minorToDollarInput } from "@/lib/money";
import type { AccountRecord, Bank, DiscoveredAccount } from "@/lib/types";

type ManagePayload = {
  banks: Bank[];
  accounts: AccountRecord[];
  discovered: DiscoveredAccount[];
};

export function AccountsManager() {
  const router = useRouter();
  const [data, setData] = useState<ManagePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bankName, setBankName] = useState("");
  const [nickname, setNickname] = useState("");
  const [bankId, setBankId] = useState("");
  const [pending, setPending] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ kind: "bank" | "account"; id: string; name: string } | null>(
    null,
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/manage");
      const body = (await response.json()) as ManagePayload & { error?: string };
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) {
        setError(body.error ?? "Could not load accounts.");
        return;
      }
      setData(body);
      setBankId((current) => current || body.banks[0]?.id || "");
    } catch {
      setError("Could not load accounts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/manage");
        const body = (await response.json()) as ManagePayload & { error?: string };
        if (cancelled) return;
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        if (!response.ok) {
          setError(body.error ?? "Could not load accounts.");
          setLoading(false);
          return;
        }
        setData(body);
        setBankId((current) => current || body.banks[0]?.id || "");
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Could not load accounts.");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function submit(url: string, init: RequestInit) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Could not save that change.");
        return false;
      }
      await load();
      return true;
    } catch {
      setError("Could not save that change.");
      return false;
    } finally {
      setPending(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-card" />
        <p className="sr-only">Loading accounts</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not load accounts</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3">
          <p className="text-sm text-alarm" role="alert">
            {error}
          </p>
          <Button onClick={() => void load()}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  const banks = data?.banks ?? [];
  const accounts = data?.accounts ?? [];
  const discovered = data?.discovered ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-medium">Accounts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Banks and nicknames are records. Rename them, remove them, or match a nickname to a
          Commonwealth Bank account after a pull.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-alarm" role="alert">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Banks</CardTitle>
          <CardDescription>Commonwealth Bank is the first one. More can be added later.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {banks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No banks yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {banks.map((bank) => (
                <li key={bank.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                  <span>{bank.name}</span>
                  <Button
                    variant="ghost"
                    onClick={() => setRemoveTarget({ kind: "bank", id: bank.id, name: bank.name })}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/banks", {
                method: "POST",
                body: JSON.stringify({ name: bankName }),
              }).then((saved) => {
                if (saved) setBankName("");
              });
            }}
          >
            <Label htmlFor="bank-name" className="sr-only">
              Bank name
            </Label>
            <Input
              id="bank-name"
              value={bankName}
              onChange={(event) => setBankName(event.target.value)}
              placeholder="Bank name"
              className="h-10"
            />
            <Button type="submit" disabled={pending} className="h-10">
              Add bank
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add a nickname</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              void submit("/api/accounts", {
                method: "POST",
                body: JSON.stringify({ bankId, nickname }),
              }).then((saved) => {
                if (saved) setNickname("");
              });
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-bank">Bank</Label>
              <Select
                value={bankId || null}
                onValueChange={(value) => {
                  if (value) setBankId(value);
                }}
              >
                <SelectTrigger id="new-bank" className="w-full">
                  <SelectValue placeholder="Choose a bank" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-nickname">Nickname</Label>
              <Input
                id="new-nickname"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                className="h-10"
              />
            </div>
            <Button type="submit" disabled={pending || banks.length === 0} className="h-10">
              Add account
            </Button>
          </form>
        </CardContent>
      </Card>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No nicknames yet. House, Bills, MasterCard, Shares, Finley, Killian, and Alfred are the
            starting set when the local sample is in use.
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {accounts.map((account) => (
            <li key={account.id}>
              <AccountEditor
                key={`${account.id}:${account.updatedAt}:${account.nickname}:${account.thresholdMinor}:${account.redbarkAccountId ?? ""}`}
                account={account}
                discovered={discovered}
                pending={pending}
                onSave={(body) =>
                  void submit(`/api/accounts/${account.id}`, {
                    method: "PATCH",
                    body: JSON.stringify(body),
                  })
                }
                onRemove={() =>
                  setRemoveTarget({ kind: "account", id: account.id, name: account.nickname })
                }
              />
            </li>
          ))}
        </ul>
      )}

      <Dialog open={Boolean(removeTarget)} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {removeTarget?.name}?</DialogTitle>
            <DialogDescription>
              {removeTarget?.kind === "bank"
                ? "This removes the bank and every nickname on it, including stored transactions."
                : "This removes the nickname, its threshold, and its stored transactions."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                if (!removeTarget) return;
                const url =
                  removeTarget.kind === "bank"
                    ? `/api/banks/${removeTarget.id}`
                    : `/api/accounts/${removeTarget.id}`;
                void submit(url, { method: "DELETE" }).then(() => setRemoveTarget(null));
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AccountEditor({
  account,
  discovered,
  pending,
  onSave,
  onRemove,
}: {
  account: AccountRecord;
  discovered: DiscoveredAccount[];
  pending: boolean;
  onSave: (body: { nickname: string; threshold: string; redbarkAccountId: string | null }) => void;
  onRemove: () => void;
}) {
  const [nickname, setNickname] = useState(account.nickname);
  const [threshold, setThreshold] = useState(minorToDollarInput(account.thresholdMinor));
  const [redbarkAccountId, setRedbarkAccountId] = useState(account.redbarkAccountId ?? "");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{account.nickname}</CardTitle>
        <CardDescription>{account.bankName}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid grid-cols-1 gap-3 lg:grid-cols-4 lg:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            onSave({
              nickname,
              threshold,
              redbarkAccountId: redbarkAccountId || null,
            });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`nick-${account.id}`}>Nickname</Label>
            <Input
              id={`nick-${account.id}`}
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              className="h-10"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`threshold-${account.id}`}>Threshold (AUD)</Label>
            <Input
              id={`threshold-${account.id}`}
              inputMode="decimal"
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
              className="h-10"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`link-${account.id}`}>RedBark account</Label>
            <Select
              value={redbarkAccountId || "none"}
              onValueChange={(value) => {
                if (value) setRedbarkAccountId(value === "none" ? "" : value);
              }}
            >
              <SelectTrigger id={`link-${account.id}`} className="w-full">
                <SelectValue placeholder="Not linked" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not linked</SelectItem>
                {account.redbarkAccountId &&
                !discovered.some((row) => row.redbarkAccountId === account.redbarkAccountId) ? (
                  <SelectItem value={account.redbarkAccountId}>
                    Linked · {account.redbarkAccountId}
                  </SelectItem>
                ) : null}
                {discovered.map((row) => (
                  <SelectItem key={row.redbarkAccountId} value={row.redbarkAccountId}>
                    {row.name}
                    {row.accountNumberMasked ? ` · ${row.accountNumberMasked}` : ""} · {row.redbarkAccountId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending} className="h-10">
              Save
            </Button>
            <Button type="button" variant="ghost" className="h-10" onClick={onRemove}>
              Remove
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
