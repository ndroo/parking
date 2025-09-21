"use client";
import { useState } from "react";
import { formatPrice, calculateBestPrice } from "@/lib/pricing";

export default function Manage() {
  const [spot, setSpot] = useState("northern");
  const [ref, setRef] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [status, setStatus] = useState("");

  const reschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Rescheduling...");
    const res = await fetch(`/api/booking/${ref}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spot, startIso: start, endIso: end }),
    });
    const json = await res.json();
    if (!res.ok) return setStatus(json.error || "Failed");
    setStatus("Updated!");
  };

  const cancel = async () => {
    setStatus("Cancelling...");
    const res = await fetch(`/api/booking/${ref}?spot=${spot}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) return setStatus(json.error || "Failed");
    setStatus("Cancelled.");
  };

  const quote = start && end ? formatPrice(calculateBestPrice(start, end).totalCents) : null;

  return (
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <h1 className="mb-3">Manage Booking</h1>
          <form onSubmit={reschedule} className="card p-3">
            <div className="mb-3">
              <label className="form-label">Spot</label>
              <select className="form-select" value={spot} onChange={e => setSpot(e.target.value)}>
                <option value="northern">Northern</option>
                <option value="southern">Southern</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Reference Code</label>
              <input className="form-control" value={ref} onChange={e => setRef(e.target.value.toUpperCase())} required />
            </div>
            <div className="mb-3">
              <label className="form-label">New Start</label>
              <input className="form-control" type="datetime-local" value={start} onChange={e => setStart(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="form-label">New End</label>
              <input className="form-control" type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} />
            </div>
            {quote && <div className="mb-2">New price estimate: <b>{quote}</b></div>}
            <div className="d-flex gap-2">
              <button className="btn btn-primary" type="submit">Reschedule</button>
              <button className="btn btn-outline-danger" type="button" onClick={cancel}>Cancel Booking</button>
            </div>
          </form>
          {status && <div className="mt-3">{status}</div>}
        </div>
      </div>
    </div>
  );
}


