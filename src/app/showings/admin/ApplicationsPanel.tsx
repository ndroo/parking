"use client";
import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { SHOWING_UNITS } from "@/lib/showingUnits";
import PreviewFrame from "./PreviewFrame";

export interface AdminApplication {
  row: number; submittedAt: string; name: string; email: string; phone: string; occupants: string; moveIn: string;
  attracted: string; whyMoving: string; consentComms: string; consentCredit: string; pets: string; references: string;
  insurance: string; other: string; status: Status; statusUpdated: string; detectedIncome: number | null;
}

type Status = "New" | "Invited" | "Selected" | "Declined" | "Not selected";

export interface InviteTarget { unit: string; name: string; email: string; phone: string; row: number }

const units = SHOWING_UNITS.filter(u => u.bookable && u.applicationSheet);
const money = (n: number) => `$${Math.round(n).toLocaleString("en-CA")}`;
const badge: Record<Status, string> = { New: "text-bg-warning", Invited: "text-bg-info", Selected: "text-bg-success", Declined: "text-bg-secondary", "Not selected": "text-bg-secondary" };
type Tab = "New" | "Invited" | "Selected" | "Declined" | "All";
const inTab = (s: Status, t: Tab) => t === "All" || s === t || (t === "Declined" && s === "Not selected");

// Before a showing ("Not a fit") vs after an invite ("Not moving forward", covers no-shows too)
function declineText(stage: "Declined" | "Not selected", unitLabel: string, name: string, phone: string) {
  const first = name.trim().split(/\s+/)[0] || "there";
  const body = stage === "Declined"
    ? `Thanks for taking the time to apply for ${unitLabel} at 180 Beatrice. We've had a lot of interest, and after reviewing applications we won't be moving forward with yours this time.\n\nWe really appreciate your interest, and wish you the best of luck with your search.`
    : `Thanks for your interest in ${unitLabel} at 180 Beatrice. We've decided to go in another direction with the unit.\n\nWe really appreciate you taking the time to apply, and wish you the best of luck with your search.`;
  return `Hi ${first},\n\n${body}\n\nThanks,\nAndrew\n${phone}`;
}

export interface PanelBooking { unit: string; startIso: string; email: string }

export default function ApplicationsPanel({ adminKey, refreshKey, onInvite, bookings, onBookingsChanged }: {
  adminKey: string; refreshKey: number; onInvite: (t: InviteTarget) => void; bookings: PanelBooking[]; onBookingsChanged: () => void;
}) {
  const [unitSlug, setUnitSlug] = useState(units[0]?.slug || "");
  const [apps, setApps] = useState<AdminApplication[] | null>(null);
  const [rent, setRent] = useState<number | null>(null);
  const [filter, setFilter] = useState<Tab>("New");
  const [error, setError] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [decline, setDecline] = useState<{ app: AdminApplication; stage: "Declined" | "Not selected"; message: string; send: boolean; cancelBooking: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [declinePreview, setDeclinePreview] = useState<{ html: string; subject: string } | null>(null);
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
    if (data.cancelled) onBookingsChanged();
    return true;
  };

  // Rendered preview of the decline email, refreshed shortly after edits
  useEffect(() => {
    if (!decline?.send) { setDeclinePreview(null); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await fetch("/api/showings/admin/applications", {
        method: "POST", headers,
        body: JSON.stringify({ unit: unitSlug, name: decline.app.name, email: decline.app.email, message: decline.message, status: decline.stage, previewOnly: true }),
      });
      if (res.ok && !cancelled) setDeclinePreview(await res.json());
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [decline?.message, decline?.send, decline?.app.row]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!units.length) return null;
  const tabs: Tab[] = ["New", "Invited", "Selected", "Declined", "All"];
  const counts = Object.fromEntries(tabs.map(t => [t, (apps || []).filter(a => inTab(a.status, t)).length])) as Record<Tab, number>;
  const shown = (apps || []).filter(a => inTab(a.status, filter));
  const openDecline = (a: AdminApplication, stage: "Declined" | "Not selected") =>
    setDecline({ app: a, stage, message: declineText(stage, unit?.label || "the unit", a.name, "647-225-4909"), send: true, cancelBooking: true });

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
          {tabs.map(k => (
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
                  <div className="app-row">
                    <div className="app-info">
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <b>{a.name || "(no name)"}</b>
                        <span className={`badge ${badge[a.status]}`}>{a.status}</span>
                        {parking && <span className="badge text-bg-light border">Parking</span>}
                      </div>
                      <div className="small text-muted app-line">
                        Move-in {a.moveIn || "?"}
                        {a.detectedIncome ? <> · income ~{money(a.detectedIncome)}{ratio ? <b className={ratio >= 3 ? "text-success" : ratio >= 2.5 ? "text-warning-emphasis" : "text-danger"}> ({ratio.toFixed(1)}x rent)</b> : null}</> : " · income not detected"}
                        {" · "}Pets: {a.pets || "?"}
                      </div>
                      <div className="small text-muted">Applied {a.submittedAt}{a.statusUpdated ? ` · ${a.status} ${a.statusUpdated}` : ""}</div>
                    </div>
                    <div className="app-actions">
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => setOpen(isOpen ? null : a.row)}>{isOpen ? "Hide" : "Details"}</button>
                      {a.status === "New" && (
                        <>
                          <button className="btn btn-sm btn-success" onClick={() => onInvite({ unit: unitSlug, name: a.name, email: a.email, phone: a.phone, row: a.row })}>Invite to showing</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => openDecline(a, "Declined")}>Not a fit</button>
                        </>
                      )}
                      {a.status === "Invited" && (
                        <>
                          <button className="btn btn-sm btn-success" onClick={() => { if (confirm(`Mark ${a.name} as selected for the lease? This only changes their status; no email is sent.`)) setStatus(a, "Selected"); }}>Offer the lease</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => openDecline(a, "Not selected")}>Not moving forward</button>
                        </>
                      )}
                      {(a.status === "Declined" || a.status === "Not selected") && (
                        <button className="btn btn-sm btn-outline-success" onClick={() => onInvite({ unit: unitSlug, name: a.name, email: a.email, phone: a.phone, row: a.row })}>Invite to showing</button>
                      )}
                      {a.status !== "New" && a.status !== "Invited" && (
                        <button className="btn btn-sm btn-link text-muted" title="Move back a step" onClick={() => setStatus(a, a.status === "Declined" ? "New" : "Invited")}>Undo</button>
                      )}
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
          <div className="modal-dialog modal-xl modal-dialog-scrollable modal-fullscreen-md-down">
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title">{decline.stage === "Declined" ? "Not a fit" : "Not moving forward"}: {decline.app.name}</h5><button className="btn-close" onClick={() => setDecline(null)}></button></div>
              <div className="modal-body">
                <p className="small text-muted mb-2">This marks their application as {decline.stage === "Declined" ? "Declined" : "Not selected"} in the Sheet. You can Undo it later.</p>
                {(() => {
                  const booked = bookings.filter(b => b.unit === unit?.code && b.email.toLowerCase() === decline.app.email.toLowerCase());
                  if (!booked.length) return <p className="small mb-2">They don&apos;t have a showing booked.</p>;
                  const when = booked.map(b => DateTime.fromISO(b.startIso).setZone("America/Toronto").toFormat("ccc LLL d, h:mm a")).join(", ");
                  return (
                    <div className="form-check mb-2">
                      <input id="dec-cancel" className="form-check-input" type="checkbox" checked={decline.cancelBooking} onChange={e => setDecline({ ...decline, cancelBooking: e.target.checked })} />
                      <label htmlFor="dec-cancel" className="form-check-label">Also cancel their showing on <b>{when}</b> (frees the slot)</label>
                    </div>
                  );
                })()}
                <div className="form-check mb-2">
                  <input id="dec-send" className="form-check-input" type="checkbox" checked={decline.send} onChange={e => setDecline({ ...decline, send: e.target.checked })} />
                  <label htmlFor="dec-send" className="form-check-label">Email them this note (from your Gmail)</label>
                </div>
                <div className="row g-3">
                  <div className="col-lg-5">
                    <label className="form-label" htmlFor="dec-msg">Message</label>
                    <textarea id="dec-msg" className="form-control" rows={12} value={decline.message} disabled={!decline.send} onChange={e => setDecline({ ...decline, message: e.target.value })} />
                  </div>
                  <div className="col-lg-7">
                    <span className="form-label d-block">Preview{declinePreview ? `: ${declinePreview.subject}` : ""}</span>
                    {!decline.send ? (
                      <div className="text-muted small">No email will be sent.</div>
                    ) : declinePreview ? (
                      <PreviewFrame title="Decline preview" html={declinePreview.html} height={420} />
                    ) : (
                      <div className="text-muted small">Loading preview...</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setDecline(null)}>Keep as is</button>
                <button className="btn btn-danger" disabled={busy} onClick={async () => {
                  const ok = await setStatus(decline.app, decline.stage, { ...(decline.send ? { sendDecline: true, message: decline.message } : {}), cancelBooking: decline.cancelBooking });
                  if (ok) setDecline(null);
                }}>{busy ? "Working..." : decline.send ? "Confirm & send" : "Confirm"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
