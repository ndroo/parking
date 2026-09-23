import nodemailer from "nodemailer";
import { DateTime } from "luxon";
import { APP_TZ, BOOKING_OWNER_EMAIL } from "@/lib/config";
import { BUILDING_ADDRESS, SHOWING_CONTACT, ShowingUnit } from "@/lib/showingUnits";

// Sends mail from the owner's Gmail using an app password. When the env vars
// are missing, emails are skipped (logged) so bookings still work.
const GMAIL_USER = (process.env.GMAIL_USER || BOOKING_OWNER_EMAIL).trim();
const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");

const transport = GMAIL_APP_PASSWORD
  ? nodemailer.createTransport({ service: "gmail", auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } })
  : null;

interface Mail {
  to: string;
  subject: string;
  lines: string[];
  replyTo?: string;
}

async function send({ to, subject, lines, replyTo }: Mail): Promise<void> {
  if (!transport) {
    console.log(`[notify] GMAIL_APP_PASSWORD not set; skipped "${subject}" to ${to}`);
    return;
  }
  const text = lines.join("\n");
  const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#1d1a16">${lines
    .map(l => (l ? `<p style="margin:0 0 10px">${escapeHtml(l).replace(/(https?:\/\/\S+)/g, '<a href="$1" style="color:#b24a26">$1</a>')}</p>` : ""))
    .join("")}</div>`;
  try {
    await transport.sendMail({ from: `"180 Beatrice" <${GMAIL_USER}>`, to, subject, text, html, replyTo });
  } catch (e) {
    // Never fail a booking because an email didn't send
    console.error(`[notify] failed "${subject}" to ${to}`, e);
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

const when = (iso: string) => DateTime.fromISO(iso).setZone(APP_TZ).toFormat("cccc, LLLL d 'at' h:mm a");

interface ShowingInfo {
  unit: ShowingUnit;
  ref: string;
  name: string;
  email: string;
  phone: string;
  pet: string;
  startIso: string;
  manageUrl: string;
}

const contactLine = () => `Can't make it? Please call or text ${SHOWING_CONTACT.name} at ${SHOWING_CONTACT.phone} as early as you can, or reply to this email.`;

export async function notifyShowing(kind: "booked" | "moved" | "cancelled", b: ShowingInfo, previousStartIso?: string) {
  const place = `${b.unit.label}, ${BUILDING_ADDRESS}`;
  const first = b.name.split(/\s+/)[0];
  const visitor: Record<typeof kind, Mail> = {
    booked: {
      to: b.email,
      subject: `Showing confirmed: ${place}, ${when(b.startIso)}`,
      lines: [
        `Hi ${first},`,
        `You're booked to see ${place} on ${when(b.startIso)} (15 minutes).`,
        `Reference code: ${b.ref}`,
        b.pet ? `Please bring ${b.pet.toLowerCase().startsWith("my ") ? b.pet : `your pet (${b.pet})`} along, we'd love to meet them.` : "",
        `Listing: ${b.unit.listingUrl}`,
        `To change or cancel your time: ${b.manageUrl}`,
        contactLine(),
        `See you soon,`,
        SHOWING_CONTACT.name,
      ],
    },
    moved: {
      to: b.email,
      subject: `Showing moved: ${place}, ${when(b.startIso)}`,
      lines: [
        `Hi ${first},`,
        `Your showing of ${place} is now on ${when(b.startIso)}${previousStartIso ? ` (was ${when(previousStartIso)})` : ""}.`,
        `Reference code: ${b.ref}`,
        `Manage your booking: ${b.manageUrl}`,
        contactLine(),
        SHOWING_CONTACT.name,
      ],
    },
    cancelled: {
      to: b.email,
      subject: `Showing cancelled: ${place}`,
      lines: [
        `Hi ${first},`,
        `Your showing of ${place} on ${when(b.startIso)} is cancelled. Thanks for letting us know.`,
        `If you'd like to book another time: ${b.manageUrl}`,
        SHOWING_CONTACT.name,
      ],
    },
  };
  const verb = { booked: "New showing", moved: "Showing moved", cancelled: "Showing cancelled" }[kind];
  const owner: Mail = {
    to: BOOKING_OWNER_EMAIL,
    replyTo: b.email,
    subject: `${verb}: ${b.unit.label}, ${when(b.startIso)} - ${b.name}`,
    lines: [
      `${verb} for ${place}.`,
      `When: ${when(b.startIso)}${previousStartIso ? ` (was ${when(previousStartIso)})` : ""}`,
      `Name: ${b.name}`,
      `Phone: ${b.phone}`,
      `Email: ${b.email}`,
      `Pet: ${b.pet || "None"}`,
      `Reference: ${b.ref}`,
    ],
  };
  await Promise.all([send(visitor[kind]), send(owner)]);
}

export async function notifyParkingBooked(p: { spot: string; ref: string; name: string; email: string; phone: string; plate: string; startIso: string; endIso: string; price: string; manageUrl: string }) {
  const spot = p.spot.charAt(0).toUpperCase() + p.spot.slice(1);
  const range = `${when(p.startIso)} to ${when(p.endIso)}`;
  await Promise.all([
    send({
      to: p.email,
      subject: `Parking confirmed: ${spot} spot, ${BUILDING_ADDRESS}`,
      lines: [
        `Hi ${p.name.split(/\s+/)[0]},`,
        `Your ${spot} parking spot at ${BUILDING_ADDRESS} is booked from ${range}.`,
        `Plate: ${p.plate}`,
        `Reference code: ${p.ref}`,
        `Total: ${p.price}. Please pay by e-transfer to ${BOOKING_OWNER_EMAIL}.`,
        `Change or cancel: ${p.manageUrl}`,
        SHOWING_CONTACT.name,
      ],
    }),
    send({
      to: BOOKING_OWNER_EMAIL,
      replyTo: p.email,
      subject: `New parking booking: ${spot}, ${p.plate} - ${p.name}`,
      lines: [
        `New ${spot} parking booking.`,
        `When: ${range}`,
        `Name: ${p.name}`,
        `Phone: ${p.phone}`,
        `Email: ${p.email}`,
        `Plate: ${p.plate}`,
        `Total: ${p.price}`,
        `Reference: ${p.ref}`,
      ],
    }),
  ]);
}
