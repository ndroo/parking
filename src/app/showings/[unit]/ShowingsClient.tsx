"use client";
import { useEffect, useRef, useState } from "react";
import { DateTime } from "luxon";
import s from "../showings.module.css";
import type { ListingDetails } from "@/lib/listingai";
import { BUILDING_ADDRESS, ShowingUnit, TENANT_GUIDE } from "@/lib/showingUnits";

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

interface Contact {
  name: string;
  phone: string;
  email: string;
}

type Mode = "book" | "ticket" | "reschedule" | "lookup";

const dt = (iso: string) => DateTime.fromISO(iso).setZone(TZ);
const fmtTime = (iso: string) => dt(iso).toFormat("h:mm a");
const fmtDay = (iso: string) => dt(iso).toFormat("cccc, LLLL d");
const dayKey = (iso: string) => dt(iso).toISODate()!;
const telHref = (phone: string) => phone.replace(/[^\d+]/g, "");

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

function calendarLinks(unit: ShowingUnit, contact: Contact, b: Booking) {
  const address = `${unit.label}, ${BUILDING_ADDRESS}`;
  const a = DateTime.fromISO(b.startIso).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
  const z = DateTime.fromISO(b.endIso).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
  const title = `Apartment showing - ${address}`;
  const reach = [contact.phone, contact.email].filter(Boolean).join(" or ");
  const details = `Reference ${b.ref}. Listing: ${unit.listingUrl}. Can't make it? Let ${contact.name} know at ${reach}.`;
  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${a}/${z}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(address)}`;
  const esc = (v: string) => v.replace(/[,;]/g, m => `\\${m}`);
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//180 Beatrice//Showings//EN", "BEGIN:VEVENT",
    `UID:${b.ref}@180beatrice`, `DTSTAMP:${a}`, `DTSTART:${a}`, `DTEND:${z}`,
    `SUMMARY:${esc(title)}`, `LOCATION:${esc(address)}`, `DESCRIPTION:${esc(details)}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return { google, ics: `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}` };
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

function Stepper({ labels, current }: { labels: string[]; current: number }) {
  const done = current >= labels.length - 1;
  const pct = done ? 100 : ((current + 0.5) / labels.length) * 100;
  return (
    <div className={s.progress}>
      <div className={s.progressHead}>
        <span className={s.progressStep}>{done ? "All done" : `Step ${current + 1} of ${labels.length}`}</span>
        <span className={s.progressLabel}>{done ? "Your showing is booked" : `${labels[current]}${current < labels.length - 2 ? `, then ${labels[current + 1].toLowerCase()}` : ""}`}</span>
      </div>
      <div className={s.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
        <div className={`${s.progressFill} ${done ? s.progressDone : ""}`} style={{ width: `${pct}%` }}></div>
      </div>
    <ol className={s.stepper} aria-label="Booking steps">
      {labels.map((label, i) => {
        const state = i < current ? s.stepDone : i === current ? s.stepCurrent : "";
        return (
          <li key={label} className={`${s.step} ${state}`} aria-current={i === current ? "step" : undefined}>
            <span className={s.stepDot}>{i < current ? <i className="bi bi-check-lg"></i> : i + 1}</span>
            <span className={s.stepLabel}>{label}</span>
          </li>
        );
      })}
    </ol>
    </div>
  );
}

function ConfirmDialog({ open, title, body, confirmLabel, cancelLabel, busy, onConfirm, onClose }: {
  open: boolean; title: string; body: React.ReactNode; confirmLabel: string; cancelLabel: string; busy: boolean;
  onConfirm: () => void; onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);
  if (!open) return null;
  return (
    <div className={s.overlay} onClick={() => !busy && onClose()}>
      <div className={s.dialog} role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" onClick={e => e.stopPropagation()}>
        <div className={s.dialogIcon}><i className="bi bi-calendar-x"></i></div>
        <h2 id="dlg-title" className={s.h2}>{title}</h2>
        <div className={s.dialogBody}>{body}</div>
        <div className={s.dialogActions}>
          <button className={s.btn} onClick={onClose} disabled={busy} autoFocus>{cancelLabel}</button>
          <button className={`${s.btn} ${s.btnDangerSolid}`} onClick={onConfirm} disabled={busy}>
            {busy ? "Cancelling..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Notes({ unit, title }: { unit: ShowingUnit; title: string }) {
  return (
    <div className={s.notes}>
      <p className={s.notesTitle}>{title}</p>
      <ul>
        {unit.facts.map(f => (
          <li key={f.title}>
            <span className={s.factIcon}><i className={`bi ${f.icon}`}></i></span>
            <span><b>{f.title}.</b> {f.body}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ListingHero({ unit, listing }: { unit: ShowingUnit; listing: ListingDetails | null }) {
  const specs = listing ? [
    listing.beds && { icon: "bi-door-open", text: listing.beds },
    listing.baths && { icon: "bi-droplet", text: listing.baths },
    listing.size && { icon: "bi-arrows-angle-expand", text: /\d$/.test(listing.size) ? `${listing.size} sq ft` : listing.size },
    listing.parking && { icon: "bi-car-front", text: `Parking: ${listing.parking}` },
  ].filter(Boolean) as { icon: string; text: string }[] : [];

  return (
    <section className={s.listing}>
      {listing && listing.photos.length > 0 && (
        <div className={s.gallery}>
          {listing.photos.map((p, i) => (
            <figure key={p.url} className={s.photo}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.caption || `${unit.label} photo ${i + 1}`} loading={i < 2 ? "eager" : "lazy"} />
            </figure>
          ))}
        </div>
      )}
      <div className={s.listingBody}>
        <div className={s.listingTop}>
          <div>
            <span className={s.eyebrow}>
              <i className="bi bi-house-heart"></i> {listing?.status || "For rent"}{unit.bookable ? " · Private showings" : ""}
            </span>
            <h1 className={s.title}>{unit.label}, 180 Beatrice</h1>
          </div>
          {listing?.price && (
            <div className={s.price}>
              {listing.price}<span>/month</span>
            </div>
          )}
        </div>
        {(listing?.headline || unit.blurb) && <p className={s.lede}>{listing?.headline || unit.blurb}</p>}
        {specs.length > 0 && (
          <div className={s.specs}>
            {specs.map(x => <span key={x.text} className={s.spec}><i className={`bi ${x.icon}`}></i>{x.text}</span>)}
          </div>
        )}
        {listing && listing.highlights.length > 0 && (
          <ul className={s.highlights}>
            {listing.highlights.map(h => <li key={h}><i className="bi bi-check2"></i>{h}</li>)}
          </ul>
        )}
        <div className={s.heroActions}>
          {unit.bookable && (
            <a className={`${s.btn} ${s.btnPrimary}`} href="#book">
              Book a showing <i className="bi bi-arrow-down"></i>
            </a>
          )}
          <a className={s.btn} href={unit.listingUrl} target="_blank" rel="noopener noreferrer">
            Full listing{listing?.photos.length ? ` · ${listing.photos.length} photos` : ""} <i className="bi bi-arrow-up-right"></i>
          </a>
        </div>
      </div>
    </section>
  );
}

export default function Showings({ unit, listing, contact }: { unit: ShowingUnit; listing: ListingDetails | null; contact: Contact }) {
  const store = storeFor(unit);
  const manage = (body: Record<string, string>) => manageApi(unit, body);

  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [activeDay, setActiveDay] = useState("");
  const [selected, setSelected] = useState<Slot | null>(null);
  const [step, setStep] = useState<0 | 1>(0);
  const [mode, setMode] = useState<Mode>("book");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", pet: "" });
  const [lookupForm, setLookupForm] = useState({ ref: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const flowRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLDivElement>(null);

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
    if (!unit.bookable) return;
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
          setNotice("Your previous showing is no longer on the schedule. If that's a surprise, please get in touch.");
        }
      });
    }
    return () => clearInterval(t);
  }, []);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>, block: ScrollLogicalPosition = "start") =>
    setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block }), 60);

  const goStep = (n: 0 | 1) => {
    setStep(n);
    setError("");
    scrollTo(flowRef);
  };

  const choose = (slot: Slot) => {
    setSelected(slot);
    setError("");
    scrollTo(continueRef, "nearest");
  };

  const done = (b: Booking) => {
    store.set(b);
    setBooking(b);
    setSelected(null);
    setStep(0);
    setMode("ticket");
    setConfirmCancel(false);
    setNotice("");
    scrollTo(flowRef);
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
    setBusy(true);
    const { ok, data } = await manage({ action: "cancel", ref: booking.ref, email: booking.email });
    setBusy(false);
    if (!ok) {
      setConfirmCancel(false);
      return setError(data.error);
    }
    store.clear();
    setBooking(null);
    setConfirmCancel(false);
    setMode("book");
    setStep(0);
    setNotice("Your showing is cancelled and the time has been released. Thanks for letting us know.");
    scrollTo(flowRef);
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
  const isMine = (x: Slot) => !!booking && dt(x.startIso).toMillis() === dt(booking.startIso).toMillis();

  const stepLabels = mode === "reschedule" ? ["Pick a new time", "Confirm", "Updated"] : ["Pick a time", "Your details", "You're booked"];
  const currentStep = mode === "ticket" ? 2 : step;
  const mailSubject = booking ? `Showing ${booking.ref} - ${unit.label}, 180 Beatrice` : `Showing - ${unit.label}, 180 Beatrice`;

  return (
    <div className={s.page}>
      <div className={s.wrap}>
        <a className={s.back} href="/showings"><i className="bi bi-arrow-left"></i> All units</a>

        <ListingHero unit={unit} listing={listing} />

        <div ref={flowRef} id="book" className={s.flowAnchor}></div>

        {notice && <div className={s.notice}>{notice}</div>}

        {!unit.bookable ? (
          <div className={`${s.section} ${s.closed}`}>
            <div className={s.closedIcon}><i className="bi bi-calendar-x"></i></div>
            <h2 className={s.h2}>Not taking showings right now</h2>
            <p className={s.sub}>
              {unit.label} is {listing?.status?.toLowerCase() === "leased" ? "currently leased" : "currently rented"}, so there are no times to book.
              Interested for the future, or in another unit? Get in touch below.
            </p>
            <a className={`${s.btn} ${s.btnPrimary}`} href="/showings" style={{ marginTop: 16 }}>
              See units with open showings <i className="bi bi-arrow-right"></i>
            </a>
          </div>
        ) : mode === "lookup" ? (
          <div className={`${s.section} ${s.panel}`}>
            <div className={s.sectionHead}>
              <div>
                <h2 className={s.h2}>Find your booking</h2>
                <p className={s.sub}>Enter the reference code from your confirmation and the email you booked with.</p>
              </div>
              <button className={s.linkBtn} onClick={() => { setMode("book"); setError(""); }}>Back</button>
            </div>
            <form onSubmit={lookup}>
              <div className={s.fields}>
                <div className={s.field}>
                  <label htmlFor="lk-ref">Reference code</label>
                  <input id="lk-ref" value={lookupForm.ref} onChange={e => setLookupForm({ ...lookupForm, ref: e.target.value.toUpperCase() })} placeholder="ABC123" required autoCapitalize="characters" />
                </div>
                <div className={s.field}>
                  <label htmlFor="lk-email">Email</label>
                  <input id="lk-email" type="email" value={lookupForm.email} onChange={e => setLookupForm({ ...lookupForm, email: e.target.value })} required autoComplete="email" />
                </div>
              </div>
              {error && <div className={s.error}>{error}</div>}
              <button className={`${s.btn} ${s.btnPrimary} ${s.btnBlock}`} disabled={busy}>{busy ? "Looking..." : "Find my booking"}</button>
            </form>
          </div>
        ) : (
          <>
            <div className={s.flowHead}>
              <span className={s.flowTitle}>{mode === "ticket" ? "Your showing" : "Book in 3 quick steps"}</span>
              {!booking && (
                <button className={s.linkBtn} onClick={() => { setMode("lookup"); setError(""); setSelected(null); setStep(0); scrollTo(flowRef); }}>
                  Already booked? Manage it
                </button>
              )}
            </div>
            <Stepper labels={stepLabels} current={currentStep} />

            {/* Step 1: pick a time */}
            {mode !== "ticket" && step === 0 && (
              <div className={`${s.section} ${s.panel}`}>
                <div className={s.sectionHead}>
                  <div>
                    <h2 className={s.h2}>{mode === "reschedule" ? "Pick a new time" : "Pick a time that works"}</h2>
                    <p className={s.sub}>
                      {mode === "reschedule" && booking
                        ? `You're currently booked for ${dt(booking.startIso).toFormat("cccc 'at' h:mm a")}.`
                        : `15 minutes each, one visitor at a time. Toronto time.`}
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
                      <button key={k} className={`${s.day} ${k === activeDay ? s.dayActive : ""}`} onClick={() => setActiveDay(k)}>
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
                      <button key={x.startIso} className={cls} disabled={unavailable || mine} onClick={() => choose(x)} aria-pressed={sel}>
                        <span className={s.slotTime}>{fmtTime(x.startIso)}</span>
                        <span className={s.slotState}>{mine ? "Your time" : x.past ? "Passed" : x.taken ? "Booked" : sel ? "Selected" : "Available"}</span>
                      </button>
                    );
                  })}
                </div>

                <div ref={continueRef} className={`${s.continueBar} ${selected ? s.continueSticky : ""}`}>
                  <div className={s.continueText}>
                    {selected ? (
                      <><b>{dt(selected.startIso).toFormat("ccc, LLL d")}</b> at <b>{fmtTime(selected.startIso)}</b></>
                    ) : (
                      <span className={s.mutedText}>Pick a time above to continue</span>
                    )}
                  </div>
                  <button className={`${s.btn} ${s.btnPrimary}`} disabled={!selected} onClick={() => goStep(1)}>
                    {selected ? "Next step" : "Continue"} <i className="bi bi-arrow-right"></i>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: details (new booking) */}
            {mode === "book" && step === 1 && selected && (
              <form onSubmit={book} className={`${s.section} ${s.panel}`}>
                <div className={s.chosen}>
                  <i className={`bi bi-clock ${s.chosenIcon}`}></i>
                  <div className={s.chosenText}>
                    {fmtDay(selected.startIso)}
                    <small>{fmtTime(selected.startIso)} - {fmtTime(selected.endIso)}</small>
                  </div>
                  <button type="button" className={s.linkBtn} onClick={() => goStep(0)}>Change</button>
                </div>
                <h2 className={s.h2} style={{ marginBottom: 14 }}>Tell us who&apos;s coming</h2>
                <div className={s.fields}>
                  <div className={s.field}>
                    <label htmlFor="f-name">Full name</label>
                    <input id="f-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required autoComplete="name" />
                  </div>
                  <div className={s.field}>
                    <label htmlFor="f-phone">Phone</label>
                    <input id="f-phone" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required autoComplete="tel" />
                  </div>
                  <div className={s.field}>
                    <label htmlFor="f-email">Email</label>
                    <input id="f-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required autoComplete="email" />
                  </div>
                  <div className={s.field}>
                    <label htmlFor="f-pet">Pet you&apos;ll bring <span className={s.optional}>(optional)</span></label>
                    <input id="f-pet" value={form.pet} onChange={e => setForm({ ...form, pet: e.target.value })} placeholder="e.g. Dog, 3 year old lab" />
                  </div>
                </div>
                <Notes unit={unit} title="Before you book" />
                {error && <div className={s.error}>{error}</div>}
                <div className={s.row}>
                  <button type="button" className={s.btn} style={{ flex: "0 0 auto" }} onClick={() => goStep(0)}>
                    <i className="bi bi-arrow-left"></i> Back
                  </button>
                  <button className={`${s.btn} ${s.btnPrimary}`} disabled={busy}>
                    {busy ? "Booking..." : `Book ${fmtTime(selected.startIso)} showing`}
                  </button>
                </div>
                <p className={s.fine}>Your details are only shared with us, to confirm your showing.</p>
              </form>
            )}

            {/* Step 2: confirm (reschedule) */}
            {mode === "reschedule" && step === 1 && selected && booking && (
              <div className={`${s.section} ${s.panel}`}>
                <div className={s.chosen}>
                  <i className={`bi bi-arrow-left-right ${s.chosenIcon}`}></i>
                  <div className={s.chosenText}>
                    Move to {dt(selected.startIso).toFormat("cccc 'at' h:mm a")}
                    <small>from {dt(booking.startIso).toFormat("cccc 'at' h:mm a")}. Your reference stays {booking.ref}.</small>
                  </div>
                </div>
                {error && <div className={s.error}>{error}</div>}
                <div className={s.row}>
                  <button className={s.btn} style={{ flex: "0 0 auto" }} onClick={() => goStep(0)}>
                    <i className="bi bi-arrow-left"></i> Back
                  </button>
                  <button className={`${s.btn} ${s.btnPrimary}`} onClick={reschedule} disabled={busy}>
                    {busy ? "Moving..." : "Confirm new time"}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: ticket */}
            {mode === "ticket" && booking && (
              <div className={s.ticket}>
                <div className={s.ticketTop}>
                  <span className={s.ticketBadge}><i className="bi bi-check2-circle"></i> You&apos;re booked, {booking.name.split(/\s+/)[0]}</span>
                  <div className={s.ticketDay}>{fmtDay(booking.startIso)}</div>
                  <div className={s.ticketTime}>{fmtTime(booking.startIso)} - {fmtTime(booking.endIso)}</div>
                  <div className={s.ticketPlace}><i className="bi bi-geo-alt"></i> {unit.label}, {BUILDING_ADDRESS}</div>
                </div>
                <div className={s.perf}></div>
                <div className={s.ticketBody}>
                  <div className={s.refLabel}>Reference code - screenshot or jot this down</div>
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
                      <a className={s.btn} href={calendarLinks(unit, contact, booking).google} target="_blank" rel="noopener noreferrer">
                        <i className="bi bi-google"></i> Google Calendar
                      </a>
                      <a className={s.btn} href={calendarLinks(unit, contact, booking).ics} download="180-beatrice-showing.ics">
                        <i className="bi bi-calendar-plus"></i> Apple / Outlook
                      </a>
                    </div>
                    <div className={s.grid2}>
                      <button className={s.btn} onClick={() => { setMode("reschedule"); setStep(0); setSelected(null); setError(""); setActiveDay(dayKey(booking.startIso)); scrollTo(flowRef); }}>
                        <i className="bi bi-arrow-left-right"></i> Change time
                      </button>
                      <button className={`${s.btn} ${s.btnDanger}`} onClick={() => setConfirmCancel(true)} disabled={busy}>
                        <i className="bi bi-x-circle"></i> Cancel showing
                      </button>
                    </div>
                  </div>
                  <Notes unit={unit} title="See you soon. A few reminders:" />
                </div>
              </div>
            )}

            {/* Final screen: more reading */}
            {mode === "ticket" && booking && (
              <div className={`${s.section} ${s.panel}`}>
                <span className={s.flowTitle}>More reading</span>
                <h2 className={s.h2} style={{ margin: "6px 0 6px" }}>Get to know the house (and us)</h2>
                <p className={s.sub} style={{ lineHeight: 1.55 }}>
                  Our guide covers the history of the house, the renovations, what we look for in a tenant and an FAQ.
                  Here&apos;s the short version of how to become the selected tenant:
                </p>
                <ol className={s.tips}>
                  {TENANT_GUIDE.tips.map(t => <li key={t}>{t}</li>)}
                </ol>
                <a className={`${s.btn} ${s.btnPrimary}`} href={TENANT_GUIDE.url}>
                  Read the full guide <i className="bi bi-arrow-right"></i>
                </a>
              </div>
            )}
          </>
        )}

        {/* Contact */}
        <div className={`${s.section} ${s.contactCard}`}>
          <div className={s.contactText}>
            {unit.bookable ? (
              <>
                <h2 className={s.h2}>Can&apos;t make it, or running late?</h2>
                <p>
                  Please call or text {contact.name} as early as you can so someone else can take your spot.
                  You can also change or cancel your time right on this page.
                </p>
              </>
            ) : (
              <>
                <h2 className={s.h2}>Questions about 180 Beatrice?</h2>
                <p>Call, text or email {contact.name}.</p>
              </>
            )}
            {contact.phone && <a className={s.phoneBig} href={`tel:${telHref(contact.phone)}`}>{contact.phone}</a>}
          </div>
          <div className={s.contactActions}>
            {contact.phone && (
              <>
                <a className={`${s.btn} ${s.btnPrimary}`} href={`tel:${telHref(contact.phone)}`}><i className="bi bi-telephone"></i> Call</a>
                <a className={s.btn} href={`sms:${telHref(contact.phone)}`}><i className="bi bi-chat-dots"></i> Text</a>
              </>
            )}
            <a className={s.btn} href={`mailto:${contact.email}?subject=${encodeURIComponent(mailSubject)}`}>
              <i className="bi bi-envelope"></i> Email
            </a>
          </div>
        </div>

        {booking && (
          <ConfirmDialog
            open={confirmCancel}
            title="Cancel your showing?"
            body={<>This releases your {dt(booking.startIso).toFormat("cccc 'at' h:mm a")} time so someone else can book it. You can book a new time afterwards if one is open.</>}
            confirmLabel="Yes, cancel"
            cancelLabel="Keep it"
            busy={busy}
            onConfirm={cancel}
            onClose={() => setConfirmCancel(false)}
          />
        )}

        <p className={s.footer}>
          {unit.label}, {BUILDING_ADDRESS} · <a href={unit.listingUrl} target="_blank" rel="noopener noreferrer">Listing details</a>
        </p>
      </div>
    </div>
  );
}
