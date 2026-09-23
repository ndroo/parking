"use client";
import { useEffect, useRef, useState } from "react";
import s from "../../showings/showings.module.css";
import type { Occupant } from "@/lib/applications";

interface Props {
  unit: { slug: string; label: string; listingUrl: string };
  listing: { price: string; beds: string; baths: string; photo: string; headline: string } | null;
}

const blankOccupant = (): Occupant => ({ name: "", dob: "", address: "", income: "", amount: "" });
const DRAFT_KEY = (slug: string) => `beatriceApplyDraft:${slug}`;

function YesNo({ name, value, onChange, label, hint }: { name: string; value: string; onChange: (v: string) => void; label: string; hint?: string }) {
  return (
    <fieldset className={s.yesNo}>
      <legend>{label}</legend>
      {hint && <p className={s.hint}>{hint}</p>}
      <div className={s.yesNoOpts}>
        {["Yes", "No"].map(v => (
          <label key={v} className={value === v ? s.yesNoOn : ""}>
            <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} required /> {v}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function ApplyForm({ unit, listing }: Props) {
  const [f, setF] = useState({
    name: "", email: "", phone: "", occupants: [blankOccupant()], moveIn: "", attracted: "", whyMoving: "",
    consentComms: "", consentCredit: "", pets: "", references: "", insurance: "", parking: "", other: "",
  });
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [restored, setRestored] = useState(false);
  const [, tick] = useState(0);
  const loaded = useRef(false);

  // Restore a saved draft after mount, so refreshes and errors never lose answers
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY(unit.slug));
      if (raw) {
        const d = JSON.parse(raw);
        setF(prev => ({ ...prev, ...(d.form || d) }));
        setSavedAt(d.savedAt || Date.now());
        setRestored(true);
      }
    } catch {}
    loaded.current = true;
    const t = setInterval(() => tick(n => n + 1), 15000); // keep "saved x ago" fresh
    return () => clearInterval(t);
  }, [unit.slug]);

  // Save on every change, once the draft has loaded
  useEffect(() => {
    if (!loaded.current) return;
    try {
      const now = Date.now();
      localStorage.setItem(DRAFT_KEY(unit.slug), JSON.stringify({ form: f, savedAt: now }));
      setSavedAt(now);
    } catch {}
  }, [f, unit.slug]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const set = (patch: Partial<typeof f>) => setF(prev => ({ ...prev, ...patch }));
  const hasAnswers = !!(f.name || f.email || f.phone || f.attracted || f.occupants.some((o: Occupant) => o.name));
  const ago = savedAt ? Math.round((Date.now() - savedAt) / 1000) : 0;
  const agoText = ago < 20 ? "just now" : ago < 90 ? "a minute ago" : `${Math.round(ago / 60)} minutes ago`;
  const setOcc = (i: number, patch: Partial<Occupant>) => set({ occupants: f.occupants.map((o: Occupant, j: number) => (j === i ? { ...o, ...patch } : o)) });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/apply/${unit.slug}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Something went wrong");
      try { localStorage.removeItem(DRAFT_KEY(unit.slug)); } catch {}
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className={s.page}>
        <div className={s.wrap}>
          <div className={`${s.section} ${s.closed}`} style={{ marginTop: 28 }}>
            <div className={s.closedIcon} style={{ color: "var(--ok)" }}><i className="bi bi-check2-circle"></i></div>
            <h1 className={s.h2}>Thanks, {f.name.split(/\s+/)[0]}. Your application is in.</h1>
            <p className={s.sub}>
              We review every application personally. If it looks like a good fit, we&apos;ll email you a personal link to book a showing.
              We&apos;ve sent a copy of this confirmation to {f.email}.
            </p>
            <div className={s.row} style={{ justifyContent: "center", marginTop: 18 }}>
              <a className={`${s.btn} ${s.btnPrimary}`} href="/guide">Read the tenant guide <i className="bi bi-arrow-right"></i></a>
              <a className={s.btn} href={unit.listingUrl} target="_blank" rel="noopener noreferrer">View the listing <i className="bi bi-arrow-up-right"></i></a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <div className={s.wrap}>
        <a className={s.back} href={`/showings/${unit.slug}`}><i className="bi bi-arrow-left"></i> {unit.label}</a>
        <section className={s.applyHero}>
          {listing?.photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.photo} alt="" />
          )}
          <div>
            <span className={s.eyebrow}><i className="bi bi-pencil-square"></i> Step 1 of 2 · Apply</span>
            <h1 className={s.title} style={{ fontSize: "clamp(28px, 6vw, 40px)" }}>Apply for {unit.label}</h1>
            <p className={s.sub}>{[listing?.price && `${listing.price}/month`, listing?.beds, listing?.baths].filter(Boolean).join(" · ")}</p>
          </div>
        </section>

        <div className={s.saveBar} aria-live="polite">
          {hasAnswers && savedAt ? (
            <><i className="bi bi-cloud-check"></i> <span className={s.saveText}>{restored ? "Welcome back. " : ""}Application saved on this device <span>· {agoText}</span></span></>
          ) : (
            <><i className="bi bi-shield-check"></i> <span className={s.saveText}>Your answers save automatically on this device as you type</span></>
          )}
        </div>

        <div className={s.notice}>
          We pre-screen applicants before in-person viewings, so everyone&apos;s time is well spent. It takes about 5 minutes.
          Once we&apos;ve reviewed it, we&apos;ll email you a personal link to book a showing.
        </div>

        <form onSubmit={submit}>
          <div className={s.section}>
            <h2 className={s.h2}>Primary contact</h2>
            <div className={s.fields} style={{ marginTop: 14 }}>
              <div className={s.field}><label htmlFor="a-name">Full name</label><input id="a-name" value={f.name} onChange={e => set({ name: e.target.value })} required autoComplete="name" /></div>
              <div className={s.field}><label htmlFor="a-phone">Phone</label><input id="a-phone" type="tel" value={f.phone} onChange={e => set({ phone: e.target.value })} required autoComplete="tel" /></div>
              <div className={s.field}><label htmlFor="a-email">Email</label><input id="a-email" type="email" value={f.email} onChange={e => set({ email: e.target.value })} required autoComplete="email" /></div>
              <div className={s.field}><label htmlFor="a-move">Desired move-in date</label><input id="a-move" type="date" value={f.moveIn} onChange={e => set({ moveIn: e.target.value })} required /></div>
            </div>
          </div>

          <div className={s.section}>
            <h2 className={s.h2}>Everyone who&apos;ll live here</h2>
            <p className={s.sub}>One entry per person, including you. Income is for the previous year.</p>
            {f.occupants.map((o: Occupant, i: number) => (
              <div key={i} className={s.occupant}>
                <div className={s.occupantHead}>
                  <b>Occupant {i + 1}{i === 0 ? " (you)" : ""}</b>
                  {i > 0 && <button type="button" className={s.linkBtn} onClick={() => set({ occupants: f.occupants.filter((_: Occupant, j: number) => j !== i) })}>Remove</button>}
                </div>
                <div className={s.fields}>
                  <div className={s.field}><label htmlFor={`o-name-${i}`}>Full name</label><input id={`o-name-${i}`} value={o.name} onChange={e => setOcc(i, { name: e.target.value })} required /></div>
                  <div className={s.field}><label htmlFor={`o-dob-${i}`}>Date of birth</label><input id={`o-dob-${i}`} type="date" value={o.dob} onChange={e => setOcc(i, { dob: e.target.value })} /></div>
                  <div className={s.field}><label htmlFor={`o-addr-${i}`}>Current address</label><input id={`o-addr-${i}`} value={o.address} onChange={e => setOcc(i, { address: e.target.value })} /></div>
                  <div className={s.field}><label htmlFor={`o-inc-${i}`}>Source of income</label><input id={`o-inc-${i}`} value={o.income} onChange={e => setOcc(i, { income: e.target.value })} placeholder="e.g. Nurse at St. Joe's, student, retired" /></div>
                  <div className={s.field}><label htmlFor={`o-amt-${i}`}>Total income last year</label><input id={`o-amt-${i}`} value={o.amount} onChange={e => setOcc(i, { amount: e.target.value })} placeholder="e.g. $65,000" /></div>
                </div>
              </div>
            ))}
            <button type="button" className={s.btn} onClick={() => set({ occupants: [...f.occupants, blankOccupant()] })}>
              <i className="bi bi-plus-lg"></i> Add another person
            </button>
          </div>

          <div className={s.section}>
            <h2 className={s.h2}>About your move</h2>
            <div className={s.stack} style={{ marginTop: 14 }}>
              <div className={s.field}><label htmlFor="a-attr">What attracted you to this apartment?</label><textarea id="a-attr" value={f.attracted} onChange={e => set({ attracted: e.target.value })} required rows={3} /></div>
              <div className={s.field}><label htmlFor="a-why">Why are you moving?</label><textarea id="a-why" value={f.whyMoving} onChange={e => set({ whyMoving: e.target.value })} required rows={3} /></div>
              <div className={s.field}><label htmlFor="a-pets">Do you have any pets?</label><textarea id="a-pets" value={f.pets} onChange={e => set({ pets: e.target.value })} required rows={2} placeholder='Species, breed, weight, temperament. Or "None".' /></div>
              <YesNo name="parking" value={f.parking} onChange={v => set({ parking: v })} label="Are you interested in a parking spot?" hint="Optional off-street parking may be available for an extra monthly fee." />
            </div>
          </div>

          <div className={s.section}>
            <h2 className={s.h2}>References &amp; agreements</h2>
            <div className={s.stack} style={{ marginTop: 14 }}>
              <div className={s.field}>
                <label htmlFor="a-refs">References</label>
                <p className={s.hint}>At least one: name, contact details and how you know them. Not friends or family. We won&apos;t call anyone until after viewings, and if you haven&apos;t given notice to your current landlord yet, feel free to leave them off for now.</p>
                <textarea id="a-refs" value={f.references} onChange={e => set({ references: e.target.value })} required rows={3} />
              </div>
              <YesNo name="credit" value={f.consentCredit} onChange={v => set({ consentCredit: v })} label="Do all occupants consent to a credit check, or can you provide your own credit report?" />
              <YesNo name="comms" value={f.consentComms} onChange={v => set({ consentComms: v })} label="Do you consent to receiving legal notices and general communication by email and/or SMS?" />
              <YesNo name="insurance" value={f.insurance} onChange={v => set({ insurance: v })} label="Do you agree to keep tenant insurance throughout your tenancy?" />
              <div className={s.field}>
                <label htmlFor="a-other">Anything else you&apos;d like to share? <span className={s.optional}>(optional)</span></label>
                <p className={s.hint}>We&apos;re not rigid: share anything you feel strengthens your application. <a className={s.linkInline} href="/guide#documents" target="_blank">Ideas in our guide</a>.</p>
                <textarea id="a-other" value={f.other} onChange={e => set({ other: e.target.value })} rows={4} />
              </div>
            </div>
          </div>

          {error && <div className={s.error}>{error}</div>}
          <button className={`${s.btn} ${s.btnPrimary} ${s.btnBlock}`} disabled={busy}>{busy ? "Sending..." : "Submit application"}</button>
          <p className={s.fine} style={{ textAlign: "center" }}>
            <i className="bi bi-shield-lock"></i> Only used to review your application. We&apos;ll never ask for your SIN.
          </p>
        </form>
      </div>
    </div>
  );
}
