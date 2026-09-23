"use client";
import { useEffect, useState } from "react";
import { DateTime } from "luxon";

const TZ = "America/Toronto";
const KEY_STORAGE = "showingsAdminKey";

interface Booking {
  eventId: string;
  startIso: string;
  ref: string;
  name: string;
  email: string;
  phone: string;
  pet: string;
  createdAt: string;
}

export default function ShowingsAdmin() {
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState("");

  const load = async (k: string) => {
    const res = await fetch("/api/showings/admin", { headers: { "x-admin-key": k }, cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      setAuthed(false);
      setError(data.error || "Failed");
      return;
    }
    try { localStorage.setItem(KEY_STORAGE, k); } catch {}
    setAuthed(true);
    setError("");
    setBookings(data.bookings);
  };

  useEffect(() => {
    let k = new URLSearchParams(window.location.search).get("key") || "";
    try { k ||= localStorage.getItem(KEY_STORAGE) || ""; } catch {}
    if (k) { setKey(k); load(k); }
  }, []);

  const cancel = async (b: Booking) => {
    if (!confirm(`Cancel ${b.name}'s showing? This frees the slot. They are not notified automatically.`)) return;
    const res = await fetch(`/api/showings/admin?id=${encodeURIComponent(b.eventId)}`, { method: "DELETE", headers: { "x-admin-key": key } });
    if (!res.ok) return alert((await res.json()).error || "Failed");
    load(key);
  };

  if (!authed) {
    return (
      <div className="container py-5" style={{ maxWidth: 420 }}>
        <h1 className="h4 mb-3">Showings admin</h1>
        <form onSubmit={e => { e.preventDefault(); load(key); }} className="d-flex gap-2">
          <input className="form-control" type="password" placeholder="Admin key" value={key} onChange={e => setKey(e.target.value)} />
          <button className="btn btn-primary">Open</button>
        </form>
        {error && <div className="text-danger mt-2">{error}</div>}
      </div>
    );
  }

  let lastDay = "";
  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h4 mb-0">Showings ({bookings.length})</h1>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => load(key)}><i className="bi bi-arrow-clockwise"></i> Refresh</button>
      </div>
      {bookings.length === 0 && <p className="text-muted">No bookings yet.</p>}
      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr><th>Time</th><th>Name</th><th>Phone</th><th>Email</th><th>Pet</th><th>Ref</th><th></th></tr>
          </thead>
          <tbody>
            {bookings.map(b => {
              const t = DateTime.fromISO(b.startIso).setZone(TZ);
              const day = t.toFormat("ccc LLL d");
              const showDay = day !== lastDay;
              lastDay = day;
              return (
                <tr key={b.eventId}>
                  <td className="text-nowrap">{showDay ? <b>{day} </b> : null}{t.toFormat("h:mm a")}</td>
                  <td>{b.name}</td>
                  <td className="text-nowrap"><a className="text-primary" href={`tel:${b.phone}`}>{b.phone}</a></td>
                  <td><a className="text-primary" href={`mailto:${b.email}`}>{b.email}</a></td>
                  <td>{b.pet || <span className="text-muted">-</span>}</td>
                  <td className="font-monospace small">{b.ref}</td>
                  <td><button className="btn btn-sm btn-outline-danger" onClick={() => cancel(b)}>Cancel</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
