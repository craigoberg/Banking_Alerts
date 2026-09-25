import { ALERT_FROM } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import { formatSydney } from "@/lib/dates";

export type AlertEmail = {
  to: string;
  subject: string;
  text: string;
};

export function underThresholdEmail(input: {
  to: string;
  nickname: string;
  bankName: string;
  currentAmount: number;
  currency: string;
  thresholdMinor: number;
  observedAt: string | null;
}): AlertEmail {
  const balance = formatMoney(input.currentAmount, input.currency);
  const threshold = formatMoney(input.thresholdMinor, input.currency);
  return {
    to: input.to,
    subject: `${input.nickname} is under its balance threshold`,
    text: [
      `${input.nickname} is under its balance threshold.`,
      "",
      `${input.bankName} · ${input.nickname}`,
      `Balance: ${balance}`,
      `Threshold: ${threshold}`,
      `Observed: ${formatSydney(input.observedAt)}`,
      "",
      "This note is sent once a day while the balance stays under the line.",
    ].join("\n"),
  };
}

export function resolvedEmail(input: {
  to: string;
  nickname: string;
  bankName: string;
  currentAmount: number;
  currency: string;
  thresholdMinor: number;
  observedAt: string | null;
}): AlertEmail {
  const balance = formatMoney(input.currentAmount, input.currency);
  const threshold = formatMoney(input.thresholdMinor, input.currency);
  return {
    to: input.to,
    subject: `${input.nickname} is back above its balance threshold`,
    text: [
      `${input.nickname} is back above its balance threshold.`,
      "",
      `${input.bankName} · ${input.nickname}`,
      `Balance: ${balance}`,
      `Threshold: ${threshold}`,
      `Observed: ${formatSydney(input.observedAt)}`,
    ].join("\n"),
  };
}

export async function deliverEmail(email: AlertEmail): Promise<{ delivered: boolean }> {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token) {
    console.info("[banking-alerts] email not sent (no Postmark token)", {
      from: ALERT_FROM,
      to: email.to,
      subject: email.subject,
      text: email.text,
    });
    return { delivered: false };
  }
  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": token,
    },
    body: JSON.stringify({
      From: ALERT_FROM,
      To: email.to,
      Subject: email.subject,
      TextBody: email.text,
      MessageStream: "outbound",
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Postmark returned ${response.status}: ${body.slice(0, 300)}`);
  }
  return { delivered: true };
}
