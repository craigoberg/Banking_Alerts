import { NextResponse } from "next/server";
import { jsonError, requireUser, unauthorized } from "@/lib/http";
import { getStore } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const username = await requireUser();
    if (!username) return unauthorized();
    const body = (await request.json()) as { name?: unknown };
    const name = typeof body.name === "string" ? body.name : "";
    const group = await (await getStore()).createGroup(name);
    return NextResponse.json({ group });
  } catch (error) {
    return jsonError(error);
  }
}
