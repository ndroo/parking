"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import s from "../parking.module.css";
import { calculateBestPrice, formatPrice } from "@/lib/pricing";
import { BOOKING_OWNER_EMAIL } from "@/lib/config";
import { Spot } from "@/lib/types";
import { DAY, cap, f, toIso } from "../format";

interface Found { ref: string; spot: Spot; start: number; end: number; plate: string }
interface Dialog { word: string; tone: "ok" | "no" | "pick"; body: string; actions: { label: string; primary?: boolean; danger?: boolean; fn?: () => void }[] }

export default function ManageClient() {
  const [ref, setRef] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [busy, setBusy] = useState(false);
  const [dlg, setDlg] = useState<Dialog | null>(null);

  useEffect(() => { try { const l = localStorage.getItem("bp-last"); if (l) setRef(l); } catch {} }, []);

  const price = (a: number, b: number) => calculateBestPrice(toIso(a), toIso(b)).totalCents;

  const find = async () => {
    const code = ref.trim().toUpperCase();
    if (!code) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/booking/${code}`);
      const j = await res.json();
      if (!res.ok) { setDlg({ word: "NOT FOUND", tone: "no", body: `There's no booking with code ${code}. Check the code in your confirmation email.`, actions: [{ label: "OK", primary: true }] }); return; }
      setFound({ ref: code, spot: j.spot, start: new Date(j.start).getTime(), end: new Date(j.end).getTime(), plate: j.plate || "" });
    } catch { setDlg({ word: "SOMETHING WENT WRONG", tone: "no", body: "Please check your connection and try again.", actions: [{ label: "OK", primary: true }] }); }
    finally { setBusy(false); }
  };

  const extend = async (ms: number) => {
    if (!found) return;
    const ne = found.end + ms, extra = price(found.start, ne) - price(found.start, found.end);
    setBusy(true);
    try {
      const res = await fetch(`/api/booking/${found.ref}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spot: found.spot, startIso: toIso(found.start), endIso: toIso(ne) }) });
      if (!res.ok) { setDlg({ word: "UNAVAILABLE", tone: "no", body: `The ${cap(found.spot)} spot is booked by someone else during that time.`, actions: [{ label: "OK", primary: true }] }); return; }
      setFound({ ...found, end: ne });
      setDlg({ word: "EXTENDED", tone: "ok", body: `Your booking now ends ${f(ne)}. Please e-transfer ${formatPrice(extra)} more to ${BOOKING_OWNER_EMAIL} with code ${found.ref}.`, actions: [{ label: "OK", primary: true }] });
    } finally { setBusy(false); }
  };

  const cancel = () => {
    if (!found) return;
    const b = found;
    setDlg({ word: "CANCEL?", tone: "no", body: `Cancel booking ${b.ref} on the ${cap(b.spot)} spot? If you've already paid, the unused time will be refunded.`, actions: [
      { label: "Yes, cancel it", danger: true, fn: async () => {
        const res = await fetch(`/api/booking/${b.ref}?spot=${b.spot}`, { method: "DELETE" });
        if (!res.ok) { setDlg({ word: "SOMETHING WENT WRONG", tone: "no", body: "Couldn't cancel. Please try again or text the landlord.", actions: [{ label: "OK", primary: true }] }); return; }
        setFound(null); setRef(""); try { localStorage.removeItem("bp-last"); } catch {}
        setDlg({ word: "CANCELLED", tone: "ok", body: `Booking ${b.ref} is cancelled.`, actions: [{ label: "OK", primary: true }] });
      } },
      { label: "Keep it" },
    ] });
  };

  return (
    <div className={s.page}>
      <div className={s.wrap}>
      <div className={s.phone}>
        <div className={s.top}><span className={s.crumb}>Parking</span><Link className={s.back} href="/parking"><span aria-hidden="true">←</span> Back</Link></div>
        <section className={s.screen}>
          <div><div className={s.spotname}>Your booking</div><p className={s.sub}>Enter the code from your confirmation.</p></div>
          {!found ? (
            <div className={s.opts}>
              <div className={s.field}><label htmlFor="m-ref">Code</label><input id="m-ref" className={s.plate} maxLength={6} placeholder="ABC123" autoComplete="off" value={ref} onChange={e => setRef(e.target.value.toUpperCase())} /></div>
              <button className={`${s.btn} ${s.btnPrimary}`} onClick={find} disabled={busy}>{busy ? "Looking…" : "Find booking"}</button>
            </div>
          ) : (
            <div className={s.opts}>
              <div className={s.oneline}><span>{cap(found.spot)} · {found.ref}</span><span className={s.pr}>{formatPrice(price(found.start, found.end))}</span></div>
              <p className={s.sub}>{f(found.start)} → {f(found.end)}{found.plate ? ` · ${found.plate}` : ""}</p>
              <p className={s.sub}>Add time</p>
              {([["+1 day", DAY], ["+1 week", 7 * DAY]] as [string, number][]).map(([label, ms]) => (
                <button key={label} className={s.opt} disabled={busy} onClick={() => extend(ms)}><span>{label}</span><span className={s.pr}>+{formatPrice(Math.max(price(found.start, found.end + ms) - price(found.start, found.end), 0))}</span></button>
              ))}
              <button className={`${s.btn} ${s.btnDanger}`} onClick={cancel} disabled={busy}>Cancel booking</button>
            </div>
          )}
        </section>
        <div className={s.foot}><Link href="/parking">Book a spot</Link><Link href="/parking/help">Help</Link></div>
        {dlg && (
          <div className={s.modal} onClick={e => { if (e.target === e.currentTarget) setDlg(null); }}>
            <div className={s.sheet}>
              <div className={`${s.word} ${dlg.tone === "ok" ? s.wordOk : dlg.tone === "no" ? s.wordNo : s.wordPick}`}>{dlg.word}</div>
              <div className={s.sub}>{dlg.body}</div>
              <div className={s.opts}>{dlg.actions.map(a => <button key={a.label} className={`${s.btn} ${a.primary ? s.btnPrimary : a.danger ? s.btnDanger : ""}`} onClick={() => { setDlg(null); a.fn?.(); }}>{a.label}</button>)}</div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
