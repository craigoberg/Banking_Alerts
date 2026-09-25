import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";
import { readSession } from "@/lib/session";
import { StoreError } from "@/lib/store";

export async function requireUser(): Promise<string | null> {
  const jar = await cookies();
  const session = readSession(jar.get(SESSION_COOKIE)?.value);
  return session?.username ?? null;
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof StoreError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return NextResponse.json({ error: message }, { status: 500 });
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Sign in required." }, { status: 401 });
}

export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (secret) return header === `Bearer ${secret}`;
  return process.env.NODE_ENV !== "production";
}
