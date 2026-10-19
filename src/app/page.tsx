import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DateTime } from "luxon";
import s from "./parking/parking.module.css";
import { SpotMap } from "./parking/ParkingFlow";
import { Window, DAY, fshort } from "./parking/format";
import { fetchIcsEvents } from "@/lib/ics";
import { SHOWING_UNITS } from "@/lib/showingUnits";
import { listWindows } from "@/lib/showings";
import { getListing } from "@/lib/listingai";
import { Spot } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "180 Beatrice", description: "Parking, units and the tenant guide for 180 Beatrice St, Toronto" };

async function spotWindows(spot: Spot, now: number): Promise<Window[]> {
  try {
    const ev = await fetchIcsEvents(spot);
    return ev.filter(e => e.end.getTime() > now - DAY).map(e => ({ spot, start: e.start.getTime(), end: e.end.getTime(), reserved: /^reserved\b/i.test(e.summary || "") }));
  } catch { return []; }
}

export default async function Home({ searchParams }: { searchParams: Promise<{ spot?: string }> }) {
  // Old links used /?spot=northern; send them to the spot page.
  const { spot } = await searchParams;
  if (spot === "northern" || spot === "southern") redirect(`/parking/${spot}`);

  const now = Date.now();
  const nowDt = DateTime.now().setZone("America/Toronto");
  const [north, south, windows] = await Promise.all([spotWindows("northern", now), spotWindows("southern", now), listWindows().catch(() => [])]);
  const all = [...north, ...south];
  const busy = (sp: Spot) => all.find(w => w.spot === sp && now >= w.start && now < w.end);
  const nb = busy("northern"), sb = busy("southern");
  const freeCount = (nb ? 0 : 1) + (sb ? 0 : 1);

  const openUnits = SHOWING_UNITS.filter(u => u.bookable && windows.some(w => w.unit === u.code && DateTime.fromISO(w.endIso) > nowDt));
  const feature = openUnits[0];
  // Preview the bookable unit (Unit 3, the basement) even when no showings are open yet
  const previewUnit = feature || SHOWING_UNITS.find(u => u.bookable) || SHOWING_UNITS[SHOWING_UNITS.length - 1];
  const listing = previewUnit ? await getListing(previewUnit.listingId).catch(() => null) : null;

  const unitsPhoto = listing?.photos?.[0]?.url || "/guide/image29.jpg";
  return (
    <div className={s.page}>
      <div className={`${s.wrap} ${s.homeWrap}`}>
        <div className={s.hero}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={s.heroImg} src="/home/house-front.jpg" alt="The front of 180 Beatrice at dusk" />
          <div className={s.heroText}>
            <span className={s.heroEyebrow}>Little Italy · Toronto</span>
            <h1 className={s.heroTitle}>180 Beatrice</h1>
          </div>
        </div>

        <div className={s.rows}>
        <Link href="/parking" className={s.row}>
          <div className={s.rowThumb}><SpotMap windows={all} now={now} sel={null} /></div>
          <div className={s.rowBody}>
            <div style={{ minWidth: 0 }}>
              <div className={s.rowTitle}>Parking</div>
              <span className={s.status}>
                <span className={freeCount ? s.dotOk : s.dotNo}></span>
                {freeCount === 2 ? "Both spots available now" : freeCount === 1 ? `${nb ? "Southern" : "Northern"} spot available now` : "Both spots booked right now"}
              </span>
              <span className={s.rowSub}>Two spots on the laneway, open to the public. Book from your phone, pay by e-transfer.</span>
            </div>
            <span className={s.rowArrow}>›</span>
          </div>
        </Link>

        <Link href="/showings" className={s.row}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className={s.rowThumb}><img src={unitsPhoto} alt="" /></div>
          <div className={s.rowBody}>
            <div style={{ minWidth: 0 }}>
              <div className={s.rowTitle}>Units for rent</div>
              <span className={s.rowSub}>
                {feature
                  ? `${feature.label} is available${listing?.price ? ` at ${listing.price}/mo` : ""}. See photos and book a private showing.`
                  : "Nothing available right now. Have a look at the units and what each one offers."}
              </span>
            </div>
            <span className={s.rowArrow}>›</span>
          </div>
        </Link>

        <Link href="/guide" className={s.row}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className={s.rowThumb}><img src="/guide/image15.jpg" alt="" /></div>
          <div className={s.rowBody}>
            <div style={{ minWidth: 0 }}>
              <div className={s.rowTitle}>Tenant guide</div>
              <span className={s.rowSub}>The house since 1904, the renovations, utilities, bins, snow, and who to call.</span>
            </div>
            <span className={s.rowArrow}>›</span>
          </div>
        </Link>

        </div>

        <h2 className={s.homeSection}>For tenants</h2>
        <div className={s.rows}>
        <a href="https://cameras.andrewmcgrath.info" className={s.row}>
          <div className={s.rowThumb}><div className={s.diagram}><svg viewBox="0 0 120 80" aria-hidden="true"><rect x="10" y="22" width="62" height="40" rx="6" fill="none" stroke="currentColor" strokeWidth="4"/><path d="M72 36l34-14v36L72 44z" fill="currentColor"/><circle cx="41" cy="42" r="9" fill="none" stroke="currentColor" strokeWidth="4"/></svg></div></div>
          <div className={s.rowBody}>
            <div style={{ minWidth: 0 }}>
              <div className={s.rowTitle}>Security cameras</div>
              <span className={s.rowSub}>Live view of the shared outdoor cameras and the doorbell. Sign in with the mobile number on your lease; you get a text code, no password.</span>
            </div>
            <span className={s.rowArrow}>›</span>
          </div>
        </a>

        <a href="/heating/" className={s.row}>
          <div className={s.rowThumb}><div className={s.diagram}><svg viewBox="0 0 120 80" aria-hidden="true"><path d="M30 64V28a6 6 0 0 1 6-6h0a6 6 0 0 1 6 6v36" fill="none" stroke="currentColor" strokeWidth="4"/><circle cx="36" cy="64" r="9" fill="currentColor"/><path d="M60 24h40M60 36h40M60 48h40M60 60h40" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg></div></div>
          <div className={s.rowBody}>
            <div style={{ minWidth: 0 }}>
              <div className={s.rowTitle}>Heating system</div>
              <span className={s.rowSub}>The boiler and each unit&apos;s thermostat, checked every 15 minutes. If the heat ever feels off, look here first.</span>
            </div>
            <span className={s.rowArrow}>›</span>
          </div>
        </a>
        </div>
        <p className={s.homeFoot}>180 Beatrice St, Toronto · <Link href="/terms">Parking terms</Link></p>
      </div>
    </div>
  );
}
