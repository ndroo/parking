import { NextRequest } from "next/server";
import { DateTime } from "luxon";
import { createShowing, findSlot, getSlots, listShowings, SlotTakenError } from "@/lib/showings";
import { getUnit } from "@/lib/showingUnits";
import { notifyShowing } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ unit: string }> };

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

// Public view: which slots are open. No applicant details are exposed.
export async function GET(_req: NextRequest, { params }: Ctx) {
  const unit = getUnit((await params).unit);
  if (!unit) return json({ error: "Unknown unit" }, 404);
  try {
    const bookings = await listShowings(unit);
    const taken = new Set(bookings.map(b => DateTime.fromISO(b.startIso).toMillis()));
    const now = DateTime.now();
    const slots = getSlots(unit).map(s => ({
      ...s,
      taken: taken.has(DateTime.fromISO(s.startIso).toMillis()),
      past: DateTime.fromISO(s.startIso) <= now,
    }));
    return json({ slots });
  } catch (e: any) {
    console.error("GET /api/showings/[unit]", e);
    return json({ error: "Could not load showing times" }, 500);
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const unit = getUnit((await params).unit);
  if (!unit) return json({ error: "Unknown unit" }, 404);
  if (!unit.bookable) return json({ error: `${unit.label} isn't taking showings right now` }, 403);
  try {
    const { startIso, name, email, phone, pet } = await req.json();
    const cleanName = String(name || "").trim().slice(0, 100);
    const cleanEmail = String(email || "").trim().toLowerCase().slice(0, 200);
    const cleanPhone = String(phone || "").trim().slice(0, 40);
    const cleanPet = String(pet || "").trim().slice(0, 200);
    if (!startIso || !cleanName || !cleanEmail || !cleanPhone) {
      return json({ error: "Name, email, phone and a time are required" }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return json({ error: "Please enter a valid email" }, 400);

    const slot = findSlot(unit, startIso);
    if (!slot) return json({ error: "That isn't one of the showing times" }, 400);
    if (DateTime.fromISO(slot.startIso) <= DateTime.now()) return json({ error: "That time has passed" }, 400);

    // One slot per person per unit; they can move it from the page
    const existing = await listShowings(unit);
    if (existing.some(b => b.email.toLowerCase() === cleanEmail)) {
      return json({ error: "This email already has a showing booked. Use \"Manage my booking\" with your reference code to change it." }, 409);
    }

    const booking = await createShowing({ unit, slot, name: cleanName, email: cleanEmail, phone: cleanPhone, pet: cleanPet });
    await notifyShowing("booked", { unit, ref: booking.ref, name: cleanName, email: cleanEmail, phone: cleanPhone, pet: cleanPet, startIso: slot.startIso, manageUrl: `${req.nextUrl.origin}/showings/${unit.slug}` });
    return json({ booking: { ref: booking.ref, name: cleanName, email: cleanEmail, phone: cleanPhone, pet: cleanPet, startIso: slot.startIso, endIso: slot.endIso } });
  } catch (e: any) {
    if (e instanceof SlotTakenError) return json({ error: "Someone just grabbed that time. Please pick another." }, 409);
    console.error("POST /api/showings/[unit]", e);
    return json({ error: "Could not book that time" }, 500);
  }
}
