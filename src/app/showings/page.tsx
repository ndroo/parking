import { DateTime } from "luxon";
import s from "./showings.module.css";
import { BUILDING_ADDRESS, SHOWING_CONTACT, SHOWING_UNITS } from "@/lib/showingUnits";

export const dynamic = "force-dynamic";

export const metadata = { title: "Showings - 180 Beatrice" };

export default function ShowingsIndex() {
  const now = DateTime.now().setZone("America/Toronto");
  const open = SHOWING_UNITS.filter(u =>
    u.windows.some(w => DateTime.fromISO(`${w.date}T${w.end}`, { zone: "America/Toronto" }) > now)
  );

  return (
    <div className={s.page}>
      <div className={s.wrap}>
        <header className={s.topbar}>
          <span className={s.brand}>180 Beatrice</span>
        </header>
        <section className={s.hero}>
          <span className={s.eyebrow}><i className="bi bi-house-door"></i> {BUILDING_ADDRESS}</span>
          <h1 className={s.title}>Book a showing.</h1>
          <p className={s.lede}>Pick the apartment you&apos;re interested in to see open times.</p>
        </section>

        {open.length === 0 && (
          <div className={s.section}>
            <h2 className={s.h2}>No showings scheduled right now</h2>
            <p className={s.sub}>
              Questions? Email <a className={s.linkBtn} href={`mailto:${SHOWING_CONTACT.email}`}>{SHOWING_CONTACT.email}</a>
            </p>
          </div>
        )}

        <div className={s.stack}>
          {open.map(u => (
            <a key={u.slug} href={`/showings/${u.slug}`} className={`${s.section} ${s.unitCard}`}>
              <div>
                <h2 className={s.h2}>{u.label}</h2>
                <p className={s.sub}>{u.blurb}</p>
                <p className={s.sub}>
                  {u.windows.map(w => DateTime.fromISO(w.date).toFormat("ccc LLL d")).join(" · ")}
                </p>
              </div>
              <span className={`${s.btn} ${s.btnPrimary}`}>See times <i className="bi bi-arrow-right"></i></span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
