// Per-unit showing setup. Safe to import from client components.
// Add a unit here to open /showings/<slug>; remove its windows to close it.

export interface ShowingWindow {
  date: string;  // YYYY-MM-DD, America/Toronto
  start: string; // HH:mm
  end: string;   // HH:mm, exclusive
}

export type ApplicationField =
  | "name" | "email" | "phone" | "occupants" | "moveIn" | "attracted" | "whyMoving"
  | "consentComms" | "consentCredit" | "pets" | "references" | "insurance" | "other";

export interface ShowingUnit {
  slug: string;  // URL segment
  code: string;  // digits only; used in calendar event ids
  label: string;
  blurb: string;
  listingUrl: string;
  listingId: string; // ListingAI listing slug; details and photos are pulled live from it
  bookable: boolean; // false shows the unit and listing but no bookable times (e.g. currently rented)
  applyUrl?: string; // where people apply (invites to book are sent after approval)
  // The on-site application posts into this Google Form, so responses keep landing in its Sheet
  applicationForm?: { formId: string; entries: Record<ApplicationField, string> };
  slotMinutes: number;
  windows: ShowingWindow[];
  facts: { icon: string; title: string; body: string }[];
}

// Fallback contact; the listing's ListingAI branding takes priority when available
export const SHOWING_CONTACT = {
  name: "Andrew",
  email: "andrewjohnmcgrath@gmail.com",
  phone: "647-225-4909",
};

export const BUILDING_ADDRESS = "180 Beatrice St, Toronto";

// Tenant guide page (/guide): house history, renovations, ideal tenant, FAQ
export const TENANT_GUIDE = {
  url: "/guide",
  tips: [
    "Consent to a credit check, or bring a detailed credit report",
    "Be clear about must-haves like parking or pets",
    "Explain anything unusual in your credit or situation up front",
    "Be reachable by phone the day after your showing",
    "Re-confirm your interest after the viewing (or let us know if you've moved on)",
    "Have your deposit ready within 48 hours if selected",
  ],
};

export const SHOWING_UNITS: ShowingUnit[] = [
  {
    slug: "unit-1",
    code: "1",
    label: "Unit 1",
    blurb: "Three-bedroom home with rooftop patio",
    listingUrl: "https://little-italy-rentals.mylistingai.co/listing/180-beatrice-st-toronto-on-m6g-3g1-canada-167071",
    listingId: "180-beatrice-st-toronto-on-m6g-3g1-canada-167071",
    bookable: false,
    slotMinutes: 15,
    windows: [],
    facts: [],
  },
  {
    slug: "unit-2",
    code: "2",
    label: "Unit 2",
    blurb: "Two-bedroom main floor apartment",
    listingUrl: "https://little-italy-rentals.mylistingai.co/listing/180-beatrice-st-toronto-on-m6g-3g1-canada-167072",
    listingId: "180-beatrice-st-toronto-on-m6g-3g1-canada-167072",
    bookable: false,
    slotMinutes: 15,
    windows: [],
    facts: [],
  },
  {
    slug: "unit-3",
    code: "3",
    label: "Unit 3",
    blurb: "Lower-level apartment in Little Italy",
    listingUrl: "https://little-italy-rentals.mylistingai.co/listing/180-beatrice-st-toronto-on-m6g-3g1-canada-167074",
    listingId: "180-beatrice-st-toronto-on-m6g-3g1-canada-167074",
    bookable: true,
    applyUrl: "/apply/unit-3",
    applicationForm: {
      formId: "1FAIpQLSeEz_6SP8wuJ1_ANq_NCQgeffQ18WkADexYPRBTzYh3CD0pOA",
      entries: {
        name: "1528303781", email: "1411819975", phone: "1831100467", occupants: "862207402",
        moveIn: "768604628", attracted: "975410154", whyMoving: "1579895723", consentComms: "941400864",
        consentCredit: "161059718", pets: "570205733", references: "643577645", insurance: "1263745693",
        other: "1396948514",
      },
    },
    slotMinutes: 15,
    windows: [
      { date: "2026-10-02", start: "17:30", end: "20:00" },
      { date: "2026-10-03", start: "11:00", end: "13:00" },
    ],
    facts: [
      { icon: "bi-person", title: "One visitor at a time", body: "Each showing is a relaxed 15 minutes with just you (and anyone you'd live with)." },
      { icon: "bi-heart", title: "Bring your pet", body: "If you have a pet, please bring them along. We like to meet pets, as it helps us understand what we might encounter if the unit ever needs maintenance while you're not home." },
      {
        icon: "bi-tools",
        title: "Building access",
        body: "Some of the building's systems are reached through the units (for this one, the boiler and water shut-offs in the basement), so we'll occasionally need access for servicing. We always give notice, other than in an emergency.",
      },
    ],
  },
];

export function getUnit(slug: string): ShowingUnit | undefined {
  return SHOWING_UNITS.find(u => u.slug === slug);
}

export function getUnitByCode(code: string): ShowingUnit | undefined {
  return SHOWING_UNITS.find(u => u.code === code);
}
