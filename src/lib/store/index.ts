import type { Store } from "@/lib/store/contract";
import { localStore } from "@/lib/store/local";
import { supabaseStore } from "@/lib/store/supabase";

export { StoreError, searchTransactions } from "@/lib/store/contract";
export type { Store, TransactionFilter } from "@/lib/store/contract";

export async function getStore(): Promise<Store> {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return supabaseStore();
  }
  return localStore();
}
