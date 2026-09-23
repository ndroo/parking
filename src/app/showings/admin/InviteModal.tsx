"use client";
import { useEffect, useState } from "react";
import { SHOWING_UNITS } from "@/lib/showingUnits";
import { defaultMessage } from "./InvitePanel";
import type { AdminWindow } from "./WindowsPanel";
import type { InviteTarget } from "./ApplicationsPanel";

// "Invite to showing" from an application: edit the message, see the email, send
export default function InviteModal({ adminKey, target, windows, onClose, onSent }: {
  adminKey: string; target: InviteTarget; windows: AdminWindow[]; onClose: () => void; onSent: () => void;
}) {
  const unit = SHOWING_UNITS.find(u => u.slug === target.unit)!;
  const [email, setEmail] = useState(target.email);
  const [message, setMessage] = useState(() => defaultMessage(unit, target.name, windows));
  const [preview, setPreview] = useState<{ html: string; subject: string; code: string } | null>(null);
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const call = async (send: boolean) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/showings/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ unit: target.unit, name: target.name, email, phone: target.phone, message, send, row: send ? target.row : undefined }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Failed");
      setPreview({ html: data.html, subject: data.subject, code: data.code });
      setStale(false);
      if (send) {
        if (data.warning) alert(data.warning);
        onSent();
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { call(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const noWindows = !windows.some(w => w.unit === unit.code);

  return (
    <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => !busy && onClose()}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable modal-fullscreen-md-down" onClick={e => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Invite {target.name} to a showing</h5>
            <button className="btn-close" onClick={onClose} disabled={busy}></button>
          </div>
          <div className="modal-body">
            {noWindows && <div className="alert alert-warning py-2 small">There are no upcoming showing windows for {unit.label}, so they won&apos;t see any times to book. Add a window first.</div>}
            <div className="row g-3">
              <div className="col-lg-5">
                <label className="form-label" htmlFor="im-email">Send to</label>
                <input id="im-email" className="form-control mb-3" type="email" value={email} onChange={e => { setEmail(e.target.value); setStale(true); }} />
                <label className="form-label" htmlFor="im-msg">Message</label>
                <textarea id="im-msg" className="form-control" rows={14} value={message} onChange={e => { setMessage(e.target.value); setStale(true); }} />
                <div className="form-text">Below your message the email adds a &quot;Pick a showing time&quot; button, their invite code{preview ? ` (${preview.code})` : ""} and a tenant guide link.</div>
              </div>
              <div className="col-lg-7">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="form-label mb-0">Preview{preview ? `: ${preview.subject}` : ""}</span>
                  {stale && <button className="btn btn-sm btn-outline-secondary" onClick={() => call(false)} disabled={busy}>Update preview</button>}
                </div>
                {preview ? (
                  <iframe title="Invite preview" srcDoc={preview.html} style={{ width: "100%", height: 560, border: "1px solid var(--bs-border-color)", borderRadius: 12, background: "#f5f1ea", opacity: stale ? 0.6 : 1 }} />
                ) : (
                  <div className="text-muted small">Loading preview...</div>
                )}
              </div>
            </div>
            {error && <div className="alert alert-danger py-2 small mt-3 mb-0">{error}</div>}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Not now</button>
            <button className="btn btn-success" onClick={() => call(true)} disabled={busy || !email}>{busy ? "Working..." : "Send invite"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
