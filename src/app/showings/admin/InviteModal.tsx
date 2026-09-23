"use client";
import { useEffect, useRef, useState } from "react";
import { SHOWING_UNITS } from "@/lib/showingUnits";
import { defaultMessage } from "./InvitePanel";
import type { AdminWindow } from "./WindowsPanel";
import type { InviteTarget } from "./ApplicationsPanel";
import PreviewFrame from "./PreviewFrame";

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
  const seq = useRef(0);

  const call = async (send: boolean) => {
    if (send) setBusy(true);
    setError("");
    const id = ++seq.current;
    try {
      const res = await fetch("/api/showings/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ unit: target.unit, name: target.name, email, phone: target.phone, message, send, row: send ? target.row : undefined }),
      });
      const data = await res.json();
      if (!send && id !== seq.current) return; // a newer preview is on its way
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

  // Refresh the preview shortly after typing pauses
  useEffect(() => {
    setStale(true);
    const t = setTimeout(() => call(false), 350);
    return () => clearTimeout(t);
  }, [message, email]); // eslint-disable-line react-hooks/exhaustive-deps
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
                <input id="im-email" className="form-control mb-3" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                <label className="form-label" htmlFor="im-msg">Message</label>
                <textarea id="im-msg" className="form-control" rows={14} value={message} onChange={e => setMessage(e.target.value)} />
                <div className="form-text">Below your message the email adds the &quot;Pick a showing time&quot; button and link, the listing photo, the tenant guide, and their invite code{preview ? ` (${preview.code})` : ""} as a fallback.</div>
              </div>
              <div className="col-lg-7">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="form-label mb-0">Preview{preview ? `: ${preview.subject}` : ""}</span>
                  {stale && <span className="small text-muted">Updating...</span>}
                </div>
                {preview ? (
                  <PreviewFrame title="Invite preview" html={preview.html} height={560} dim={stale} />
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
