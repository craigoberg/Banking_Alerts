import { STARTING_GROUP_ID, STARTING_GROUP_NAME } from "@/lib/constants";
import { StoreError } from "@/lib/store/contract";
import type { AccountGroup } from "@/lib/types";

export type GroupLayout = {
  id: string;
  accountIds: string[];
};

type Membership = {
  id: string;
  groupId: string;
  sortOrder: number;
};

export function normalizeGroupName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) throw new StoreError("Enter a group name.");
  if (trimmed.length > 40) throw new StoreError("Use a shorter group name.");
  return trimmed;
}

export function assertUniqueGroupName(groups: AccountGroup[], name: string, exceptId?: string): void {
  const key = name.toLocaleLowerCase();
  if (groups.some((group) => group.id !== exceptId && group.name.toLocaleLowerCase() === key)) {
    throw new StoreError("That group name is already in use.");
  }
}

export function startingGroup(): AccountGroup {
  return {
    id: STARTING_GROUP_ID,
    name: STARTING_GROUP_NAME,
    sortOrder: 0,
    collapsed: false,
  };
}

export function orderedGroups(groups: AccountGroup[]): AccountGroup[] {
  return [...groups].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function nextSortOrder(accounts: Membership[], groupId: string): number {
  const orders = accounts.filter((account) => account.groupId === groupId).map((account) => account.sortOrder);
  if (orders.length === 0) return 0;
  return Math.max(...orders) + 1;
}

export function ensureMembership<T extends Membership>(
  groups: AccountGroup[],
  accounts: T[],
): { groups: AccountGroup[]; changed: boolean } {
  let changed = false;
  let nextGroups = groups;
  if (nextGroups.length === 0) {
    nextGroups = [startingGroup()];
    changed = true;
  }
  const known = new Set(nextGroups.map((group) => group.id));
  const fallback = orderedGroups(nextGroups)[0];
  accounts.forEach((account, index) => {
    if (!account.groupId || !known.has(account.groupId)) {
      account.groupId = fallback.id;
      changed = true;
    }
    if (typeof account.sortOrder !== "number" || Number.isNaN(account.sortOrder)) {
      account.sortOrder = index;
      changed = true;
    }
  });
  return { groups: nextGroups, changed };
}

export function applyLayout<T extends Membership>(
  groups: AccountGroup[],
  accounts: T[],
  layout: GroupLayout[],
): void {
  if (layout.length !== groups.length) {
    throw new StoreError("The group layout is out of date. Reload and try again.");
  }
  const groupIds = new Set(groups.map((group) => group.id));
  const seenGroups = new Set<string>();
  const seenAccounts = new Set<string>();
  for (const entry of layout) {
    if (!groupIds.has(entry.id) || seenGroups.has(entry.id)) {
      throw new StoreError("The group layout is out of date. Reload and try again.");
    }
    seenGroups.add(entry.id);
    if (!Array.isArray(entry.accountIds)) {
      throw new StoreError("The group layout is out of date. Reload and try again.");
    }
    for (const accountId of entry.accountIds) {
      if (typeof accountId !== "string" || seenAccounts.has(accountId)) {
        throw new StoreError("Each account can only sit in one place.");
      }
      seenAccounts.add(accountId);
    }
  }
  const accountIds = new Set(accounts.map((account) => account.id));
  if (seenAccounts.size !== accountIds.size || [...seenAccounts].some((id) => !accountIds.has(id))) {
    throw new StoreError("The group layout is out of date. Reload and try again.");
  }
  layout.forEach((entry, groupIndex) => {
    const group = groups.find((item) => item.id === entry.id);
    if (group) group.sortOrder = groupIndex;
    entry.accountIds.forEach((accountId, index) => {
      const account = accounts.find((item) => item.id === accountId);
      if (!account) return;
      account.groupId = entry.id;
      account.sortOrder = index;
    });
  });
}

export function destinationForDeletedGroup(groups: AccountGroup[], id: string): AccountGroup {
  const others = orderedGroups(groups).filter((group) => group.id !== id);
  if (others.length === 0) throw new StoreError("Keep at least one group.");
  const target = groups.find((group) => group.id === id);
  if (!target) throw new StoreError("That group is not in the list.", 404);
  return others[0];
}
