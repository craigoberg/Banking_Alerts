import { sydneyDate } from "@/lib/dates";
import { createLiveClient } from "@/lib/redbark/client";
import { createMockClient } from "@/lib/redbark/mock";

export type RedbarkClient = ReturnType<typeof createLiveClient>;

export function getRedbarkClient(today = sydneyDate()): RedbarkClient {
  const key = process.env.REDBARK_API_KEY;
  if (!key) return createMockClient(today);
  return createLiveClient(key);
}
