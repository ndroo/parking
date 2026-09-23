"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { DateTime } from "luxon";
import s from "../showings.module.css";
import { BUILDING_ADDRESS, getUnit, SHOWING_CONTACT as CONTACT, ShowingUnit } from "@/lib/showingUnits";

const TZ = "America/Toronto";

interface Slot {
  startIso: string;
  endIso: string;
  taken: boolean;
  past: boolean;
}

interface Booking {
  ref: string;
  name: string;
  email: string;
  phone: string;
  pet: string;
  startIso: string;
  endIso: string;
}

type Mode = "browse" | "ticket" | "reschedule" | "lookup";

const dt = (iso: string) => DateTime.fromISO(iso).setZone(TZ);
const fmtTime = (iso: string) => dt(iso).toFormat("h:mm a");
const fmtDay = (iso: string) => dt(iso).toFormat("cccc, LLLL d");
const dayKey = (iso: string) => dt(iso).toISODate()!;

// Remembers the visitor's booking on this device, per unit
const storeFor = (unit: ShowingUnit) => {
  const key = `beatriceShowing:${unit.slug}`;
  return {
    get(): { ref: string; email: string } | null {
      try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
    },
    set(b: Booking) {
      try { localStorage.setItem(key, JSON.stringify({ ref: b.ref, email: b.email })); } catch {}
    },
    clear() {
      try { localStorage.removeItem(key); } catch {}
    },
  };
};

function calendarLinks(unit: ShowingUnit, b: Booking) {
  const ADDRESS = `${unit.label}, ${BUILDING_ADDRESS}`;
  const LISTING_URL = unit.listingUrl;
  const a = DateTime.fromISO(b.startIso).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
  const z = DateTime.fromISO(b.endIso).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
  const title = `Apartment showing - ${ADDRESS}`;
  const details = `Reference ${b.ref}. Listing: ${LISTING_URL}. Can't make it? Email ${CONTACT.email}.`;
  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${a}/${z}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(ADDRESS)}`;
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//180 Beatrice//Showings//EN", "BEGIN:VEVENT",
    `UID:${b.ref}@180beatrice`, `DTSTAMP:${a}`, `DTSTART:${a}`, `DTEND:${z}`,
    `SUMMARY:${title}`, `LOCATION:${ADDRESS.replace(/,/g, "\\,")}`, `DESCRIPTION:${details.replace(/,/g, "\\,")}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return { google, ics: `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}` };
}

// "Oct 2 & 3" style summary of a unit's showing days
function showingDates(unit: ShowingUnit) {
  const ds = unit.windows.map(w => DateTime.fromISO(w.date));
  if (ds.length === 0) return "";
  const sameMonth = ds.every(d => d.month === ds[0].month);
  if (sameMonth) return `${ds[0].toFormat("LLL")} ${ds.map(d => d.day).join(" & ")}`;
  return ds.map(d => d.toFormat("LLL d")).join(" & ");
}

function mailto(subject: string) {
  return `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}`;
}

async function manageApi(unit: ShowingUnit, body: Record<string, string>) {
  const res = await fetch(`/api/showings/${unit.slug}/manage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export default function ShowingsPage() {
  const { unit: slug } = useParams<{ unit: string }>();
  const unit = getUnit(slug);
  if (!unit) {
    return (
      <div className={s.page}>
        <div className={s.wrap} style={{ paddingTop: 80 }}>
          <h1 className={s.title}>No showings here.</h1>
          <p className={s.lede}>That unit isn&apos;t taking showings right now. <a className={s.linkBtn} href="/showings">See all showings</a></p>
        </div>
      </div>
    );
  }
  return <Showings unit={unit} />;
}

function Showings({ unit }: { unit: ShowingUnit }) {
  const ADDRESS = `${unit.label}, ${BUILDING_ADDRESS}`;
  const LISTING_URL = unit.listingUrl;
  const store = storeFor(unit);
  const manage = (body: Record<string, string>) => manageApi(unit, body);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [activeDay, setActiveDay] = useState("");
  const [selected, setSelected] = useState<Slot | null>(null);
  const [mode, setMode] = useState<Mode>("browse");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", pet: "" });
  const [lookupForm, setLookupForm] = useState({ ref: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/showings/${unit.slug}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSlots(data.slots);
      setActiveDay(d => d || dayKey((data.slots.find((x: Slot) => !x.taken && !x.past) || data.slots[0]).startIso));
      setLoadError("");
    } catch (e: any) {
      setLoadError(e.message || "Could not load showing times");
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    const saved = store.get();
    if (saved) {
      manage({ action: "lookup", ...saved }).then(({ ok, data }) => {
        if (ok) {
          setBooking(data.booking);
          setMode("ticket");
        } else {
          store.clear();
          setNotice("Your previous showing is no longer on the schedule. If that's a surprise, get in touch below.");
        }
      });
    }
    return () => clearInterval(t);
  }, []);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) =>
    setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

  const choose = (slot: Slot) => {
    setSelected(slot);
    setError("");
    scrollTo(panelRef);
  };

  const done = (b: Booking) => {
    store.set(b);
    setBooking(b);
    setSelected(null);
    setMode("ticket");
    setConfirmCancel(false);
    scrollTo(topRef);
    load();
  };

  const book = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/showings/${unit.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startIso: selected.startIso, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not book that time");
        if (res.status === 409) load();
        return;
      }
      done(data.booking);
    } finally {
      setBusy(false);
    }
  };

  const reschedule = async () => {
    if (!selected || !booking) return;
    setBusy(true);
    setError("");
    const { ok, status, data } = await manage({ action: "reschedule", ref: booking.ref, email: booking.email, startIso: selected.startIso });
    setBusy(false);
    if (!ok) {
      setError(data.error);
      if (status === 409) load();
      return;
    }
    done(data.booking);
  };

  const cancel = async () => {
    if (!booking) return;
    if (!confirmCancel) return setConfirmCancel(true);
    setBusy(true);
    const { ok, data } = await manage({ action: "cancel", ref: booking.ref, email: booking.email });
    setBusy(false);
    if (!ok) return setError(data.error);
    store.clear();
    setBooking(null);
    setConfirmCancel(false);
    setMode("browse");
    setNotice("Your showing is cancelled and the time has been released. Thanks for letting us know.");
    load();
  };

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { ok, data } = await manage({ action: "lookup", ref: lookupForm.ref, email: lookupForm.email });
    setBusy(false);
    if (!ok) return setError(data.error);
    done(data.booking);
  };

  const copyRef = async () => {
    if (!booking) return;
    try {
      await navigator.clipboard.writeText(booking.ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const days = (slots || []).reduce<Record<string, Slot[]>>((acc, x) => {
    (acc[dayKey(x.startIso)] ||= []).push(x);
    return acc;
  }, {});
  const daySlots = days[activeDay] || [];
  const picking = mode === "browse" || mode === "reschedule";
  const isMine = (x: Slot) => !!booking && dt(x.startIso).toMillis() === dt(booking.startIso).toMillis();

  return (
    <div className={s.page}>
      <div className={s.wrap} ref={topRef}>
        <header className={s.topbar}>
          <a className={s.brand} href="/showings">180 Beatrice</a>
          {!booking && mode !== "lookup" && (
            <button className={s.linkBtn} onClick={() => { setMode("lookup"); setError(""); setSelected(null); }}>
              Manage my booking
            </button>
          )}
          {mode === "lookup" && (
            <button className={s.linkBtn} onClick={() => { setMode("browse"); setError(""); }}>Back to times</button>
          )}
        </header>

        {mode !== "ticket" && (
          <section className={s.hero}>
            <span className={s.eyebrow}><i className="bi bi-calendar2-heart"></i> Private showings · {showingDates(unit)}</span>
            <h1 className={s.title}>Come see {unit.label}<br />at 180 Beatrice.</h1>
            <p className={s.lede}>
              We&apos;re showing the apartment one visitor at a time, 15 minutes each, so we can get to know each other a little.
              Pick a time that works for you.
            </p>
            <div className={s.heroActions}>
              <a className={s.btn} href={LISTING_URL} target="_blank" rel="noopener noreferrer">
                View the listing <i className="bi bi-arrow-up-right"></i>
              </a>
            </div>
          </section>
        )}

        {notice && <div className={s.notice}>{notice}</div>}

        {/* Ticket */}
        {mode === "ticket" && booking && (
          <>
            <div className={s.hero} style={{ paddingBottom: 18 }}>
              <h1 className={s.title} style={{ fontSize: "clamp(28px, 6vw, 40px)" }}>
                You&apos;re booked, {booking.name.split(/\s+/)[0]}.
              </h1>
              <p className={s.lede} style={{ marginBottom: 0 }}>Here are your showing details. Screenshot or jot down the reference code.</p>
            </div>
            <div className={s.ticket}>
              <div className={s.ticketTop}>
                <span className={s.ticketBadge}><i className="bi bi-check2-circle"></i> Confirmed</span>
                <div className={s.ticketDay}>{fmtDay(booking.startIso)}</div>
                <div className={s.ticketTime}>{fmtTime(booking.startIso)} - {fmtTime(booking.endIso)}</div>
                <div className={s.ticketPlace}><i className="bi bi-geo-alt"></i> {ADDRESS}</div>
              </div>
              <div className={s.perf}></div>
              <div className={s.ticketBody}>
                <div className={s.refLabel}>Reference code</div>
                <div className={s.refRow}>
                  <span className={s.ref}>{booking.ref}</span>
                  <button className={`${s.btn} ${s.copy}`} onClick={copyRef}>
                    <i className={`bi ${copied ? "bi-check2" : "bi-copy"}`}></i> {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <dl className={s.details}>
                  <dt>Name</dt><dd>{booking.name}</dd>
                  <dt>Email</dt><dd>{booking.email}</dd>
                  <dt>Phone</dt><dd>{booking.phone}</dd>
                  {booking.pet && (<><dt>Pet</dt><dd>{booking.pet} (please bring them!)</dd></>)}
                </dl>
                <div className={s.saved}>
                  <i className="bi bi-phone"></i>
                  <span>
                    Saved on this device. Come back to this page any time to move or cancel. On another device, use
                    &quot;Manage my booking&quot; with your reference code and email.
                  </span>
                </div>
                {error && <div className={s.error}>{error}</div>}
                <div className={s.stack}>
                  <div className={s.grid2}>
                    <a className={s.btn} href={calendarLinks(unit, booking).google} target="_blank" rel="noopener noreferrer">
                      <i className="bi bi-google"></i> Google Calendar
                    </a>
                    <a className={s.btn} href={calendarLinks(unit, booking).ics} download="180-beatrice-showing.ics">
                      <i className="bi bi-calendar-plus"></i> Apple / Outlook
                    </a>
                  </div>
                  <div className={s.grid2}>
                    <button className={s.btn} onClick={() => { setMode("reschedule"); setError(""); setActiveDay(dayKey(booking.startIso)); scrollTo(panelRef); }}>
                      <i className="bi bi-arrow-left-right"></i> Change time
                    </button>
                    <button className={`${s.btn} ${confirmCancel ? s.btnDangerSolid : s.btnDanger}`} onClick={cancel} disabled={busy}>
                      <i className="bi bi-x-circle"></i> {confirmCancel ? "Tap again to cancel" : "Cancel showing"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Things to know */}
        {mode !== "lookup" && (
          <div className={s.facts}>
            {unit.facts.map(f => (
              <div key={f.title} className={s.fact}>
                <div className={s.factIcon}><i className={`bi ${f.icon}`}></i></div>
                <p className={s.factTitle}>{f.title}</p>
                <p className={s.factBody}>{f.body}</p>
              </div>
            ))}
          </div>
        )}

        {/* Find a booking */}
        {mode === "lookup" && (
          <div className={`${s.section} ${s.panel}`}>
            <h2 className={s.h2}>Find your booking</h2>
            <p className={s.sub}>Enter the reference code from your confirmation and the email you booked with.</p>
            <form onSubmit={lookup} style={{ marginTop: 18 }}>
              <div className={s.fields}>
                <div className={s.field}>
                  <label>Reference code</label>
                  <input value={lookupForm.ref} onChange={e => setLookupForm({ ...lookupForm, ref: e.target.value.toUpperCase() })} placeholder="ABC123" required autoCapitalize="characters" />
                </div>
                <div className={s.field}>
                  <label>Email</label>
                  <input type="email" value={lookupForm.email} onChange={e => setLookupForm({ ...lookupForm, email: e.target.value })} required autoComplete="email" />
                </div>
              </div>
              {error && <div className={s.error}>{error}</div>}
              <button className={`${s.btn} ${s.btnPrimary} ${s.btnBlock}`} disabled={busy}>{busy ? "Looking..." : "Find my booking"}</button>
            </form>
          </div>
        )}

        {/* Pick a time */}
        {picking && (
          <div className={s.section}>
            <div className={s.sectionHead}>
              <div>
                <h2 className={s.h2}>{mode === "reschedule" ? "Pick a new time" : "Pick a time"}</h2>
                <p className={s.sub}>
                  {mode === "reschedule" && booking
                    ? `Currently ${dt(booking.startIso).toFormat("ccc h:mm a")}. Your reference stays the same.`
                    : "All times Toronto time. 15 minutes each."}
                </p>
              </div>
              {mode === "reschedule" && (
                <button className={s.linkBtn} onClick={() => { setMode("ticket"); setSelected(null); setError(""); }}>Keep current</button>
              )}
            </div>

            {loadError && <div className={s.error}>{loadError}</div>}

            <div className={s.days}>
              {Object.entries(days).map(([k, list]) => {
                const open = list.filter(x => !x.taken && !x.past).length;
                return (
                  <button key={k} className={`${s.day} ${k === activeDay ? s.dayActive : ""}`} onClick={() => { setActiveDay(k); setSelected(null); }}>
                    <span className={s.dayName}>{dt(list[0].startIso).toFormat("ccc, LLL d")}</span>
                    <span className={s.dayMeta}>
                      {dt(list[0].startIso).toFormat("h:mm")}-{dt(list[list.length - 1].endIso).toFormat("h:mm a")} · {open} open
                    </span>
                  </button>
                );
              })}
            </div>

            <div className={s.slots}>
              {!slots && Array.from({ length: 8 }).map((_, i) => <div key={i} className={s.skeleton}></div>)}
              {daySlots.map(x => {
                const mine = isMine(x);
                const unavailable = x.taken || x.past;
                const sel = selected?.startIso === x.startIso;
                const cls = [s.slot, mine ? s.slotMine : unavailable ? s.slotTaken : "", sel ? s.slotSelected : ""].join(" ");
                return (
                  <button key={x.startIso} className={cls} disabled={unavailable || mine} onClick={() => choose(x)}>
                    <span className={s.slotTime}>{fmtTime(x.startIso)}</span>
                    <span className={s.slotState}>{mine ? "Your time" : x.past ? "Passed" : x.taken ? "Booked" : sel ? "Selected" : "Available"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div ref={panelRef}>
          {/* New booking form */}
          {mode === "browse" && selected && (
            <form onSubmit={book} className={`${s.section} ${s.panel}`}>
              <div className={s.chosen}>
                <i className={`bi bi-clock ${s.chosenIcon}`}></i>
                <div className={s.chosenText}>
                  {fmtDay(selected.startIso)}
                  <small>{fmtTime(selected.startIso)} - {fmtTime(selected.endIso)}</small>
                </div>
              </div>
              <div className={s.fields}>
                <div className={s.field}>
                  <label>Full name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required autoComplete="name" />
                </div>
                <div className={s.field}>
                  <label>Phone</label>
                  <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required autoComplete="tel" />
                </div>
                <div className={s.field}>
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required autoComplete="email" />
                </div>
                <div className={s.field}>
                  <label>Pet you&apos;ll bring <span className={s.optional}>(optional)</span></label>
                  <input value={form.pet} onChange={e => setForm({ ...form, pet: e.target.value })} placeholder="e.g. Dog, 3 year old lab" />
                </div>
              </div>
              {error && <div className={s.error}>{error}</div>}
              <button className={`${s.btn} ${s.btnPrimary} ${s.btnBlock}`} disabled={busy}>
                {busy ? "Booking..." : `Book ${fmtTime(selected.startIso)}`}
              </button>
              <p className={s.fine}>Your details are only shared with us, to confirm your showing.</p>
            </form>
          )}

          {/* Reschedule confirm */}
          {mode === "reschedule" && selected && booking && (
            <div className={`${s.section} ${s.panel}`}>
              <div className={s.chosen}>
                <i className={`bi bi-arrow-left-right ${s.chosenIcon}`}></i>
                <div className={s.chosenText}>
                  Move to {dt(selected.startIso).toFormat("cccc 'at' h:mm a")}
                  <small>from {dt(booking.startIso).toFormat("cccc 'at' h:mm a")}</small>
                </div>
              </div>
              {error && <div className={s.error}>{error}</div>}
              <button className={`${s.btn} ${s.btnPrimary} ${s.btnBlock}`} onClick={reschedule} disabled={busy}>
                {busy ? "Moving..." : "Confirm new time"}
              </button>
            </div>
          )}
        </div>

        {/* Contact */}
        <div className={s.section}>
          <div className={s.contact}>
            <div className={s.contactText}>
              <h2 className={s.h2}>Can&apos;t make it, or have a question?</h2>
              <p>
                Please let {CONTACT.name} know as early as you can so someone else can take your spot.
                You can also change or cancel your time right on this page.
              </p>
            </div>
            <div className={s.contactActions}>
              <a className={`${s.btn} ${s.btnPrimary}`} href={mailto(booking ? `Showing ${booking.ref} - ${ADDRESS}` : `Showing - ${ADDRESS}`)}>
                <i className="bi bi-envelope"></i> Email {CONTACT.name}
              </a>
              {CONTACT.phone && (
                <>
                  <a className={s.btn} href={`sms:${CONTACT.phone}`}><i className="bi bi-chat"></i> Text</a>
                  <a className={s.btn} href={`tel:${CONTACT.phone}`}><i className="bi bi-telephone"></i> Call</a>
                </>
              )}
            </div>
          </div>
        </div>

        <p className={s.footer}>
          {ADDRESS} · <a href={LISTING_URL} target="_blank" rel="noopener noreferrer">Listing details</a>
        </p>
      </div>
    </div>
  );
}
