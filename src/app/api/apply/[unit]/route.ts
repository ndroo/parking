import { NextRequest } from "next/server";
import { DateTime } from "luxon";
import { getUnit } from "@/lib/showingUnits";
import { notifyApplication } from "@/lib/notify";
import type { Application } from "@/lib/applications";
import { appendApplication } from "@/lib/applicationsSheet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ unit: string }> };

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

const clip = (v: unknown, n = 2000) => String(v ?? "").trim().slice(0, n);

// Posts the on-site application into the unit's Google Form so it lands in the same Sheet
export async function POST(req: NextRequest, { params }: Ctx) {
  const unit = getUnit((await params).unit);
  if (!unit?.applicationSheet || !unit.bookable) return json({ error: "Applications aren't open for this unit" }, 404);
  const body = await req.json().catch(() => null);
  if (!body) return json({ error: "Invalid request" }, 400);

  const a: Application = {
    name: clip(body.name, 120), email: clip(body.email, 200).toLowerCase(), phone: clip(body.phone, 40),
    occupants: (Array.isArray(body.occupants) ? body.occupants : []).slice(0, 8).map((o: any) => ({
      name: clip(o?.name, 120), dob: clip(o?.dob, 20), address: clip(o?.address, 200), income: clip(o?.income, 200), amount: clip(o?.amount, 40),
    })),
    moveIn: clip(body.moveIn, 10), attracted: clip(body.attracted), whyMoving: clip(body.whyMoving),
    consentComms: body.consentComms === "Yes" ? "Yes" : "No", consentCredit: body.consentCredit === "Yes" ? "Yes" : "No",
    pets: clip(body.pets), references: clip(body.references), insurance: body.insurance === "Yes" ? "Yes" : "No",
    parking: body.parking === "Yes" ? "Yes" : "No", other: clip(body.other),
  };

  const missing = [
    !a.name && "your name", !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email) && "a valid email", !a.phone && "a phone number",
    !a.occupants.length || a.occupants.some(o => !o.name) ? "every occupant's name" : "",
    !DateTime.fromISO(a.moveIn).isValid && "a move-in date", !a.attracted && "what attracted you",
    !a.whyMoving && "why you're moving", !a.pets && "pet details (or \"None\")", !a.references && "at least one reference",
  ].filter(Boolean);
  if (missing.length) return json({ error: `Please add ${missing.join(", ")}.` }, 400);

  // Same shape as the Google Form's answers, one occupant per line
  const occupantsText = a.occupants
    .map(o => [o.name, o.dob && `born ${o.dob}`, o.address, o.income, o.amount && `${o.amount} last year`].filter(Boolean).join("; "))
    .join("\n");
  const otherText = [a.parking === "Yes" ? "Interested in a parking spot." : "", a.other].filter(Boolean).join("\n\n");

  // Save a new row in the unit's responses Sheet; the full application is
  // also emailed to the owner, so a Sheet failure alone doesn't lose anything.
  let savedToSheet = false;
  try {
    await appendApplication(unit, {
      submittedAt: DateTime.now().setZone("America/Toronto").toFormat("M/d/yyyy H:mm:ss"),
      name: a.name, email: a.email, phone: a.phone, occupants: occupantsText,
      moveIn: DateTime.fromISO(a.moveIn).toFormat("M/d/yyyy"),
      attracted: a.attracted, whyMoving: a.whyMoving, consentComms: a.consentComms, consentCredit: a.consentCredit,
      pets: a.pets, references: a.references, insurance: a.insurance, other: otherText,
    });
    savedToSheet = true;
  } catch (err) {
    console.error("apply: saving to the sheet failed", err);
  }

  const emailed = await notifyApplication(unit, a, occupantsText, `${req.nextUrl.origin}/showings/admin`, savedToSheet);
  if (!savedToSheet && !emailed) {
    return json({ error: "We couldn't send your application just now. Your answers are saved on this device, so please try again in a minute, or text Andrew at 647-225-4909." }, 502);
  }
  return json({ ok: true });
}
