import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";
import { jsonError } from "@/lib/http";
import { createSession } from "@/lib/session";
import { getStore } from "@/lib/store";

export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = (await request.json()) as { username?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ error: "Enter a username and password." }, { status: 400 });
  }
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!username || !password) {
    return NextResponse.json({ error: "Enter a username and password." }, { status: 400 });
  }
  try {
    const store = await getStore();
    const ok = await store.verifyLogin(username, password);
    if (!ok) {
      return NextResponse.json(
        { error: "That username and password do not match." },
        { status: 401 },
      );
    }
    const response = NextResponse.json({ username });
    response.cookies.set(SESSION_COOKIE, createSession(username), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
