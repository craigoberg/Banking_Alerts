import { REDBARK_BASE, REDBARK_VERSION } from "@/lib/constants";
import { isCommonwealthInstitution } from "@/lib/redbark/mock-data";
import type {
  RedbarkAccountItem,
  RedbarkBalance,
  RedbarkList,
  RedbarkMe,
  RedbarkTransaction,
} from "@/lib/redbark/types";

export class RedbarkError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

function versionHeader(): string {
  return process.env.REDBARK_VERSION || REDBARK_VERSION;
}

async function redbarkFetch<T>(url: string, key: string, allowRetry = true): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${key}`,
      "Redbark-Version": versionHeader(),
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = null;
    }
  }
  if (!response.ok) {
    const record = body as { error?: { message?: string; code?: string } } | null;
    const message = record?.error?.message || `RedBark returned ${response.status}`;
    const error = new RedbarkError(message, response.status, record?.error?.code);
    if (response.status === 429 && allowRetry) {
      const retryAfter = Number(response.headers.get("retry-after"));
      if (Number.isFinite(retryAfter) && retryAfter > 0 && retryAfter <= 20) {
        await sleep(retryAfter * 1000);
        return redbarkFetch<T>(url, key, false);
      }
    }
    throw error;
  }
  return body as T;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listPages<T>(firstUrl: string, key: string): Promise<T[]> {
  const rows: T[] = [];
  let url: string | null = firstUrl;
  let pages = 0;
  while (url) {
    if (pages > 0) await sleep(2000);
    const page: RedbarkList<T> = await redbarkFetch(url, key);
    rows.push(...page.data);
    url = page.next_page_url;
    pages += 1;
    if (pages > 50) break;
  }
  return rows;
}

export function createLiveClient(key: string) {
  return {
    async me(): Promise<RedbarkMe> {
      return redbarkFetch<RedbarkMe>(`${REDBARK_BASE}/me`, key);
    },
    async listAccounts(): Promise<RedbarkAccountItem[]> {
      return listPages<RedbarkAccountItem>(`${REDBARK_BASE}/accounts?limit=100`, key);
    },
    async listCommonwealthAccounts(): Promise<RedbarkAccountItem[]> {
      const accounts = await this.listAccounts();
      return accounts.filter((account) =>
        isCommonwealthInstitution(account.institution?.name, account.institution?.id),
      );
    },
    async balances(accountIds: string[]): Promise<RedbarkBalance[]> {
      if (accountIds.length === 0) return [];
      const params = new URLSearchParams();
      for (const id of accountIds.slice(0, 100)) params.append("account", id);
      const list = await redbarkFetch<RedbarkList<RedbarkBalance>>(
        `${REDBARK_BASE}/balances?${params.toString()}`,
        key,
      );
      return list.data;
    },
    async transactions(
      accountId: string,
      from: string,
      to: string,
    ): Promise<RedbarkTransaction[]> {
      const params = new URLSearchParams({
        account: accountId,
        from,
        to,
        limit: "100",
        include_pending: "true",
      });
      return listPages<RedbarkTransaction>(
        `${REDBARK_BASE}/transactions?${params.toString()}`,
        key,
      );
    },
  };
}
