import { NextResponse } from "next/server";
import { dollarsToMinor } from "@/lib/money";
import { jsonError, requireUser, unauthorized } from "@/lib/http";
import { getStore } from "@/lib/store";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const username = await requireUser();
    if (!username) return unauthorized();
    const { id } = await context.params;
    const body = (await request.json()) as {
      nickname?: unknown;
      threshold?: unknown;
      redbarkAccountId?: unknown;
    };
    const input: {
      nickname?: string;
      thresholdMinor?: number;
      redbarkAccountId?: string | null;
    } = {};
    if (body.nickname !== undefined) {
      const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";
      if (!nickname || nickname.length > 80) {
        return NextResponse.json({ error: "Enter a nickname." }, { status: 400 });
      }
      input.nickname = nickname;
    }
    if (body.threshold !== undefined) {
      const threshold = typeof body.threshold === "string" ? dollarsToMinor(body.threshold) : null;
      if (threshold === null) {
        return NextResponse.json(
          { error: "Enter the threshold in dollars, such as 400.00." },
          { status: 400 },
        );
      }
      input.thresholdMinor = threshold;
    }
    if (body.redbarkAccountId !== undefined) {
      if (body.redbarkAccountId === null || body.redbarkAccountId === "") {
        input.redbarkAccountId = null;
      } else if (typeof body.redbarkAccountId === "string") {
        input.redbarkAccountId = body.redbarkAccountId;
      } else {
        return NextResponse.json({ error: "Choose a RedBark account." }, { status: 400 });
      }
    }
    await (await getStore()).updateAccount(id, input);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const username = await requireUser();
    if (!username) return unauthorized();
    const { id } = await context.params;
    await (await getStore()).deleteAccount(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
