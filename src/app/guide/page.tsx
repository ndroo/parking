import type { Metadata } from "next";
import s from "../showings/showings.module.css";
import g from "./guide.module.css";
import { GUIDE, GuideItem } from "@/lib/tenantGuide";
import { getListing } from "@/lib/listingai";
import { SHOWING_CONTACT, SHOWING_UNITS } from "@/lib/showingUnits";
import { Gallery, ZoomImage } from "./Gallery";
import WaterCalculator from "./WaterCalculator";

export const metadata: Metadata = {
  title: "Tenant guide - 180 Beatrice",
  description: "The history of 180 Beatrice, its renovations, what we look for in a tenant, and answers to common questions.",
};

const SECTIONS = [
  { id: "selected", label: "Getting selected" },
  { id: "documents", label: "What to share" },
  { id: "utilities", label: "Utilities & bills" },
  { id: "ideal", label: "Our ideal tenant" },
  { id: "faq", label: "FAQ" },
  { id: "about", label: "About us" },
  { id: "history", label: "History" },
  { id: "reno-2018", label: "2018-19 renovation" },
  { id: "reno-2022", label: "2022-23 basement" },
  { id: "kitchens-2025", label: "2025 kitchens" },
];

function Timeline({ items }: { items: GuideItem[] }) {
  return (
    <ol className={g.timeline}>
      {items.map(it => (
        <li key={it.title}>
          <h3>{it.title}</h3>
          {it.body && <p>{it.body}</p>}
          <Gallery photos={it.photos} />
        </li>
      ))}
    </ol>
  );
}

export default async function GuidePage() {
  // Exterior photo from the Unit 1 listing on ListingAI (stays current)
  const exterior = (await getListing(SHOWING_UNITS[0].listingId))?.photos[0]?.url;

  return (
    <div className={s.page}>
      <div className={s.wrap}>
        <section className={g.hero}>
          {exterior && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={g.heroImg} src={exterior} alt="180 Beatrice St" />
          )}
          <div className={g.heroBody}>
            <span className={s.eyebrow}><i className="bi bi-book"></i> Tenant guide</span>
            <h1 className={s.title}>Welcome to 180 Beatrice.</h1>
            <p className={s.lede}>{GUIDE.intro}</p>
            <dl className={g.facts}>
              {GUIDE.facts.map(f => (
                <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>
              ))}
            </dl>
          </div>
        </section>

        <nav className={g.toc} aria-label="Guide sections">
          {SECTIONS.map(x => <a key={x.id} href={`#${x.id}`}>{x.label}</a>)}
        </nav>

        <section id="selected" className={`${s.section} ${g.block}`}>
          <span className={g.kicker}>For applicants</span>
          <h2 className={g.h2}>How to become the selected tenant</h2>
          <p className={g.p}>{GUIDE.selected.lede}</p>
          <ol className={g.steps}>
            {GUIDE.selected.steps.map((st, i) => (
              <li key={st.title}>
                <span className={g.stepNum}>{i + 1}</span>
                <div><b>{st.title}</b><p>{st.body}</p></div>
              </li>
            ))}
          </ol>
          <a className={`${s.btn} ${s.btnPrimary}`} href="/showings">See units and book a showing <i className="bi bi-arrow-right"></i></a>
        </section>

        <section id="documents" className={`${s.section} ${g.block}`}>
          <span className={g.kicker}>Your application</span>
          <h2 className={g.h2}>What to share</h2>
          <p className={g.p}>{GUIDE.documents.lede}</p>
          <div className={g.docGrid}>
            {GUIDE.documents.groups.map(grp => (
              <div key={grp.title} className={g.utilCard}>
                <b>{grp.title}</b>
                <ul>{grp.items.map(i => <li key={i}>{i}</li>)}</ul>
              </div>
            ))}
          </div>
          <p className={g.p} style={{ marginTop: 16 }}>{GUIDE.documents.timing}</p>
          <p className={g.small}><i className="bi bi-shield-lock"></i> {GUIDE.documents.privacy}</p>
        </section>

        <section id="utilities" className={`${s.section} ${g.block}`}>
          <span className={g.kicker}>What's included</span>
          <h2 className={g.h2}>Utilities &amp; bills</h2>
          <div className={g.utilGrid}>
            <div className={g.utilCard}>
              <b><i className="bi bi-check-circle"></i> Included in rent</b>
              <ul>{GUIDE.utilities.included.map(u => <li key={u}>{u}</li>)}</ul>
            </div>
            <div className={g.utilCard}>
              <b><i className="bi bi-lightning-charge"></i> Paid by you</b>
              <ul>{GUIDE.utilities.notIncluded.map(u => <li key={u.name}><strong>{u.name}.</strong> {u.note}</li>)}</ul>
            </div>
          </div>
          <h3 className={g.h3}>Water</h3>
          <p className={g.p}>{GUIDE.utilities.water.summary}</p>
          <WaterCalculator {...GUIDE.utilities.water.example} includedAdults={GUIDE.utilities.water.includedAdults} />
          <p className={g.small}>{GUIDE.utilities.water.example.note}</p>
        </section>

        <section id="ideal" className={`${s.section} ${g.block}`}>
          <span className={g.kicker}>What matters to us</span>
          <h2 className={g.h2}>Our ideal tenant</h2>
          {GUIDE.ideal.lede.map(t => <p key={t} className={g.p}>{t}</p>)}
          <div className={g.points}>
            {GUIDE.ideal.points.map(pt => (
              <div key={pt.title} className={g.point}>
                <i className="bi bi-check2-circle"></i>
                <div><b>{pt.title}</b><p>{pt.body}</p></div>
              </div>
            ))}
          </div>
          <p className={g.small}>
            Rent increase guidelines: <a href={GUIDE.ideal.guidelineUrl} target="_blank" rel="noopener noreferrer">ontario.ca/page/residential-rent-increases</a>
          </p>
        </section>

        <section id="faq" className={`${s.section} ${g.block}`}>
          <span className={g.kicker}>Questions</span>
          <h2 className={g.h2}>FAQ</h2>
          <div className={g.faq}>
            {GUIDE.faq.map(f => (
              <details key={f.q}>
                <summary>{f.q}<i className="bi bi-chevron-down"></i></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="about" className={`${s.section} ${g.block}`}>
          <span className={g.kicker}>Your landlords</span>
          <h2 className={g.h2}>About us</h2>
          <div className={g.about}>
            <ZoomImage photo={GUIDE.about.photo} />
            <div>{GUIDE.about.paragraphs.map(t => <p key={t} className={g.p}>{t}</p>)}</div>
          </div>
        </section>

        <section id="history" className={`${s.section} ${g.block}`}>
          <span className={g.kicker}>Since 1904</span>
          <h2 className={g.h2}>History of the house</h2>
          <div className={g.about}>
            <ZoomImage photo={GUIDE.history.photo} />
            <div>
              <p className={g.p}>{GUIDE.history.body}</p>
              <p className={g.small}>{GUIDE.history.caption}</p>
            </div>
          </div>
        </section>

        <section id="reno-2018" className={`${s.section} ${g.block}`}>
          <span className={g.kicker}>August 2018 - May 2019</span>
          <h2 className={g.h2}>The 2018-19 renovation</h2>
          <p className={g.p}>{GUIDE.reno2018.lede}</p>
          <Timeline items={GUIDE.reno2018.items} />
        </section>

        <section id="reno-2022" className={`${s.section} ${g.block}`}>
          <span className={g.kicker}>2022 - 2023</span>
          <h2 className={g.h2}>Creating the basement unit</h2>
          <p className={g.p}>{GUIDE.reno2022.lede}</p>
          <Timeline items={GUIDE.reno2022.items} />
        </section>

        <section id="kitchens-2025" className={`${s.section} ${g.block}`}>
          <span className={g.kicker}>2025</span>
          <h2 className={g.h2}>Kitchen upgrades in Units 1 and 2</h2>
          <p className={g.p}>{GUIDE.kitchens2025.lede}</p>
          <Timeline items={GUIDE.kitchens2025.items} />
        </section>

        <div className={`${s.section} ${s.contactCard}`}>
          <div className={s.contactText}>
            <h2 className={s.h2}>Questions about anything here?</h2>
            <p>Call, text or email {SHOWING_CONTACT.name}. We&apos;re always happy to chat.</p>
            <a className={s.phoneBig} href={`tel:${SHOWING_CONTACT.phone.replace(/[^\d+]/g, "")}`}>{SHOWING_CONTACT.phone}</a>
          </div>
          <div className={s.contactActions}>
            <a className={`${s.btn} ${s.btnPrimary}`} href="/showings">Book a showing</a>
            <a className={s.btn} href={`mailto:${SHOWING_CONTACT.email}`}><i className="bi bi-envelope"></i> Email</a>
          </div>
        </div>
      </div>
    </div>
  );
}
