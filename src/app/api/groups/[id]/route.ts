import { NextResponse } from "next/server";
import { jsonError, requireUser, unauthorized } from "@/lib/http";
import { getStore } from "@/lib/store";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const username = await requireUser();
    if (!username) return unauthorized();
    const { id } = await context.params;
    const body = (await request.json()) as { name?: unknown; collapsed?: unknown };
    const input: { name?: string; collapsed?: boolean } = {};
    if (typeof body.name === "string") input.name = body.name;
    if (typeof body.collapsed === "boolean") input.collapsed = body.collapsed;
    const group = await (await getStore()).updateGroup(id, input);
    return NextResponse.json({ group });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const username = await requireUser();
    if (!username) return unauthorized();
    const { id } = await context.params;
    await (await getStore()).deleteGroup(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
