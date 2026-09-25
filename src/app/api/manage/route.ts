import { NextResponse } from "next/server";
import { jsonError, requireUser, unauthorized } from "@/lib/http";
import { getStore } from "@/lib/store";

export async function GET() {
  try {
    const username = await requireUser();
    if (!username) return unauthorized();
    const store = await getStore();
    const [banks, accounts, discovered] = await Promise.all([
      store.listBanks(),
      store.listAccounts(),
      store.listDiscovered(),
    ]);
    return NextResponse.json({ banks, accounts, discovered });
  } catch (error) {
    return jsonError(error);
  }
}
