import { NextResponse } from "next/server";
import type { GroupLayout } from "@/lib/groups";
import { jsonError, requireUser, unauthorized } from "@/lib/http";
import { getStore } from "@/lib/store";

export async function PUT(request: Request) {
  try {
    const username = await requireUser();
    if (!username) return unauthorized();
    const body = (await request.json()) as { groups?: unknown };
    if (!Array.isArray(body.groups)) {
      return NextResponse.json({ error: "The group layout is out of date. Reload and try again." }, { status: 400 });
    }
    const layout: GroupLayout[] = body.groups.map((entry) => {
      const row = entry as { id?: unknown; accountIds?: unknown };
      return {
        id: typeof row.id === "string" ? row.id : "",
        accountIds: Array.isArray(row.accountIds)
          ? row.accountIds.filter((id): id is string => typeof id === "string")
          : [],
      };
    });
    await (await getStore()).saveGroupLayout(layout);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
