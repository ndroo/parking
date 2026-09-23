"use client";
import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { SHOWING_CONTACT, SHOWING_UNITS, ShowingUnit } from "@/lib/showingUnits";
import type { AdminWindow } from "./WindowsPanel";
import type { InviteTarget } from "./ApplicationsPanel";

const bookable = SHOWING_UNITS.filter(u => u.bookable);

function windowsText(unit: ShowingUnit, windows: AdminWindow[]) {
  const t = (iso: string) => DateTime.fromISO(iso).setZone("America/Toronto").toFormat("h:mma").replace(":00", "").toLowerCase();
  const parts = windows
    .filter(w => w.unit === unit.code && DateTime.fromISO(w.endIso) > DateTime.now())
    .map(w => `${DateTime.fromISO(w.startIso).setZone("America/Toronto").toFormat("cccc, LLLL d")} (${t(w.startIso)}-${t(w.endIso)})`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0] || "(no showing windows set yet)";
}

function defaultMessage(unit: ShowingUnit, name: string, windows: AdminWindow[]) {
  const first = name.trim().split(/\s+/)[0] || "there";
  return [
    `Hi ${first},`,
    `Thanks for your application for ${unit.label} at 180 Beatrice. We'd love to show you the place.`,
    `We're doing showings on ${windowsText(unit, windows)}. Each one is about 15 minutes, one household at a time. Use the button below to pick whatever time suits you.`,
    `If you have any questions, feel free to reply here, or you can text or call me at ${SHOWING_CONTACT.phone}.`,
    `Thanks,\n${SHOWING_CONTACT.name}\n${SHOWING_CONTACT.phone}`,
  ].join("\n\n");
}

export default function InvitePanel({ adminKey, windows, target, onSent }: { adminKey: string; windows: AdminWindow[]; target: InviteTarget | null; onSent: () => void }) {
  const [unitSlug, setUnitSlug] = useState(bookable[0]?.slug || "");
  const [f, setF] = useState({ name: "", email: "", phone: "" });
  const [message, setMessage] = useState("");
  const [edited, setEdited] = useState(false);
  const [preview, setPreview] = useState<{ html: string; subject: string; code: string; link: string } | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const unit = bookable.find(u => u.slug === unitSlug);
  const [row, setRow] = useState<number | null>(null);

  // Prefill from "Approve & invite" on an application
  useEffect(() => {
    if (!target) return;
    setUnitSlug(target.unit);
    setF({ name: target.name, email: target.email, phone: target.phone });
    setRow(target.row);
    setEdited(false);
    setPreview(null);
    setStatus("");
  }, [target]);

  // Keep the default message in sync until it's been hand-edited
  useEffect(() => {
    if (unit && !edited) setMessage(defaultMessage(unit, f.name, windows));
  }, [unit, f.name, edited, windows]);

  const call = async (send: boolean) => {
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch("/api/showings/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ unit: unitSlug, ...f, message, send, row }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Failed");
        if (data.link) setPreview(p => p && { ...p, code: data.code, link: data.link });
        return;
      }
      setPreview({ html: data.html, subject: data.subject, code: data.code, link: data.link });
      if (send) {
        setStatus(data.warning || `Sent to ${f.email}.${row ? " Marked Approved in the Sheet." : ""}`);
        setRow(null);
        onSent();
      }
    } finally {
      setBusy(false);
    }
  };

  if (!bookable.length) return null;
  return (
    <div className="card mb-4" id="invite">
      <div className="card-body">
        <h2 className="h5 mb-1">Invite an applicant{row ? <span className="badge text-bg-success ms-2 align-middle">From application</span> : null}</h2>
        <p className="text-muted small mb-3">Only people with an invite can book. This sends them a personal booking link and code from your Gmail.</p>
        <div className="row g-2">
          <div className="col-md-3">
            <label className="form-label" htmlFor="inv-unit">Unit</label>
            <select id="inv-unit" className="form-select" value={unitSlug} onChange={e => setUnitSlug(e.target.value)}>
              {bookable.map(u => <option key={u.slug} value={u.slug}>{u.label}</option>)}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label" htmlFor="inv-name">Name</label>
            <input id="inv-name" className="form-control" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
          </div>
          <div className="col-md-3">
            <label className="form-label" htmlFor="inv-email">Email</label>
            <input id="inv-email" className="form-control" type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
          </div>
          <div className="col-md-3">
            <label className="form-label" htmlFor="inv-phone">Phone (optional)</label>
            <input id="inv-phone" className="form-control" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
          </div>
          <div className="col-12">
            <label className="form-label d-flex justify-content-between">
              <span>Message</span>
              {edited && <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setEdited(false)}>Reset to default</button>}
            </label>
            <textarea className="form-control" rows={9} value={message} onChange={e => { setMessage(e.target.value); setEdited(true); }} />
            <div className="form-text">The email adds a "Pick a showing time" button, their invite code and a tenant guide link below your message.</div>
          </div>
        </div>
        <div className="d-flex gap-2 mt-3 flex-wrap">
          <button className="btn btn-secondary" disabled={busy || !f.name || !f.email} onClick={() => call(false)}>Preview</button>
          <button className="btn btn-primary" disabled={busy || !f.name || !f.email || !preview} onClick={() => { if (confirm(`Send this invite to ${f.email}?`)) call(true); }}>
            {busy ? "Working..." : "Send invite"}
          </button>
          {status && <span className="align-self-center small">{status}</span>}
        </div>
        {preview && (
          <div className="mt-3">
            <div className="small mb-2">
              <b>Code:</b> <span className="font-monospace">{preview.code}</span> · <b>Link:</b>{" "}
              <button type="button" className="btn btn-link btn-sm p-0" onClick={() => navigator.clipboard.writeText(preview.link)}>Copy personal link</button>
              <br /><b>Subject:</b> {preview.subject}
            </div>
            <iframe title="Invite email preview" srcDoc={preview.html} style={{ width: "100%", height: 720, border: "1px solid var(--bs-border-color)", borderRadius: 12, background: "#f5f1ea" }} />
          </div>
        )}
      </div>
    </div>
  );
}
