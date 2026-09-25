import { NextResponse } from "next/server";
import { jsonError, requireUser, unauthorized } from "@/lib/http";
import { getStore } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const username = await requireUser();
    if (!username) return unauthorized();
    const body = (await request.json()) as { name?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 80) {
      return NextResponse.json({ error: "Enter a bank name." }, { status: 400 });
    }
    const bank = await (await getStore()).createBank(name);
    return NextResponse.json({ bank });
  } catch (error) {
    return jsonError(error);
  }
}
