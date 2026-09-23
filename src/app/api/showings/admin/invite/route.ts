import { NextRequest } from "next/server";
import { isAdmin } from "@/lib/showings";
import { getUnit } from "@/lib/showingUnits";
import { inviteCode, inviteLink } from "@/lib/invites";
import { getListing } from "@/lib/listingai";
import { buildInviteEmail, send } from "@/lib/notify";
import { renderEmail } from "@/lib/emailTemplate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

// POST { unit, name, email, phone, message, send } -> { code, link, subject, html, sent }
export async function POST(req: NextRequest) {
  if (!isAdmin(req.headers.get("x-admin-key"))) return json({ error: "Unauthorized" }, 401);
  const { unit: slug, name, email, phone, message, send: doSend } = await req.json();
  const unit = getUnit(slug);
  if (!unit) return json({ error: "Unknown unit" }, 400);
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return json({ error: "Name and a valid email are required" }, 400);

  const inv = { unit: unit.slug, email: cleanEmail, name: String(name).trim(), phone: String(phone || "").trim() };
  const code = inviteCode(unit.slug, cleanEmail);
  const link = inviteLink(req.nextUrl.origin, inv);
  const listing = await getListing(unit.listingId);
  const mail = buildInviteEmail({ unit, name: inv.name, email: cleanEmail, code, link, message: String(message || ""), photoUrl: listing?.photos[0]?.url });
  const { html } = renderEmail(mail.content);

  let sent = false;
  if (doSend) {
    sent = await send(mail);
    if (!sent) return json({ error: "The email didn't send. Check GMAIL_APP_PASSWORD, or copy the link and send it yourself.", code, link }, 502);
  }
  return json({ code, link, subject: mail.subject, html, sent });
}
