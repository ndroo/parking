"use client";
import { useEffect, useState } from "react";
import { DateTime } from "luxon";

const TZ = "America/Toronto";
const LISTING_URL = "https://little-italy-rentals.mylistingai.co/listing/180-beatrice-st-toronto-on-m6g-3g1-canada-167074";
const ADDRESS = "Unit 3, 180 Beatrice St, Toronto, ON M6G 3G1";

interface Slot {
  startIso: string;
  endIso: string;
  taken: boolean;
  firstName: string | null;
  past: boolean;
}

interface Confirmation {
  ref: string;
  startIso: string;
  endIso: string;
}

const fmtTime = (iso: string) => DateTime.fromISO(iso).setZone(TZ).toFormat("h:mm a");
const fmtDay = (iso: string) => DateTime.fromISO(iso).setZone(TZ).toFormat("cccc, LLLL d");

function calendarLinks(c: Confirmation) {
  const s = DateTime.fromISO(c.startIso).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
  const e = DateTime.fromISO(c.endIso).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
  const title = "Apartment showing - Unit 3, 180 Beatrice St";
  const details = `Showing reference ${c.ref}. Listing: ${LISTING_URL}`;
  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${s}/${e}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(ADDRESS)}`;
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//180 Beatrice//Showings//EN", "BEGIN:VEVENT",
    `UID:${c.ref}@180beatrice`, `DTSTAMP:${s}`, `DTSTART:${s}`, `DTEND:${e}`,
    `SUMMARY:${title}`, `LOCATION:${ADDRESS.replace(/,/g, "\\,")}`, `DESCRIPTION:${details}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return { google, ics: `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}` };
}

export default function Showings() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pet, setPet] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/showings", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSlots(data.slots);
      setLoadError("");
    } catch (e: any) {
      setLoadError(e.message || "Could not load showing times");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const book = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/showings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startIso: selected.startIso, name, email, phone, pet }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not book that time");
        if (res.status === 409) load();
        return;
      }
      setConfirmation(data);
      setSelected(null);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const days = slots.reduce<Record<string, Slot[]>>((acc, s) => {
    const k = fmtDay(s.startIso);
    (acc[k] ||= []).push(s);
    return acc;
  }, {});

  return (
    <div className="container py-4" style={{ maxWidth: 820 }}>
      <h1 className="h2 mb-1">Book a showing</h1>
      <p className="text-muted mb-4">{ADDRESS}</p>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <p className="mb-2">
            Showings are one visitor at a time, 15 minutes each, so we can get to know each other a little.
            Pick any open time below. Full listing details are{" "}
            <a href={LISTING_URL} target="_blank" rel="noopener noreferrer" className="text-primary text-decoration-underline">here</a>.
          </p>
          <ul className="mb-0 small text-muted ps-3">
            <li className="mb-1"><b>Have a pet?</b> Please bring them along to the showing.</li>
            <li><b>Good to know:</b> the building&apos;s boiler and outdoor water shut-offs are in a mechanical room reached through this unit. We&apos;ll need access about once a year for servicing (arranged ahead, ideally while you&apos;re home), and occasionally on short notice in an emergency.</li>
          </ul>
        </div>
      </div>

      {confirmation && (
        <div className="alert alert-success">
          <h5 className="alert-heading mb-2"><i className="bi bi-check-circle me-2"></i>You&apos;re booked</h5>
          <p className="mb-2">
            {fmtDay(confirmation.startIso)} at {fmtTime(confirmation.startIso)}. Reference <b>{confirmation.ref}</b>.
          </p>
          <div className="d-flex flex-wrap gap-2">
            <a className="btn btn-sm btn-outline-success" href={calendarLinks(confirmation).google} target="_blank" rel="noopener noreferrer">
              <i className="bi bi-google me-1"></i>Add to Google Calendar
            </a>
            <a className="btn btn-sm btn-outline-success" href={calendarLinks(confirmation).ics} download="180-beatrice-showing.ics">
              <i className="bi bi-calendar-plus me-1"></i>Download .ics
            </a>
          </div>
          <p className="small mb-0 mt-2">Need to change it? Email andrewjohnmcgrath@gmail.com.</p>
        </div>
      )}

      {loading && <div className="text-muted">Loading times...</div>}
      {loadError && <div className="alert alert-danger">{loadError}</div>}

      {Object.entries(days).map(([day, daySlots]) => (
        <div key={day} className="mb-4">
          <h2 className="h5 mb-3">{day}</h2>
          <div className="row g-2">
            {daySlots.map(s => {
              const disabled = s.taken || s.past || !!confirmation;
              const isSel = selected?.startIso === s.startIso;
              return (
                <div key={s.startIso} className="col-6 col-sm-4 col-md-3">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => { setSelected(s); setError(""); }}
                    className={`btn w-100 py-2 ${isSel ? "btn-primary" : s.taken ? "btn-light border" : "btn-outline-primary"}`}
                  >
                    <div className="fw-medium">{fmtTime(s.startIso)}</div>
                    <div className="small" style={{ minHeight: "1.2em" }}>
                      {s.taken ? <span className="text-muted">{s.firstName}</span> : s.past ? <span className="text-muted">Passed</span> : "Open"}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {selected && (
        <form onSubmit={book} className="card border-primary mb-4">
          <div className="card-header bg-primary bg-opacity-10">
            <b>{fmtDay(selected.startIso)}, {fmtTime(selected.startIso)} - {fmtTime(selected.endIso)}</b>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Full name</label>
                <input className="form-control" value={name} onChange={e => setName(e.target.value)} required autoComplete="name" />
              </div>
              <div className="col-md-6">
                <label className="form-label">Phone</label>
                <input className="form-control" type="tel" value={phone} onChange={e => setPhone(e.target.value)} required autoComplete="tel" />
              </div>
              <div className="col-md-6">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="col-md-6">
                <label className="form-label">Pet you&apos;ll bring <span className="text-muted small">(optional)</span></label>
                <input className="form-control" value={pet} onChange={e => setPet(e.target.value)} placeholder="e.g. Dog, 3yo lab" />
              </div>
            </div>
            <p className="small text-muted mt-3 mb-0">Other visitors see only your first name next to your time.</p>
            {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
          </div>
          <div className="card-footer d-flex gap-2 justify-content-end">
            <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Booking..." : "Book this time"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
