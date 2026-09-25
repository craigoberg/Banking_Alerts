import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/http";
import { runDailyPull } from "@/lib/pull";

export const maxDuration = 300;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runDailyPull("cron");
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
