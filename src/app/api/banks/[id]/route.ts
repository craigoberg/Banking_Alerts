import { jsonError, requireUser, unauthorized } from "@/lib/http";
import { getStore } from "@/lib/store";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const username = await requireUser();
    if (!username) return unauthorized();
    const { id } = await context.params;
    await (await getStore()).deleteBank(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
