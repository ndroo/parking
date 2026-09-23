import { DateTime } from "luxon";
import s from "./showings.module.css";
import { BUILDING_ADDRESS, SHOWING_UNITS } from "@/lib/showingUnits";
import { getListing } from "@/lib/listingai";

export const dynamic = "force-dynamic";

export default async function ShowingsIndex() {
  const now = DateTime.now().setZone("America/Toronto");
  const listings = await Promise.all(SHOWING_UNITS.map(u => getListing(u.listingId)));
  const units = SHOWING_UNITS.map((u, i) => ({
    unit: u,
    listing: listings[i],
    open: u.bookable && u.windows.some(w => DateTime.fromISO(`${w.date}T${w.end}`, { zone: "America/Toronto" }) > now),
  })).sort((a, b) => Number(b.open) - Number(a.open));

  return (
    <div className={s.page}>
      <div className={s.wrap}>
        <section className={s.hero}>
          <span className={s.eyebrow}><i className="bi bi-geo-alt"></i> {BUILDING_ADDRESS} · Little Italy</span>
          <h1 className={s.title}>Units &amp; showings.</h1>
          <p className={s.lede}>See what&apos;s available at 180 Beatrice and book a private showing.</p>
        </section>

        <div className={s.stack}>
          {units.map(({ unit: u, listing: l, open }) => (
            <a key={u.slug} href={`/showings/${u.slug}`} className={`${s.section} ${s.unitCard} ${open ? "" : s.unitCardClosed}`}>
              {l?.photos[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={s.unitThumb} src={l.photos[0].url} alt="" />
              )}
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <h2 className={s.h2}>{u.label}</h2>
                  <span className={`${s.badge} ${open ? s.badgeOpen : s.badgeClosed}`}>
                    <i className={`bi ${open ? "bi-calendar-check" : "bi-lock"}`}></i>
                    {open ? "Booking showings" : l?.status || "Currently rented"}
                  </span>
                </div>
                <p className={s.sub}>
                  {[l?.price && `${l.price}/mo`, l?.beds, l?.baths].filter(Boolean).join(" · ") || u.blurb}
                </p>
                <p className={s.sub}>
                  {open
                    ? u.windows.map(w => DateTime.fromISO(w.date).toFormat("ccc LLL d")).join(" · ")
                    : l?.headline || u.blurb}
                </p>
              </div>
              <span className={`${s.btn} ${open ? s.btnPrimary : ""}`}>
                {open ? "Book a showing" : "View unit"} <i className="bi bi-arrow-right"></i>
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
