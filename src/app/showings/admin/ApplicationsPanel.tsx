"use client";
import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { SHOWING_UNITS } from "@/lib/showingUnits";

export interface AdminApplication {
  row: number; submittedAt: string; name: string; email: string; phone: string; occupants: string; moveIn: string;
  attracted: string; whyMoving: string; consentComms: string; consentCredit: string; pets: string; references: string;
  insurance: string; other: string; status: "New" | "Approved" | "Declined"; statusUpdated: string; detectedIncome: number | null;
}

export interface InviteTarget { unit: string; name: string; email: string; phone: string; row: number }

const units = SHOWING_UNITS.filter(u => u.bookable && u.applicationSheet);
const money = (n: number) => `$${Math.round(n).toLocaleString("en-CA")}`;
const badge = { New: "text-bg-warning", Approved: "text-bg-success", Declined: "text-bg-secondary" } as const;

function declineText(unitLabel: string, name: string, phone: string) {
  const first = name.trim().split(/\s+/)[0] || "there";
  return `Hi ${first},\n\nThanks for taking the time to apply for ${unitLabel} at 180 Beatrice. We've had a lot of interest, and after reviewing applications we won't be moving forward with yours this time.\n\nWe really appreciate your interest, and wish you the best of luck with your search.\n\nThanks,\nAndrew\n${phone}`;
}

export default function ApplicationsPanel({ adminKey, refreshKey, onInvite }: { adminKey: string; refreshKey: number; onInvite: (t: InviteTarget) => void }) {
  const [unitSlug, setUnitSlug] = useState(units[0]?.slug || "");
  const [apps, setApps] = useState<AdminApplication[] | null>(null);
  const [rent, setRent] = useState<number | null>(null);
  const [filter, setFilter] = useState<"All" | "New" | "Approved" | "Declined">("New");
  const [error, setError] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [decline, setDecline] = useState<{ app: AdminApplication; message: string; send: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const unit = units.find(u => u.slug === unitSlug);
  const headers = { "Content-Type": "application/json", "x-admin-key": adminKey };

  const load = async () => {
    setError("");
    const res = await fetch(`/api/showings/admin/applications?unit=${unitSlug}`, { headers, cache: "no-store" });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Couldn't load applications");
    setApps(data.applications);
    setRent(data.monthlyRent);
  };
  useEffect(() => { if (unitSlug) load(); }, [unitSlug, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = async (a: AdminApplication, status: AdminApplication["status"], extra: Record<string, unknown> = {}) => {
    setBusy(true);
    const res = await fetch("/api/showings/admin/applications", { method: "POST", headers, body: JSON.stringify({ unit: unitSlug, row: a.row, email: a.email, name: a.name, status, ...extra }) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { alert(data.error || "Failed"); return false; }
    load();
    return true;
  };

  if (!units.length) return null;
  const counts = { All: apps?.length || 0, New: 0, Approved: 0, Declined: 0 };
  apps?.forEach(a => counts[a.status]++);
  const shown = (apps || []).filter(a => filter === "All" || a.status === filter);

  return (
    <div className="card mb-4" id="applications">
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h2 className="h5 mb-0">Applications</h2>
            <div className="text-muted small">From the {unit?.label} application form and its Google Sheet{rent ? ` · rent ${money(rent)}/mo` : ""}</div>
          </div>
          <div className="d-flex gap-2 align-items-center">
            {units.length > 1 && (
              <select className="form-select form-select-sm" value={unitSlug} onChange={e => setUnitSlug(e.target.value)} aria-label="Unit">
                {units.map(u => <option key={u.slug} value={u.slug}>{u.label}</option>)}
              </select>
            )}
            <button className="btn btn-sm btn-outline-secondary" onClick={load}><i className="bi bi-arrow-clockwise"></i></button>
          </div>
        </div>

        <div className="btn-group btn-group-sm mb-3" role="group">
          {(["New", "Approved", "Declined", "All"] as const).map(k => (
            <button key={k} className={`btn ${filter === k ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setFilter(k)}>{k} ({counts[k]})</button>
          ))}
        </div>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}
        {apps === null && !error && <p className="text-muted small">Loading...</p>}
        {apps && shown.length === 0 && <p className="text-muted small mb-0">Nothing here.</p>}

        <div className="d-grid gap-2">
          {shown.map(a => {
            const ratio = a.detectedIncome && rent ? a.detectedIncome / (rent * 12) : null;
            const isOpen = open === a.row;
            const parking = /parking/i.test(a.other);
            return (
              <div key={a.row} className="card">
                <div className="card-body py-3">
                  <div className="d-flex flex-wrap justify-content-between gap-2">
                    <div style={{ minWidth: 0 }}>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <b>{a.name || "(no name)"}</b>
                        <span className={`badge ${badge[a.status]}`}>{a.status}</span>
                        {parking && <span className="badge text-bg-light border">Parking</span>}
                      </div>
                      <div className="small text-muted">
                        Move-in {a.moveIn || "?"}
                        {a.detectedIncome ? <> · income ~{money(a.detectedIncome)}{ratio ? <b className={ratio >= 3 ? "text-success" : ratio >= 2.5 ? "text-warning-emphasis" : "text-danger"}> ({ratio.toFixed(1)}x rent)</b> : null}</> : " · income not detected"}
                        {" · "}Pets: {a.pets.length > 40 ? a.pets.slice(0, 40) + "..." : a.pets || "?"}
                      </div>
                      <div className="small text-muted">Applied {a.submittedAt}{a.statusUpdated ? ` · ${a.status} ${a.statusUpdated}` : ""}</div>
                    </div>
                    <div className="d-flex gap-2 align-items-start flex-wrap">
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => setOpen(isOpen ? null : a.row)}>{isOpen ? "Hide" : "Details"}</button>
                      {a.status !== "Approved" && (
                        <button className="btn btn-sm btn-success" onClick={() => onInvite({ unit: unitSlug, name: a.name, email: a.email, phone: a.phone, row: a.row })}>
                          Approve &amp; invite
                        </button>
                      )}
                      {a.status !== "Declined" && (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => setDecline({ app: a, message: declineText(unit?.label || "the unit", a.name, "647-225-4909"), send: true })}>Decline</button>
                      )}
                      {a.status !== "New" && <button className="btn btn-sm btn-link" onClick={() => setStatus(a, "New")}>Reset</button>}
                    </div>
                  </div>
                  {isOpen && (
                    <dl className="row small mt-3 mb-0">
                      {([
                        ["Email", a.email], ["Phone", a.phone], ["Occupants", a.occupants], ["Attracted by", a.attracted], ["Why moving", a.whyMoving],
                        ["Pets", a.pets], ["References", a.references], ["Credit check", a.consentCredit], ["Email notices", a.consentComms],
                        ["Insurance", a.insurance], ["Other", a.other],
                      ] as [string, string][]).filter(([, v]) => v).map(([k, v]) => (
                        <div key={k} style={{ display: "contents" }}>
                          <dt className="col-sm-3 text-muted fw-semibold">{k}</dt>
                          <dd className="col-sm-9" style={{ whiteSpace: "pre-wrap" }}>{v}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {decline && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title">Decline {decline.app.name}?</h5><button className="btn-close" onClick={() => setDecline(null)}></button></div>
              <div className="modal-body">
                <div className="form-check mb-2">
                  <input id="dec-send" className="form-check-input" type="checkbox" checked={decline.send} onChange={e => setDecline({ ...decline, send: e.target.checked })} />
                  <label htmlFor="dec-send" className="form-check-label">Email them this note (from your Gmail)</label>
                </div>
                <textarea className="form-control" rows={10} value={decline.message} disabled={!decline.send} onChange={e => setDecline({ ...decline, message: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setDecline(null)}>Cancel</button>
                <button className="btn btn-danger" disabled={busy} onClick={async () => {
                  const ok = await setStatus(decline.app, "Declined", decline.send ? { sendDecline: true, message: decline.message } : {});
                  if (ok) setDecline(null);
                }}>{busy ? "Working..." : decline.send ? "Decline & send" : "Mark declined"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
