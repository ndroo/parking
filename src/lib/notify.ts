import nodemailer from "nodemailer";
import { DateTime } from "luxon";
import { APP_TZ, BOOKING_OWNER_EMAIL } from "@/lib/config";
import { BUILDING_ADDRESS, SHOWING_CONTACT, ShowingUnit, TENANT_GUIDE } from "@/lib/showingUnits";
import { getListing } from "@/lib/listingai";
import { EmailContent, renderEmail } from "@/lib/emailTemplate";
import type { Application } from "@/lib/applications";

// Sends mail from the owner's Gmail using an app password. When the env vars
// are missing, emails are skipped (logged) so bookings still work.
const GMAIL_USER = (process.env.GMAIL_USER || BOOKING_OWNER_EMAIL).trim();
const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");

const transport = GMAIL_APP_PASSWORD
  ? nodemailer.createTransport({ service: "gmail", auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } })
  : null;

export interface OutgoingEmail {
  to: string;
  subject: string;
  replyTo?: string;
  fromName?: string;
  content: EmailContent;
}

export async function send(mail: OutgoingEmail): Promise<boolean> {
  if (!transport) {
    console.log(`[notify] GMAIL_APP_PASSWORD not set; skipped "${mail.subject}" to ${mail.to}`);
    return false;
  }
  const { html, text } = renderEmail(mail.content);
  try {
    await transport.sendMail({ from: `"${mail.fromName || "180 Beatrice"}" <${GMAIL_USER}>`, to: mail.to, subject: mail.subject, html, text, replyTo: mail.replyTo });
    return true;
  } catch (e) {
    // Never fail a booking because an email didn't send
    console.error(`[notify] failed "${mail.subject}" to ${mail.to}`, e);
    return false;
  }
}

const dt = (iso: string) => DateTime.fromISO(iso).setZone(APP_TZ);
const longDay = (iso: string) => dt(iso).toFormat("cccc, LLLL d");
const time = (iso: string) => dt(iso).toFormat("h:mm a");
const range = (a: string, b: string) => `${time(a)} - ${time(b)}`;
const short = (iso: string) => dt(iso).toFormat("ccc LLL d, h:mm a");
const FOOTER = `180 Beatrice St, Toronto · Sent by the 180 Beatrice booking page`;
const contactBlock = (text: string) => ({ text, phone: SHOWING_CONTACT.phone, email: SHOWING_CONTACT.email });

export interface ShowingInfo {
  unit: ShowingUnit;
  ref: string;
  name: string;
  email: string;
  phone: string;
  pet: string;
  startIso: string;
  manageUrl: string;
}

export type ShowingEvent = "booked" | "moved" | "cancelled";

// Builds (without sending) the visitor and owner emails for a showing event
export function buildShowingEmails(kind: ShowingEvent, b: ShowingInfo, photoUrl?: string, previousStartIso?: string): OutgoingEmail[] {
  const place = `${b.unit.label}, ${BUILDING_ADDRESS}`;
  const first = b.name.split(/\s+/)[0];
  const endIso = dt(b.startIso).plus({ minutes: b.unit.slotMinutes }).toISO()!;
  const when = { eyebrow: longDay(b.startIso), big: range(b.startIso, endIso), sub: place, subHref: `https://maps.google.com/?q=${encodeURIComponent(`180 Beatrice St, Toronto, ON`)}` };
  const reminders = [
    ...(b.pet ? [`You mentioned a pet (${b.pet}). Please bring them along, we'd love to meet them.`] : []),
    ...b.unit.facts.filter(f => !(b.pet && /pet/i.test(f.title))).map(f => `${f.title}: ${f.body}`),
  ];

  const visitor: Record<ShowingEvent, EmailContent> = {
    booked: {
      preheader: `${longDay(b.startIso)} at ${time(b.startIso)}. Reference ${b.ref}.`,
      photoUrl,
      badge: { text: "Showing confirmed", tone: "ok" },
      title: `You're booked, ${first}.`,
      intro: `Thanks for booking a time to see ${b.unit.label}. Here are the details for your records.`,
      when,
      refCode: b.ref,
      buttons: [
        { label: "Manage my booking", href: b.manageUrl, primary: true },
        { label: "View the listing", href: b.unit.listingUrl },
      ],
      callout: {
        title: "Read our tenant guide",
        body: "A 5 minute read on the house, its renovations, what we look for in a tenant, and how to make your application an easy yes.",
        button: { label: "Read the tenant guide", href: new URL(TENANT_GUIDE.url, b.manageUrl).toString() },
      },
      notes: { title: "A few reminders", items: reminders },
      contact: contactBlock(`If you have any questions, or need to move your time, feel free to reply to this email, or you can text or call me.`),
      footer: FOOTER,
    },
    moved: {
      preheader: `Now ${longDay(b.startIso)} at ${time(b.startIso)}.`,
      photoUrl,
      badge: { text: "Time changed", tone: "accent" },
      title: `Your showing has moved, ${first}.`,
      intro: `Your new time is below, and your reference code stays the same.`,
      when: { ...when, struck: previousStartIso ? `${longDay(previousStartIso)}, ${time(previousStartIso)}` : undefined },
      refCode: b.ref,
      buttons: [{ label: "Manage my booking", href: b.manageUrl, primary: true }],
      contact: contactBlock(`If you have any questions, feel free to reply to this email, or you can text or call me.`),
      footer: FOOTER,
    },
    cancelled: {
      preheader: `Your ${longDay(b.startIso)} showing is cancelled.`,
      badge: { text: "Cancelled", tone: "muted" },
      title: `Your showing is cancelled.`,
      intro: `Thanks for letting us know, ${first}. Your ${longDay(b.startIso)} ${time(b.startIso)} time has been released. If you'd still like to see ${b.unit.label}, you can book another time while spots are open.`,
      buttons: [
        { label: "Book another time", href: b.manageUrl, primary: true },
        { label: "View the listing", href: b.unit.listingUrl },
      ],
      contact: contactBlock(`If you have any questions, feel free to reply to this email, or you can text or call me.`),
      footer: FOOTER,
    },
  };

  const subjects: Record<ShowingEvent, [string, string]> = {
    booked: [`Showing confirmed: ${b.unit.label}, ${short(b.startIso)}`, `New showing: ${b.unit.label}, ${short(b.startIso)} - ${b.name}`],
    moved: [`Showing moved: ${b.unit.label}, ${short(b.startIso)}`, `Showing moved: ${b.unit.label}, ${short(b.startIso)} - ${b.name}`],
    cancelled: [`Showing cancelled: ${b.unit.label}, ${short(b.startIso)}`, `Showing cancelled: ${b.unit.label}, ${short(b.startIso)} - ${b.name}`],
  };
  const ownerTitle = { booked: `New showing: ${b.name}`, moved: `${b.name} moved their showing`, cancelled: `${b.name} cancelled` }[kind];

  const owner: EmailContent = {
    preheader: `${b.unit.label} · ${short(b.startIso)} · ${b.phone}`,
    badge: { text: { booked: "New booking", moved: "Rescheduled", cancelled: "Cancelled" }[kind], tone: kind === "cancelled" ? "muted" : kind === "moved" ? "accent" : "ok" },
    title: ownerTitle,
    when: kind === "cancelled"
      ? { eyebrow: "Released", big: `${longDay(b.startIso)}`, sub: `${range(b.startIso, endIso)} · ${place}` }
      : { ...when, struck: previousStartIso ? `${longDay(previousStartIso)}, ${time(previousStartIso)}` : undefined },
    rows: [
      { label: "Name", value: b.name },
      { label: "Phone", value: b.phone, href: `tel:${b.phone.replace(/[^\d+]/g, "")}` },
      { label: "Email", value: b.email, href: `mailto:${b.email}` },
      { label: "Pet", value: b.pet || "None" },
      { label: "Reference", value: b.ref },
    ],
    buttons: [
      { label: `Call ${b.name.split(/\s+/)[0]}`, href: `tel:${b.phone.replace(/[^\d+]/g, "")}`, primary: true },
      { label: "Open admin", href: b.manageUrl.replace(/\/showings\/[^/]+$/, "/showings/admin") },
    ],
    footer: `Reply to this email to write to ${b.name}.`,
  };

  return [
    { to: b.email, subject: subjects[kind][0], content: visitor[kind] },
    { to: BOOKING_OWNER_EMAIL, replyTo: b.email, subject: subjects[kind][1], content: owner },
  ];
}

export async function notifyShowing(kind: ShowingEvent, b: ShowingInfo, previousStartIso?: string) {
  const listing = kind === "cancelled" ? null : await getListing(b.unit.listingId);
  await Promise.all(buildShowingEmails(kind, b, listing?.photos[0]?.url, previousStartIso).map(send));
}

// Approval email with a personal booking link, sent from the admin page
export function buildInviteEmail(p: { unit: ShowingUnit; name: string; email: string; code: string; link: string; message: string; photoUrl?: string }): OutgoingEmail {
  return {
    to: p.email,
    fromName: "Andrew McGrath",
    subject: `${p.unit.label}, 180 Beatrice: book your showing`,
    content: {
      preheader: `Your invite to book a showing at ${p.unit.label}, 180 Beatrice.`,
      photoUrl: p.photoUrl,
      badge: { text: "Application approved for a showing", tone: "ok" },
      title: `Book your showing`,
      paragraphs: p.message.split(/\n\s*\n/).map(t => t.trim()).filter(Boolean),
      refLabel: "Your invite code",
      refCode: p.code,
      buttons: [{ label: "Pick a showing time", href: p.link, primary: true }, { label: "View the listing", href: p.unit.listingUrl }],
      callout: {
        title: "Read our tenant guide",
        body: "A 5 minute read on the house, what we look for in a tenant, and what's helpful to share with your application.",
        button: { label: "Read the tenant guide", href: new URL(TENANT_GUIDE.url, p.link).toString() },
      },
      footer: `The button above is your personal booking link. You can also enter your invite code and email on the booking page.`,
    },
  };
}

// Applicant gets a receipt; owner gets the full application with a link to invite
export async function notifyApplication(unit: ShowingUnit, a: Application, occupantsText: string, adminUrl: string, savedToSheet: boolean): Promise<boolean> {
  const first = a.name.split(/\s+/)[0];
  const moveIn = DateTime.fromISO(a.moveIn).toFormat("cccc, LLLL d");
  const [, ownerSent] = await Promise.all([
    send({
      to: a.email,
      fromName: "Andrew McGrath",
      subject: `Application received: ${unit.label}, 180 Beatrice`,
      content: {
        preheader: `Thanks ${first}, we've got your application.`,
        badge: { text: "Application received", tone: "ok" },
        title: `Thanks for applying, ${first}.`,
        paragraphs: [
          `We've received your application for ${unit.label} at 180 Beatrice. We review every application personally, and if it looks like a good fit on both sides, we'll email you a personal link to book a showing.`,
          `In the meantime, feel free to have a read of our tenant guide. It covers the house, what we look for, and what's helpful to share to make your application as strong as possible.`,
        ],
        buttons: [{ label: "Read the tenant guide", href: new URL(TENANT_GUIDE.url, adminUrl).toString(), primary: true }, { label: "View the listing", href: unit.listingUrl }],
        contact: contactBlock(`If you have any questions, feel free to reply to this email, or you can text or call me.`),
        footer: FOOTER,
      },
    }),
    send({
      to: BOOKING_OWNER_EMAIL,
      replyTo: a.email,
      subject: `New application: ${unit.label} - ${a.name}`,
      content: {
        preheader: `${a.occupants.length} occupant(s) · move-in ${moveIn} · ${a.phone}`,
        badge: { text: "New application", tone: "accent" },
        title: `${a.name} applied for ${unit.label}`,
        rows: [
          { label: "Phone", value: a.phone, href: `tel:${a.phone.replace(/[^\d+]/g, "")}` },
          { label: "Email", value: a.email, href: `mailto:${a.email}` },
          { label: "Move-in", value: moveIn },
          { label: "Occupants", value: occupantsText },
          { label: "Pets", value: a.pets },
          { label: "Parking", value: a.parking === "Yes" ? "Interested" : "No" },
          { label: "Attracted by", value: a.attracted },
          { label: "Moving because", value: a.whyMoving },
          { label: "References", value: a.references },
          { label: "Credit check", value: a.consentCredit },
          { label: "Email notices", value: a.consentComms },
          { label: "Insurance", value: a.insurance },
          ...(a.other ? [{ label: "Other", value: a.other }] : []),
        ],
        buttons: [{ label: "Invite to a showing", href: adminUrl, primary: true }],
        footer: savedToSheet
          ? `Also saved to the Google Form responses sheet. Reply to this email to write to ${a.name}.`
          : `NOT saved to the Google Form sheet (the form rejected it), so this email is the only copy. Reply to write to ${a.name}.`,
      },
    }),
  ]);
  return ownerSent;
}

export interface ParkingInfo {
  spot: string; ref: string; name: string; email: string; phone: string; plate: string;
  startIso: string; endIso: string; price: string; manageUrl: string;
}

export function buildParkingEmails(p: ParkingInfo): OutgoingEmail[] {
  const spot = p.spot.charAt(0).toUpperCase() + p.spot.slice(1);
  const when = { eyebrow: `${spot} spot · ${BUILDING_ADDRESS}`, big: `${short(p.startIso)}`, sub: `until ${short(p.endIso)}` };
  return [
    {
      to: p.email,
      subject: `Parking confirmed: ${spot} spot, ${short(p.startIso)}`,
      content: {
        preheader: `${spot} spot from ${short(p.startIso)}. Reference ${p.ref}.`,
        badge: { text: "Parking confirmed", tone: "ok" },
        title: `You're all set, ${p.name.split(/\s+/)[0]}.`,
        intro: `Your parking spot is reserved. Please send payment by e-transfer to ${BOOKING_OWNER_EMAIL}.`,
        when,
        refCode: p.ref,
        rows: [
          { label: "Plate", value: p.plate },
          { label: "Total", value: p.price },
          { label: "Pay to", value: BOOKING_OWNER_EMAIL },
        ],
        buttons: [{ label: "Change or cancel", href: p.manageUrl, primary: true }],
        contact: contactBlock(`Someone in your spot or need help?`),
        footer: FOOTER,
      },
    },
    {
      to: BOOKING_OWNER_EMAIL,
      replyTo: p.email,
      subject: `New parking booking: ${spot}, ${p.plate} - ${p.name}`,
      content: {
        preheader: `${spot} · ${short(p.startIso)} to ${short(p.endIso)} · ${p.price}`,
        badge: { text: "New parking booking", tone: "ok" },
        title: `${p.name} booked the ${spot} spot`,
        when,
        rows: [
          { label: "Name", value: p.name },
          { label: "Phone", value: p.phone, href: `tel:${p.phone.replace(/[^\d+]/g, "")}` },
          { label: "Email", value: p.email, href: `mailto:${p.email}` },
          { label: "Plate", value: p.plate },
          { label: "Total", value: p.price },
          { label: "Reference", value: p.ref },
        ],
        footer: `Reply to this email to write to ${p.name}.`,
      },
    },
  ];
}

export async function notifyParkingBooked(p: ParkingInfo) {
  await Promise.all(buildParkingEmails(p).map(send));
}
