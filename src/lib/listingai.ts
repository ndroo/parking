// Pulls public listing details from ListingAI so the showing page stays in
// sync when the listing is edited there. Server-only; cached for 5 minutes.

const LISTINGAI_API = "https://api.listingai.co";
const REVALIDATE_SECONDS = 300;

export interface ListingPhoto {
  url: string;
  caption: string;
}

export interface ListingDetails {
  address: string;
  headline: string;
  status: string;
  price: string;
  beds: string;
  baths: string;
  size: string;
  parking: string;
  highlights: string[];
  description: string;
  photos: ListingPhoto[];
  contact: { name: string; phone: string; email: string };
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

// "$3150 / month" and "$2,350" both become "$3,150" / "$2,350"; the page adds "/month"
function cleanPrice(value: string): string {
  const v = value.replace(/\s*\/\s*(mo|month)\.?$/i, "").trim();
  const n = Number(v.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? `$${n.toLocaleString("en-US")}` : v;
}

// Returns null when ListingAI is unreachable; the page still works without it
export async function getListing(listingId: string): Promise<ListingDetails | null> {
  try {
    const url = `${LISTINGAI_API}/asset/get_microsite?id=${encodeURIComponent(listingId)}&check_domain=false`;
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.success || !data.microsite) return null;

    const m = data.microsite;
    const str = m.strings || {};
    const hidden = parseList(str.hidden_fields);
    const show = (key: string) => (hidden.includes(key) ? "" : String(str[key] || "").trim());
    const branding = m.branding || {};
    const staff = data.agent_website?.data?.staff?.[0] || {};

    const photos: ListingPhoto[] = (m.images || [])
      .filter((i: any) => i?.url && !i.deleted_at)
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
      .map((i: any) => ({ url: i.url, caption: i.overlay_caption || i.description || "" }));

    return {
      address: str.address || m.address || "",
      headline: show("headline"),
      status: m.listing_status || str.title || "",
      price: cleanPrice(show("price")),
      beds: show("beds"),
      baths: show("baths"),
      size: show("size"),
      parking: show("parking"),
      highlights: parseList(str.highlights),
      description: show("description"),
      photos,
      contact: {
        name: branding.name || staff.name || "",
        phone: branding.phone_number || staff.phone || "",
        email: branding.email || staff.email || "",
      },
    };
  } catch (e) {
    console.error("getListing failed", e);
    return null;
  }
}
