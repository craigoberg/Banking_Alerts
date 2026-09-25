import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_PULL_WINDOW_DAYS,
  DEFAULT_RECIPIENT,
  DEFAULT_SCHEDULE_HOUR,
  DEFAULT_SCHEDULE_MINUTE,
  SCHEDULE_TIMEZONE,
} from "@/lib/constants";
import { verifyPassword } from "@/lib/passwords";
import { cardsFromAccounts, StoreError, type Store } from "@/lib/store/contract";
import type {
  AccountRecord,
  AlertState,
  Bank,
  DiscoveredAccount,
  EmailLog,
  NewBalance,
  NewTransaction,
  PullRun,
  Settings,
  TransactionRow,
} from "@/lib/types";

type BankJoin = { name: string } | { name: string }[] | null;
type ThresholdJoin = { amount_minor: number } | { amount_minor: number }[] | null;

function client(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new StoreError("Supabase is not configured.", 500);
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function fail(error: { message: string; code?: string } | null, fallback: string): void {
  if (!error) return;
  if (error.code === "23505") {
    throw new StoreError("That value is already in use.");
  }
  throw new StoreError(error.message || fallback, 500);
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function dateOnly(value: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

function mapAccount(row: {
  id: string;
  bank_id: string;
  nickname: string;
  redbark_account_id: string | null;
  provider_name: string | null;
  institution_name: string | null;
  account_number_masked: string | null;
  currency: string;
  category: string | null;
  account_type: string | null;
  created_at: string;
  updated_at: string;
  banks: BankJoin;
  thresholds: ThresholdJoin;
}): AccountRecord {
  const bank = one(row.banks);
  const threshold = one(row.thresholds);
  return {
    id: row.id,
    bankId: row.bank_id,
    bankName: bank?.name ?? "",
    nickname: row.nickname,
    redbarkAccountId: row.redbark_account_id,
    providerName: row.provider_name,
    institutionName: row.institution_name,
    accountNumberMasked: row.account_number_masked,
    currency: row.currency,
    category: row.category,
    accountType: row.account_type,
    thresholdMinor: threshold?.amount_minor ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ACCOUNT_SELECT =
  "id, bank_id, nickname, redbark_account_id, provider_name, institution_name, account_number_masked, currency, category, account_type, created_at, updated_at, banks!inner(name), thresholds(amount_minor)";

function mapPull(row: {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  window_from: string | null;
  window_to: string | null;
  detail: string;
}): PullRun {
  return {
    id: row.id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    status: row.status,
    windowFrom: dateOnly(row.window_from),
    windowTo: dateOnly(row.window_to),
    detail: row.detail,
  };
}

function mapSettings(row: {
  schedule_hour: number;
  schedule_minute: number;
  schedule_timezone: string;
  alert_recipient: string;
  pull_window_days: number;
}): Settings {
  return {
    scheduleHour: row.schedule_hour,
    scheduleMinute: row.schedule_minute,
    scheduleTimezone: row.schedule_timezone,
    alertRecipient: row.alert_recipient,
    pullWindowDays: row.pull_window_days,
  };
}

export function supabaseStore(): Store {
  const db = client();
  return {
    async verifyLogin(username, password) {
      const { data, error } = await db
        .from("logins")
        .select("password_hash")
        .eq("username", username)
        .maybeSingle();
      fail(error, "Could not check the login.");
      if (!data) return false;
      return verifyPassword(password, data.password_hash as string);
    },
    async listBanks() {
      const { data, error } = await db.from("banks").select("id, name, created_at").order("name");
      fail(error, "Could not list banks.");
      return (data ?? []).map((row) => ({
        id: row.id as string,
        name: row.name as string,
        createdAt: row.created_at as string,
      }));
    },
    async createBank(name) {
      const { data, error } = await db
        .from("banks")
        .insert({ name })
        .select("id, name, created_at")
        .single();
      fail(error, "Could not add the bank.");
      return {
        id: data!.id as string,
        name: data!.name as string,
        createdAt: data!.created_at as string,
      } satisfies Bank;
    },
    async deleteBank(id) {
      const { error } = await db.from("banks").delete().eq("id", id);
      fail(error, "Could not remove the bank.");
    },
    async listAccounts() {
      const { data, error } = await db.from("accounts").select(ACCOUNT_SELECT).order("nickname");
      fail(error, "Could not list accounts.");
      return (data ?? []).map((row) => mapAccount(row as never));
    },
    async createAccount({ bankId, nickname }) {
      const { data: bank, error: bankError } = await db
        .from("banks")
        .select("id, name")
        .eq("id", bankId)
        .maybeSingle();
      fail(bankError, "Could not find that bank.");
      if (!bank) throw new StoreError("That bank is not in the list.");
      const { data, error } = await db
        .from("accounts")
        .insert({ bank_id: bankId, nickname, currency: "aud" })
        .select("id, created_at, updated_at")
        .single();
      fail(error, "Could not add the account.");
      const id = data!.id as string;
      const now = new Date().toISOString();
      const threshold = await db.from("thresholds").insert({ account_id: id, amount_minor: 0 });
      fail(threshold.error, "Could not save the threshold.");
      const alert = await db.from("alert_states").insert({
        account_id: id,
        under_threshold: false,
      });
      fail(alert.error, "Could not save the alert state.");
      return {
        id,
        bankId,
        bankName: bank.name as string,
        nickname,
        redbarkAccountId: null,
        providerName: null,
        institutionName: null,
        accountNumberMasked: null,
        currency: "aud",
        category: null,
        accountType: null,
        thresholdMinor: 0,
        createdAt: (data!.created_at as string) ?? now,
        updatedAt: (data!.updated_at as string) ?? now,
      } satisfies AccountRecord;
    },
    async updateAccount(id, input) {
      const patch: Record<string, string | null> = {
        updated_at: new Date().toISOString(),
      };
      if (input.nickname !== undefined) patch.nickname = input.nickname;
      if (input.redbarkAccountId !== undefined) {
        patch.redbark_account_id = input.redbarkAccountId;
        if (input.redbarkAccountId) {
          const { data: discovered } = await db
            .from("discovered_accounts")
            .select(
              "provider_name, institution_name, account_number_masked, currency, category, account_type",
            )
            .eq("redbark_account_id", input.redbarkAccountId)
            .maybeSingle();
          if (discovered) {
            patch.provider_name = discovered.provider_name as string | null;
            patch.institution_name = discovered.institution_name as string | null;
            patch.account_number_masked = discovered.account_number_masked as string | null;
            patch.currency = (discovered.currency as string) || "aud";
            patch.category = discovered.category as string | null;
            patch.account_type = discovered.account_type as string | null;
          }
        } else {
          patch.provider_name = null;
          patch.institution_name = null;
          patch.account_number_masked = null;
          patch.category = null;
          patch.account_type = null;
        }
      }
      const { error } = await db.from("accounts").update(patch).eq("id", id);
      if (error?.code === "23505") {
        throw new StoreError("That RedBark account is already linked to another nickname.");
      }
      fail(error, "Could not update the account.");
      if (input.thresholdMinor !== undefined) {
        const saved = await db.from("thresholds").upsert(
          {
            account_id: id,
            amount_minor: input.thresholdMinor,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "account_id" },
        );
        fail(saved.error, "Could not save the threshold.");
      }
    },
    async deleteAccount(id) {
      const { error } = await db.from("accounts").delete().eq("id", id);
      fail(error, "Could not remove the account.");
    },
    async listDiscovered() {
      const { data, error } = await db
        .from("discovered_accounts")
        .select(
          "redbark_account_id, bank_id, provider_name, institution_name, name, account_number_masked, currency, category, account_type, status, last_seen_at",
        )
        .order("name");
      fail(error, "Could not list RedBark accounts.");
      return (data ?? []).map(
        (row) =>
          ({
            redbarkAccountId: row.redbark_account_id as string,
            bankId: row.bank_id as string | null,
            providerName: row.provider_name as string | null,
            institutionName: row.institution_name as string | null,
            name: row.name as string,
            accountNumberMasked: row.account_number_masked as string | null,
            currency: row.currency as string,
            category: row.category as string | null,
            accountType: row.account_type as string | null,
            status: row.status as string | null,
            lastSeenAt: row.last_seen_at as string,
          }) satisfies DiscoveredAccount,
      );
    },
    async upsertDiscovered(rows) {
      if (rows.length === 0) return;
      const { error } = await db.from("discovered_accounts").upsert(
        rows.map((row) => ({
          redbark_account_id: row.redbarkAccountId,
          bank_id: row.bankId,
          provider_name: row.providerName,
          institution_name: row.institutionName,
          name: row.name,
          account_number_masked: row.accountNumberMasked,
          currency: row.currency,
          category: row.category,
          account_type: row.accountType,
          status: row.status,
          last_seen_at: row.lastSeenAt,
        })),
        { onConflict: "redbark_account_id" },
      );
      fail(error, "Could not store the RedBark accounts.");
    },
    async getSettings() {
      const { data, error } = await db.from("settings").select("*").eq("id", 1).maybeSingle();
      fail(error, "Could not read settings.");
      if (!data) {
        const inserted = await db
          .from("settings")
          .insert({
            id: 1,
            schedule_hour: DEFAULT_SCHEDULE_HOUR,
            schedule_minute: DEFAULT_SCHEDULE_MINUTE,
            schedule_timezone: SCHEDULE_TIMEZONE,
            alert_recipient: DEFAULT_RECIPIENT,
            pull_window_days: DEFAULT_PULL_WINDOW_DAYS,
          })
          .select("*")
          .single();
        fail(inserted.error, "Could not save settings.");
        return mapSettings(inserted.data as never);
      }
      return mapSettings(data as never);
    },
    async updateSettings(input) {
      const patch: Record<string, string | number> = {};
      if (input.scheduleHour !== undefined) patch.schedule_hour = input.scheduleHour;
      if (input.scheduleMinute !== undefined) patch.schedule_minute = input.scheduleMinute;
      if (input.alertRecipient !== undefined) patch.alert_recipient = input.alertRecipient;
      if (input.pullWindowDays !== undefined) patch.pull_window_days = input.pullWindowDays;
      const { data, error } = await db.from("settings").update(patch).eq("id", 1).select("*").single();
      fail(error, "Could not save settings.");
      return mapSettings(data as never);
    },
    async listCards() {
      const accounts = await this.listAccounts();
      const { data, error } = await db
        .from("account_latest_balances")
        .select("account_id, current_amount, available_amount, freshness, observed_at");
      fail(error, "Could not read balances.");
      const balances = new Map(
        (data ?? []).map((row) => [
          row.account_id as string,
          {
            currentAmount: row.current_amount as number | null,
            availableAmount: row.available_amount as number | null,
            freshness: row.freshness as string | null,
            observedAt: row.observed_at as string | null,
          },
        ]),
      );
      return cardsFromAccounts(accounts, balances).sort((a, b) =>
        a.nickname.localeCompare(b.nickname),
      );
    },
    async listTransactions(filter) {
      let query = db
        .from("transactions")
        .select(
          "id, account_id, redbark_transaction_id, status, posted_on, description, reference, extended_description, amount_minor, currency, direction, provider_category, category, merchant_name, merchant_category_code, accounts!inner(nickname, banks!inner(name))",
        )
        .gte("posted_on", filter.from)
        .lte("posted_on", filter.to)
        .order("posted_on", { ascending: false })
        .limit(5000);
      if (filter.accountId) query = query.eq("account_id", filter.accountId);
      const { data, error } = await query;
      fail(error, "Could not list transactions.");
      return (data ?? []).map((row) => {
        const account = one(row.accounts as { nickname: string; banks: BankJoin } | { nickname: string; banks: BankJoin }[]);
        const bank = one(account?.banks ?? null);
        return {
          id: row.id as string,
          accountId: row.account_id as string,
          nickname: account?.nickname ?? "",
          bankName: bank?.name ?? "",
          date: dateOnly(row.posted_on as string) ?? "",
          description: row.description as string,
          reference: row.reference as string | null,
          extendedDescription: row.extended_description as string | null,
          merchantName: row.merchant_name as string | null,
          category: row.category as string | null,
          providerCategory: row.provider_category as string | null,
          merchantCategoryCode: row.merchant_category_code as string | null,
          amountMinor: row.amount_minor as number,
          currency: row.currency as string,
          direction: row.direction as string | null,
          status: row.status as string | null,
          redbarkTransactionId: row.redbark_transaction_id as string,
        } satisfies TransactionRow;
      });
    },
    async insertBalances(rows: NewBalance[]) {
      if (rows.length === 0) return;
      const { error } = await db.from("balances").insert(
        rows.map((row) => ({
          account_id: row.accountId,
          current_amount: row.currentAmount,
          available_amount: row.availableAmount,
          currency: row.currency,
          observed_at: row.observedAt,
          freshness: row.freshness,
        })),
      );
      fail(error, "Could not store balances.");
    },
    async upsertTransactions(rows: NewTransaction[]) {
      if (rows.length === 0) return 0;
      const { error } = await db.from("transactions").upsert(
        rows.map((row) => ({
          account_id: row.accountId,
          redbark_transaction_id: row.redbarkTransactionId,
          status: row.status,
          posted_on: row.date,
          transacted_at: row.datetime,
          description: row.description,
          reference: row.reference,
          extended_description: row.extendedDescription,
          amount_minor: row.amountMinor,
          currency: row.currency,
          direction: row.direction,
          provider_category: row.providerCategory,
          category: row.category,
          merchant_name: row.merchantName,
          merchant_category_code: row.merchantCategoryCode,
        })),
        { onConflict: "redbark_transaction_id" },
      );
      fail(error, "Could not store transactions.");
      return rows.length;
    },
    async listAlertStates() {
      const { data, error } = await db.from("alert_states").select("*");
      fail(error, "Could not read alert state.");
      return (data ?? []).map(
        (row) =>
          ({
            accountId: row.account_id as string,
            underThreshold: row.under_threshold as boolean,
            lastAlertOn: dateOnly(row.last_alert_on as string | null),
            lastResolvedAt: row.last_resolved_at as string | null,
            updatedAt: row.updated_at as string,
          }) satisfies AlertState,
      );
    },
    async saveAlertState(state) {
      const { error } = await db.from("alert_states").upsert(
        {
          account_id: state.accountId,
          under_threshold: state.underThreshold,
          last_alert_on: state.lastAlertOn,
          last_resolved_at: state.lastResolvedAt,
          updated_at: state.updatedAt,
        },
        { onConflict: "account_id" },
      );
      fail(error, "Could not save alert state.");
    },
    async logEmail(entry) {
      const { error } = await db.from("email_log").insert({
        sent_at: entry.sentAt,
        from_address: entry.fromAddress,
        to_address: entry.toAddress,
        subject: entry.subject,
        body: entry.body,
        delivered: entry.delivered,
      });
      fail(error, "Could not record the email.");
    },
    async listEmails(limit) {
      const { data, error } = await db
        .from("email_log")
        .select("id, sent_at, from_address, to_address, subject, body, delivered")
        .order("sent_at", { ascending: false })
        .limit(limit);
      fail(error, "Could not list emails.");
      return (data ?? []).map(
        (row) =>
          ({
            id: row.id as string,
            sentAt: row.sent_at as string,
            fromAddress: row.from_address as string,
            toAddress: row.to_address as string,
            subject: row.subject as string,
            body: row.body as string,
            delivered: row.delivered as boolean,
          }) satisfies EmailLog,
      );
    },
    async startPull(input) {
      const { data, error } = await db
        .from("pull_runs")
        .insert({
          status: "running",
          window_from: input.windowFrom,
          window_to: input.windowTo,
          detail: "",
        })
        .select("*")
        .single();
      fail(error, "Could not start the pull.");
      return mapPull(data as never);
    },
    async finishPull(id, status, detail) {
      const { error } = await db
        .from("pull_runs")
        .update({ status, detail, finished_at: new Date().toISOString() })
        .eq("id", id);
      fail(error, "Could not finish the pull.");
    },
    async latestPull() {
      const { data, error } = await db
        .from("pull_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      fail(error, "Could not read the last pull.");
      return data ? mapPull(data as never) : null;
    },
  };
}
