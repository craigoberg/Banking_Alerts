"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ALERT_FROM, MAX_PULL_WINDOW_DAYS } from "@/lib/constants";
import { formatDateLabel, formatSydney } from "@/lib/dates";
import type { IntegrationStatus } from "@/lib/env";
import type { EmailLog, PullRun, Settings } from "@/lib/types";

type SettingsPayload = {
  settings: Settings;
  latestPull: PullRun | null;
  emails: EmailLog[];
  cron: string[];
  maxPullWindowDays: number;
  earliestDate: string;
  integrations: IntegrationStatus;
};

export function SettingsForm() {
  const router = useRouter();
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pullDetail, setPullDetail] = useState<string | null>(null);
  const [recipient, setRecipient] = useState("");
  const [time, setTime] = useState("00:00");
  const [windowDays, setWindowDays] = useState("31");

  async function load() {
    setError(null);
    try {
      const response = await fetch("/api/settings");
      const body = (await response.json()) as SettingsPayload & { error?: string };
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) {
        setError(body.error ?? "Could not load settings.");
        return;
      }
      setData(body);
      setRecipient(body.settings.alertRecipient);
      setTime(
        `${String(body.settings.scheduleHour).padStart(2, "0")}:${String(body.settings.scheduleMinute).padStart(2, "0")}`,
      );
      setWindowDays(String(body.settings.pullWindowDays));
    } catch {
      setError("Could not load settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/settings");
        const body = (await response.json()) as SettingsPayload & { error?: string };
        if (cancelled) return;
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        if (!response.ok) {
          setError(body.error ?? "Could not load settings.");
          setLoading(false);
          return;
        }
        setData(body);
        setRecipient(body.settings.alertRecipient);
        setTime(
          `${String(body.settings.scheduleHour).padStart(2, "0")}:${String(body.settings.scheduleMinute).padStart(2, "0")}`,
        );
        setWindowDays(String(body.settings.pullWindowDays));
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Could not load settings.");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-card" />
        <p className="sr-only">Loading settings</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not load settings</CardTitle>
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

  const [hourText, minuteText] = time.split(":");
  const scheduleHour = Number(hourText);
  const scheduleMinute = Number(minuteText);
  const deployedMatchesFive = scheduleHour === 5 && scheduleMinute === 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-medium">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Alerts go from {ALERT_FROM}. The daily pull uses the window saved here.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-alarm" role="alert">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Alert and schedule</CardTitle>
          <CardDescription>
            While a balance stays under its threshold, one email goes out per day. When it recovers,
            one resolved email goes out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
            onSubmit={async (event) => {
              event.preventDefault();
              setPending(true);
              setError(null);
              try {
                const response = await fetch("/api/settings", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    alertRecipient: recipient,
                    scheduleHour,
                    scheduleMinute,
                    pullWindowDays: Number(windowDays),
                  }),
                });
                const body = (await response.json()) as { error?: string; cron?: string[] };
                if (!response.ok) {
                  setError(body.error ?? "Could not save settings.");
                  return;
                }
                await load();
              } catch {
                setError("Could not save settings.");
              } finally {
                setPending(false);
              }
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="recipient">Recipient</Label>
              <Input
                id="recipient"
                type="email"
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                className="h-10"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="schedule">Time in Australia/Sydney</Label>
              <Input
                id="schedule"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="h-10"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="window">Pull window (days)</Label>
              <Input
                id="window"
                type="number"
                min={1}
                max={data?.maxPullWindowDays ?? MAX_PULL_WINDOW_DAYS}
                value={windowDays}
                onChange={(event) => setWindowDays(event.target.value)}
                className="h-10"
                required
              />
              <p className="text-sm text-muted-foreground">
                The morning pull keeps this saved window, normally 31 days. A seven-year pull is a
                separate step: raise the window
                {data?.earliestDate ? ` (back to ${formatDateLabel(data.earliestDate)})` : ""}, use
                Run pull now, then set it back to about 31 days. Choosing an older month only shows
                transactions already stored.
              </p>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={pending} className="h-10">
                {pending ? "Saving…" : "Save settings"}
              </Button>
            </div>
          </form>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>
              Vercel calls <code>/api/cron/daily</code> at{" "}
              <code>0 18 * * *</code> and <code>0 19 * * *</code> UTC. Together those hit 5:00
              in Sydney all year. The route runs only when Sydney matches the time saved here.
            </p>
            <p className="mt-2">
              Cron for this time: {(data?.cron ?? []).join(" and ") || "not loaded"}.
            </p>
            {deployedMatchesFive ? null : (
              <p className="mt-2 text-warning">
                This deployment only fires at 18:00 and 19:00 UTC, which is 5:00 in Sydney. A
                different Sydney time needs those cron expressions in vercel.json, then a redeploy.
                Run pull now still works.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pull now</CardTitle>
          <CardDescription>
            {data?.latestPull
              ? `Last pull ${formatSydney(data.latestPull.finishedAt ?? data.latestPull.startedAt)} · ${data.latestPull.status}. ${data.latestPull.detail}`
              : "No pull has run yet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3">
          <Button
            disabled={pulling}
            className="h-10"
            onClick={async () => {
              setPulling(true);
              setPullDetail(null);
              setError(null);
              try {
                const response = await fetch("/api/pull", { method: "POST" });
                const body = (await response.json()) as { detail?: string; error?: string };
                if (!response.ok) {
                  setError(body.error ?? body.detail ?? "The pull failed.");
                }
                setPullDetail(body.detail ?? body.error ?? "Pull finished.");
                await load();
              } catch {
                setError("The pull failed.");
              } finally {
                setPulling(false);
              }
            }}
          >
            {pulling ? "Pulling…" : "Run pull now"}
          </Button>
          {pullDetail ? <p className="text-sm text-muted-foreground">{pullDetail}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connections</CardTitle>
          <CardDescription>
            With nothing configured, the app uses the local sample and logs emails here instead of
            sending them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-sm">
            <StatusRow
              label="RedBark"
              on={Boolean(data?.integrations.redbark)}
              onText="Live key is set"
              offText="Sample Commonwealth Bank data"
            />
            <StatusRow
              label="Supabase"
              on={Boolean(data?.integrations.supabase)}
              onText="Sydney database is set"
              offText="Local file store"
            />
            <StatusRow
              label="Postmark"
              on={Boolean(data?.integrations.postmark)}
              onText="Emails will send"
              offText="Emails are logged, not sent"
            />
            <StatusRow
              label="Session secret"
              on={Boolean(data?.integrations.sessionSecret)}
              onText="Set"
              offText="Local development secret"
            />
            <StatusRow
              label="Cron secret"
              on={Boolean(data?.integrations.cronSecret)}
              onText="Set"
              offText="Open on this machine only"
            />
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent alert emails</CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.emails.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              None yet. A pull sends one while an account is under its threshold.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {data?.emails.map((email) => (
                <li key={email.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <p className="font-medium">{email.subject}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatSydney(email.sentAt)} · {email.fromAddress} to {email.toAddress} ·{" "}
                    {email.delivered ? "Sent" : "Logged"}
                  </p>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-muted-foreground">
                    {email.body}
                  </pre>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusRow({
  label,
  on,
  onText,
  offText,
}: {
  label: string;
  on: boolean;
  onText: string;
  offText: string;
}) {
  return (
    <li className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
      <span>{label}</span>
      <span className={on ? "text-ok" : "text-warning"}>{on ? onText : offText}</span>
    </li>
  );
}
