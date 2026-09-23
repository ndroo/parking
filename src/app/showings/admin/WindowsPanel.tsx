"use client";
import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { SHOWING_UNITS } from "@/lib/showingUnits";

const TZ = "America/Toronto";
const bookable = SHOWING_UNITS.filter(u => u.bookable);

export interface AdminWindow { id: string; unit: string; unitLabel: string; startIso: string; endIso: string; booked: number; fromAdmin: boolean }

export default function WindowsPanel({ adminKey, onChange }: { adminKey: string; onChange?: (w: AdminWindow[]) => void }) {
  const [windows, setWindows] = useState<AdminWindow[] | null>(null);
  const [f, setF] = useState({ unit: bookable[0]?.slug || "", date: "", start: "18:00", end: "20:00" });
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const headers = { "Content-Type": "application/json", "x-admin-key": adminKey };

  const load = async () => {
    const res = await fetch("/api/showings/admin/windows", { headers, cache: "no-store" });
    const data = await res.json();
    if (res.ok) { setWindows(data.windows); onChange?.(data.windows); }
    else setStatus(data.error || "Couldn't load windows");
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setStatus("");
    const res = await fetch("/api/showings/admin/windows", { method: "POST", headers, body: JSON.stringify(f) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setStatus(data.error || "Failed");
    setStatus("Window added.");
    load();
  };

  const remove = async (w: AdminWindow) => {
    const label = `${DateTime.fromISO(w.startIso).setZone(TZ).toFormat("ccc LLL d, h:mm a")} (${w.unitLabel})`;
    if (!confirm(w.booked ? `${label} has ${w.booked} booking(s). Remove the window anyway? Those bookings stay on the calendar but no new ones can be made.` : `Remove the showing window on ${label}?`)) return;
    const res = await fetch(`/api/showings/admin/windows?id=${encodeURIComponent(w.id)}${w.booked ? "&force=1" : ""}`, { method: "DELETE", headers });
    if (!res.ok) return alert((await res.json()).error || "Failed");
    load();
  };

  const today = DateTime.now().setZone(TZ).toISODate()!;
  return (
    <div className="card mb-4">
      <div className="card-body">
        <h2 className="h5 mb-1">Showing windows</h2>
        <p className="text-muted small mb-3">
          Visitors can book {bookable[0]?.slotMinutes || 15}-minute slots inside these windows. Only today and future windows are shown to visitors; slots that have
          passed show as unavailable. You can also add an event called &quot;Showing window: Unit 3&quot; directly in the showings calendar.
        </p>
        {windows === null ? <p className="text-muted small">Loading...</p> : windows.length === 0 ? (
          <p className="small">No upcoming windows, so nobody can book right now.</p>
        ) : (
          <div className="table-responsive mb-3">
            <table className="table align-middle mb-0">
              <thead><tr><th>Unit</th><th>Day</th><th>Time</th><th>Booked</th><th></th></tr></thead>
              <tbody>
                {windows.map(w => {
                  const s = DateTime.fromISO(w.startIso).setZone(TZ), e = DateTime.fromISO(w.endIso).setZone(TZ);
                  const slots = Math.floor(e.diff(s, "minutes").minutes / 15);
                  return (
                    <tr key={w.id}>
                      <td>{w.unitLabel}</td>
                      <td className="text-nowrap">{s.toFormat("ccc LLL d")}</td>
                      <td className="text-nowrap">{s.toFormat("h:mm a")} - {e.toFormat("h:mm a")}</td>
                      <td>{w.booked} / {slots}</td>
                      <td className="text-end"><button className="btn btn-sm btn-outline-danger" onClick={() => remove(w)}>Remove</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <form onSubmit={add} className="row g-2 align-items-end">
          <div className="col-6 col-md-3">
            <label className="form-label" htmlFor="w-unit">Unit</label>
            <select id="w-unit" className="form-select" value={f.unit} onChange={e => setF({ ...f, unit: e.target.value })}>
              {bookable.map(u => <option key={u.slug} value={u.slug}>{u.label}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label" htmlFor="w-date">Date</label>
            <input id="w-date" className="form-control" type="date" min={today} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} required />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label" htmlFor="w-start">Start</label>
            <input id="w-start" className="form-control" type="time" step={900} value={f.start} onChange={e => setF({ ...f, start: e.target.value })} required />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label" htmlFor="w-end">End</label>
            <input id="w-end" className="form-control" type="time" step={900} value={f.end} onChange={e => setF({ ...f, end: e.target.value })} required />
          </div>
          <div className="col-12 col-md-2">
            <button className="btn btn-primary w-100" disabled={busy}>{busy ? "Adding..." : "Add window"}</button>
          </div>
        </form>
        {status && <div className="small mt-2">{status}</div>}
      </div>
    </div>
  );
}
