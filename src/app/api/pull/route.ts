import { NextResponse } from "next/server";
import { jsonError, requireUser, unauthorized } from "@/lib/http";
import { runDailyPull } from "@/lib/pull";

export const maxDuration = 300;

export async function POST() {
  try {
    const username = await requireUser();
    if (!username) return unauthorized();
    const result = await runDailyPull("manual");
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    return jsonError(error);
  }
}
