"use client";
import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { SHOWING_UNITS } from "@/lib/showingUnits";
import type { AdminApplication } from "./ApplicationsPanel";

export interface ModalBooking { unit: string; startIso: string; email: string; ref: string; pet?: string; phone?: string; name: string }

const TZ = "America/Toronto";
const money = (n: number) => `$${Math.round(n).toLocaleString("en-CA")}`;

// Everything we know about one person: their application (matched by email) and bookings
export default function ApplicantModal({ adminKey, unitCode, email, name, bookings, application, onClose }: {
  adminKey: string; unitCode: string; email: string; name: string; bookings: ModalBooking[]; application?: AdminApplication; onClose: () => void;
}) {
  const unit = SHOWING_UNITS.find(u => u.code === unitCode);
  const [app, setApp] = useState<AdminApplication | null | undefined>(application);
  const [rent, setRent] = useState<number | null>(null);

  useEffect(() => {
    if (!unit?.applicationSheet) { setApp(null); return; }
    fetch(`/api/showings/admin/applications?unit=${unit.slug}`, { headers: { "x-admin-key": adminKey }, cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        setRent(d.monthlyRent || null);
        if (!application) setApp((d.applications || []).find((a: AdminApplication) => a.email.toLowerCase() === email.toLowerCase()) || null);
      })
      .catch(() => { if (!application) setApp(null); });
  }, [unit?.slug, email]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const mine = bookings.filter(b => b.email.toLowerCase() === email.toLowerCase() && b.unit === unitCode);
  const ratio = app?.detectedIncome && rent ? app.detectedIncome / (rent * 12) : null;
  const rows: [string, string | undefined][] = app ? [
    ["Status", app.status], ["Applied", app.submittedAt], ["Email", app.email], ["Phone", app.phone], ["Move-in", app.moveIn],
    ["Occupants", app.occupants], ["Income (detected)", app.detectedIncome ? `${money(app.detectedIncome)}${ratio ? ` · ${ratio.toFixed(1)}x rent` : ""}` : "Not detected"],
    ["Pets", app.pets], ["Attracted by", app.attracted], ["Why moving", app.whyMoving], ["References", app.references],
    ["Credit check", app.consentCredit], ["Email notices", app.consentComms], ["Insurance", app.insurance], ["Other", app.other],
  ] : [];

  return (
    <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable modal-fullscreen-md-down" onClick={e => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{app?.name || name}{unit ? <span className="text-muted fw-normal"> · {unit.label}</span> : null}</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <h6 className="text-muted text-uppercase small fw-bold mb-2">Showing</h6>
            {mine.length ? (
              <ul className="list-unstyled mb-4">
                {mine.map(b => (
                  <li key={b.ref}><b>{DateTime.fromISO(b.startIso).setZone(TZ).toFormat("cccc, LLL d 'at' h:mm a")}</b> · ref <span className="font-monospace">{b.ref}</span>{b.pet ? ` · pet: ${b.pet}` : ""}</li>
                ))}
              </ul>
            ) : <p className="small mb-4">No showing booked.</p>}

            <h6 className="text-muted text-uppercase small fw-bold mb-2">Application</h6>
            {app === undefined ? <p className="small text-muted">Loading...</p> : app === null ? (
              <p className="small">No application found for {email}. They may have been invited directly, or applied with a different email.</p>
            ) : (
              <dl className="row small mb-0">
                {rows.filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} style={{ display: "contents" }}>
                    <dt className="col-sm-3 text-muted fw-semibold">{k}</dt>
                    <dd className="col-sm-9" style={{ whiteSpace: "pre-wrap" }}>
                      {k === "Email" ? <a href={`mailto:${v}`}>{v}</a> : k === "Phone" ? <a href={`tel:${v!.replace(/[^\d+]/g, "")}`}>{v}</a> : v}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          <div className="modal-footer">
            {(app?.email || email) && <a className="btn btn-outline-secondary" href={`mailto:${app?.email || email}`}><i className="bi bi-envelope"></i> Email</a>}
            {(app?.phone) && <a className="btn btn-outline-secondary" href={`tel:${app.phone.replace(/[^\d+]/g, "")}`}><i className="bi bi-telephone"></i> Call</a>}
            <button className="btn btn-primary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
