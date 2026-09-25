import { addDays } from "@/lib/dates";
import {
  MOCK_ACCOUNTS,
  MOCK_INSTITUTION,
  transactionsInWindow,
} from "@/lib/redbark/mock-data";
import type {
  RedbarkAccountItem,
  RedbarkBalance,
  RedbarkMe,
  RedbarkTransaction,
} from "@/lib/redbark/types";

function accountItem(spec: (typeof MOCK_ACCOUNTS)[number]): RedbarkAccountItem {
  return {
    id: spec.redbarkAccountId,
    object: "account_item",
    connection: "conn_DemoCba0001",
    provider: "fiskil",
    category: "banking",
    name: spec.nickname,
    type: spec.accountType,
    institution: MOCK_INSTITUTION,
    account_number: spec.accountNumberMasked,
    currency: "aud",
    status: "open",
    last_updated_at: new Date().toISOString(),
    livemode: true,
  };
}

export function createMockClient(today: string) {
  return {
    async me(): Promise<RedbarkMe> {
      return {
        id: "acc_demo",
        timezone: "Australia/Sydney",
        key: {
          id: "key_demo",
          name: "local-sample",
          scopes: ["data:read"],
          legacy: false,
        },
      };
    },
    async listCommonwealthAccounts(): Promise<RedbarkAccountItem[]> {
      return MOCK_ACCOUNTS.map(accountItem);
    },
    async balances(accountIds: string[]): Promise<RedbarkBalance[]> {
      return accountIds.flatMap((id) => {
        const spec = MOCK_ACCOUNTS.find((account) => account.redbarkAccountId === id);
        if (!spec) return [];
        return [
          {
            object: "balance" as const,
            account: id,
            current: { amount: spec.currentAmount, currency: "aud" },
            available: { amount: spec.availableAmount, currency: "aud" },
            currency: "aud",
            observed_at: new Date().toISOString(),
            freshness: "fresh" as const,
            livemode: true,
          },
        ];
      });
    },
    async transactions(
      accountId: string,
      from: string,
      to: string,
    ): Promise<RedbarkTransaction[]> {
      const spec = MOCK_ACCOUNTS.find((account) => account.redbarkAccountId === accountId);
      if (!spec) return [];
      return transactionsInWindow(today, from, to)
        .filter((row) => row.nickname === spec.nickname)
        .map((row) => ({
          id: row.redbarkTransactionId,
          object: "transaction" as const,
          account: accountId,
          status: row.status,
          date: row.date,
          datetime: null,
          description: row.description,
          reference: row.reference,
          extended_description: row.extendedDescription,
          amount: { amount: row.amountMinor, currency: "aud" },
          direction: row.direction,
          provider_category: row.providerCategory,
          category: row.category,
          merchant_name: row.merchantName,
          merchant_category_code: row.merchantCategoryCode,
          livemode: true,
        }));
    },
  };
}

export function sampleDate(today: string, dayOffset: number): string {
  return addDays(today, dayOffset);
}
