import { decideAlert } from "@/lib/alerts";
import { ALERT_FROM, FIRST_BANK_NAME } from "@/lib/constants";
import { sydneyDate, windowFor } from "@/lib/dates";
import { deliverEmail, resolvedEmail, underThresholdEmail } from "@/lib/postmark";
import { getRedbarkClient } from "@/lib/redbark";
import { isCommonwealthInstitution } from "@/lib/redbark/mock-data";
import { RedbarkError } from "@/lib/redbark/client";
import { shouldRunScheduledPull } from "@/lib/schedule";
import { getStore } from "@/lib/store";
import type { AccountRecord, DiscoveredAccount, NewTransaction } from "@/lib/types";

export type PullResult = {
  ok: boolean;
  skipped: boolean;
  detail: string;
};

function isSampleId(id: string): boolean {
  return id.startsWith("acct_Demo");
}

export async function runDailyPull(source: "cron" | "manual"): Promise<PullResult> {
  const store = await getStore();
  const settings = await store.getSettings();
  if (
    source === "cron" &&
    !shouldRunScheduledPull(new Date(), settings.scheduleHour, settings.scheduleMinute)
  ) {
    const detail = "Skipped. The current Australia/Sydney time is outside the saved schedule.";
    console.info(`[banking-alerts] ${detail}`);
    return { ok: true, skipped: true, detail };
  }

  const today = sydneyDate();
  const window = windowFor(today, settings.pullWindowDays);
  const run = await store.startPull({ windowFrom: window.from, windowTo: window.to });
  const notes: string[] = [];
  let failed = false;

  try {
    const client = getRedbarkClient(today);
    const live = Boolean(process.env.REDBARK_API_KEY);
    const me = await client.me();
    if (me.key && !me.key.scopes.includes("data:read")) {
      throw new Error("This RedBark key does not include the data:read scope.");
    }
    if (!live) notes.push("Using sample Commonwealth Bank data.");

    const remoteAll = await client.listAccounts();
    const institutionNames = [
      ...new Set(
        remoteAll
          .map((account) => account.institution?.name)
          .filter((name): name is string => Boolean(name)),
      ),
    ];
    notes.push(
      institutionNames.length > 0
        ? `RedBark institutions: ${institutionNames.join(", ")}.`
        : "RedBark returned no accounts.",
    );
    const remote = remoteAll.filter((account) =>
      isCommonwealthInstitution(account.institution?.name, account.institution?.id),
    );
    const banks = await store.listBanks();
    const bank =
      banks.find((item) => item.name.toLowerCase() === FIRST_BANK_NAME.toLowerCase()) ??
      banks.find((item) => item.name.toLowerCase().includes("commonwealth")) ??
      null;
    const seenAt = new Date().toISOString();
    const discovered: DiscoveredAccount[] = remote.map((account) => ({
      redbarkAccountId: account.id,
      bankId: bank?.id ?? null,
      providerName: account.provider,
      institutionName: account.institution?.name ?? null,
      name: account.name,
      accountNumberMasked: account.account_number,
      currency: account.currency || "aud",
      category: account.category,
      accountType: account.type,
      status: account.status,
      lastSeenAt: seenAt,
    }));
    await store.upsertDiscovered(discovered);
    notes.push(`Saw ${remote.length} Commonwealth Bank account${remote.length === 1 ? "" : "s"}.`);

    const accounts = await store.listAccounts();
    const linked = accounts.filter((account) => {
      if (!account.redbarkAccountId) return false;
      if (live && isSampleId(account.redbarkAccountId)) return false;
      return true;
    });
    const skippedSamples = accounts.filter(
      (account) => live && account.redbarkAccountId && isSampleId(account.redbarkAccountId),
    );
    if (skippedSamples.length > 0) {
      notes.push(
        "Skipped sample links. Match each nickname to a live Commonwealth Bank account, then pull again.",
      );
    }

    const banking = linked.filter((account) => account.category !== "brokerage");
    const brokerage = linked.filter((account) => account.category === "brokerage");
    if (brokerage.length > 0) {
      notes.push(
        `${brokerage.map((account) => account.nickname).join(", ")} ${brokerage.length === 1 ? "is" : "are"} brokerage, so this pull did not request a banking balance.`,
      );
    }

    try {
      const balances = await client.balances(
        banking.map((account) => account.redbarkAccountId!).filter(Boolean),
      );
      const byRemote = new Map(balances.map((balance) => [balance.account, balance]));
      await store.insertBalances(
        banking.map((account) => {
          const balance = byRemote.get(account.redbarkAccountId!);
          return {
            accountId: account.id,
            currentAmount: balance?.current?.amount ?? null,
            availableAmount: balance?.available?.amount ?? null,
            currency: balance?.current?.currency || balance?.currency || account.currency || "aud",
            observedAt: balance?.observed_at ?? null,
            freshness: balance ? balance.freshness : "unavailable",
          };
        }),
      );
    } catch (error) {
      failed = true;
      notes.push(`Balances: ${errorMessage(error)}`);
    }

    let written = 0;
    for (const account of banking) {
      try {
        const transactions = await client.transactions(account.redbarkAccountId!, window.from, window.to);
        const rows: NewTransaction[] = transactions.map((transaction) => ({
          accountId: account.id,
          redbarkTransactionId: transaction.id,
          status: transaction.status,
          date: transaction.date,
          datetime: transaction.datetime,
          description: transaction.description,
          reference: transaction.reference,
          extendedDescription: transaction.extended_description,
          amountMinor: transaction.amount.amount,
          currency: transaction.amount.currency || account.currency || "aud",
          direction: transaction.direction,
          providerCategory: transaction.provider_category,
          category: transaction.category,
          merchantName: transaction.merchant_name,
          merchantCategoryCode: transaction.merchant_category_code,
        }));
        written += await store.upsertTransactions(rows);
      } catch (error) {
        failed = true;
        notes.push(`${account.nickname}: ${errorMessage(error)}`);
      }
    }
    notes.push(`Upserted ${written} transaction${written === 1 ? "" : "s"} from ${window.from} to ${window.to}.`);

    const alerts = await sendAlerts(store, accounts);
    notes.push(alerts.note);
    if (alerts.failed) failed = true;

    const detail = notes.join(" ");
    await store.finishPull(run.id, failed ? "error" : "success", detail);
    return { ok: !failed, skipped: false, detail };
  } catch (error) {
    const detail = [...notes, errorMessage(error)].filter(Boolean).join(" ");
    await store.finishPull(run.id, "error", detail);
    return { ok: false, skipped: false, detail };
  }
}

async function sendAlerts(
  store: Awaited<ReturnType<typeof getStore>>,
  accounts: AccountRecord[],
): Promise<{ note: string; failed: boolean }> {
  const today = sydneyDate();
  const settings = await store.getSettings();
  const cards = await store.listCards();
  const states = await store.listAlertStates();
  const stateByAccount = new Map(states.map((state) => [state.accountId, state]));
  let sent = 0;
  let logged = 0;
  const problems: string[] = [];

  for (const card of cards) {
    const account = accounts.find((item) => item.id === card.id);
    if (!account) continue;
    const previous = stateByAccount.get(card.id);
    const decision = decideAlert({
      under: card.under,
      previouslyUnder: previous?.underThreshold ?? false,
      lastAlertOn: previous?.lastAlertOn ?? null,
      today,
    });
    const now = new Date().toISOString();
    if (!decision.send || card.currentAmount === null || card.under === null) {
      if (card.under !== null) {
        await store.saveAlertState({
          accountId: card.id,
          underThreshold: card.under,
          lastAlertOn: previous?.lastAlertOn ?? null,
          lastResolvedAt: previous?.lastResolvedAt ?? null,
          updatedAt: now,
        });
      }
      continue;
    }

    const email =
      decision.kind === "resolved"
        ? resolvedEmail({
            to: settings.alertRecipient,
            nickname: card.nickname,
            bankName: card.bankName,
            currentAmount: card.currentAmount,
            currency: card.currency,
            thresholdMinor: card.thresholdMinor,
            observedAt: card.observedAt,
          })
        : underThresholdEmail({
            to: settings.alertRecipient,
            nickname: card.nickname,
            bankName: card.bankName,
            currentAmount: card.currentAmount,
            currency: card.currency,
            thresholdMinor: card.thresholdMinor,
            observedAt: card.observedAt,
          });

    try {
      const result = await deliverEmail(email);
      await store.logEmail({
        sentAt: now,
        fromAddress: ALERT_FROM,
        toAddress: email.to,
        subject: email.subject,
        body: email.text,
        delivered: result.delivered,
      });
      await store.saveAlertState({
        accountId: card.id,
        underThreshold: decision.kind === "under",
        lastAlertOn: decision.kind === "under" ? today : (previous?.lastAlertOn ?? null),
        lastResolvedAt: decision.kind === "resolved" ? now : (previous?.lastResolvedAt ?? null),
        updatedAt: now,
      });
      if (result.delivered) sent += 1;
      else logged += 1;
    } catch (error) {
      problems.push(`${card.nickname}: ${errorMessage(error)}`);
    }
  }

  const parts = [`Sent ${sent} email${sent === 1 ? "" : "s"}.`];
  if (logged > 0) {
    parts.push(
      `Logged ${logged} email${logged === 1 ? "" : "s"} because no Postmark token is set.`,
    );
  }
  if (problems.length > 0) parts.push(problems.join(" "));
  return { note: parts.join(" "), failed: problems.length > 0 };
}

function errorMessage(error: unknown): string {
  if (error instanceof RedbarkError) return error.message;
  if (error instanceof Error) return error.message;
  return "The pull failed.";
}
