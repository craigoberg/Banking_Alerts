import { NextResponse } from "next/server";
import { jsonError, requireUser, unauthorized } from "@/lib/http";
import { getStore } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const username = await requireUser();
    if (!username) return unauthorized();
    const body = (await request.json()) as { bankId?: unknown; nickname?: unknown };
    const bankId = typeof body.bankId === "string" ? body.bankId : "";
    const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";
    if (!bankId || !nickname || nickname.length > 80) {
      return NextResponse.json({ error: "Choose a bank and enter a nickname." }, { status: 400 });
    }
    const account = await (await getStore()).createAccount({ bankId, nickname });
    return NextResponse.json({ account });
  } catch (error) {
    return jsonError(error);
  }
}
