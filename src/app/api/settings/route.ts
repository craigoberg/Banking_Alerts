import { NextResponse } from "next/server";
import { MAX_PULL_WINDOW_DAYS } from "@/lib/constants";
import { integrationStatus } from "@/lib/env";
import { jsonError, requireUser, unauthorized } from "@/lib/http";
import { cronExpressionsForSydneyHour } from "@/lib/schedule";
import { getStore } from "@/lib/store";

export async function GET() {
  try {
    const username = await requireUser();
    if (!username) return unauthorized();
    const store = await getStore();
    const [settings, latestPull, emails] = await Promise.all([
      store.getSettings(),
      store.latestPull(),
      store.listEmails(8),
    ]);
    return NextResponse.json({
      settings,
      latestPull,
      emails,
      cron: cronExpressionsForSydneyHour(settings.scheduleHour, settings.scheduleMinute),
      integrations: integrationStatus(),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const username = await requireUser();
    if (!username) return unauthorized();
    const body = (await request.json()) as {
      alertRecipient?: unknown;
      scheduleHour?: unknown;
      scheduleMinute?: unknown;
      pullWindowDays?: unknown;
    };
    const alertRecipient =
      typeof body.alertRecipient === "string" ? body.alertRecipient.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alertRecipient)) {
      return NextResponse.json({ error: "Enter a recipient email address." }, { status: 400 });
    }
    const scheduleHour = Number(body.scheduleHour);
    const scheduleMinute = Number(body.scheduleMinute);
    const pullWindowDays = Number(body.pullWindowDays);
    if (!Number.isInteger(scheduleHour) || scheduleHour < 0 || scheduleHour > 23) {
      return NextResponse.json({ error: "Choose an hour from 0 to 23." }, { status: 400 });
    }
    if (!Number.isInteger(scheduleMinute) || scheduleMinute < 0 || scheduleMinute > 59) {
      return NextResponse.json({ error: "Choose a minute from 0 to 59." }, { status: 400 });
    }
    if (
      !Number.isInteger(pullWindowDays) ||
      pullWindowDays < 1 ||
      pullWindowDays > MAX_PULL_WINDOW_DAYS
    ) {
      return NextResponse.json(
        { error: `The pull window must be between 1 and ${MAX_PULL_WINDOW_DAYS} days.` },
        { status: 400 },
      );
    }
    const store = await getStore();
    const settings = await store.updateSettings({
      alertRecipient,
      scheduleHour,
      scheduleMinute,
      pullWindowDays,
    });
    return NextResponse.json({
      settings,
      cron: cronExpressionsForSydneyHour(settings.scheduleHour, settings.scheduleMinute),
    });
  } catch (error) {
    return jsonError(error);
  }
}
