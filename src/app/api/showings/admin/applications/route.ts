import { NextRequest } from "next/server";
import { cancelShowing, isAdmin, listShowings } from "@/lib/showings";
import { getUnit } from "@/lib/showingUnits";
import { APPLICATION_STATUSES, ApplicationStatus, listApplications, setApplicationStatus } from "@/lib/applicationsSheet";
import { getListing } from "@/lib/listingai";
import { buildDeclineEmail, send } from "@/lib/notify";
import { renderEmail } from "@/lib/emailTemplate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

// GET ?unit=unit-3 -> { applications, monthlyRent }
export async function GET(req: NextRequest) {
  if (!isAdmin(req.headers.get("x-admin-key"))) return json({ error: "Unauthorized" }, 401);
  const unit = getUnit(req.nextUrl.searchParams.get("unit") || "");
  if (!unit?.applicationSheet) return json({ error: "No application sheet for this unit" }, 400);
  try {
    const [applications, listing] = await Promise.all([listApplications(unit), getListing(unit.listingId)]);
    const rent = Number((listing?.price || "").replace(/[^\d.]/g, "")) || null;
    return json({ applications, monthlyRent: rent });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
}

// POST { unit, row, email, status, sendDecline?, message? }
export async function POST(req: NextRequest) {
  if (!isAdmin(req.headers.get("x-admin-key"))) return json({ error: "Unauthorized" }, 401);
  const { unit: slug, row, email, name, status, sendDecline, message, cancelBooking, previewOnly } = await req.json();
  const unit = getUnit(slug);
  if (!unit?.applicationSheet) return json({ error: "No application sheet for this unit" }, 400);
  // Render the decline email without sending or changing anything
  if (previewOnly) {
    const mail = buildDeclineEmail({ unit, name, email, message });
    return json({ html: renderEmail(mail.content).html, subject: mail.subject });
  }
  if (!APPLICATION_STATUSES.includes(status as ApplicationStatus)) return json({ error: "Bad status" }, 400);
  const declining = status === "Declined" || status === "Not selected";
  try {
    if (declining && sendDecline) {
      const ok = await send(buildDeclineEmail({ unit, name, email, message }));
      if (!ok) return json({ error: "The decline email didn't send, so the status wasn't changed." }, 502);
    }
    await setApplicationStatus(unit, Number(row), email, status);
    // Optionally free up any showing they had booked for this unit
    let cancelled = 0;
    if (declining && cancelBooking) {
      const mine = (await listShowings(unit)).filter(b => b.email.toLowerCase() === String(email).toLowerCase());
      for (const b of mine) { await cancelShowing(b.eventId); cancelled++; }
    }
    return json({ ok: true, cancelled });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
}
