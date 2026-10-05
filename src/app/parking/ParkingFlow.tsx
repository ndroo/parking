"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import s from "./parking.module.css";
import { calculateBestPrice, formatPrice } from "@/lib/pricing";
import { PRICING } from "@/lib/constants";
import { BOOKING_OWNER_EMAIL } from "@/lib/config";
import { Spot } from "@/lib/types";
import { DAY, Window, cap, f, fshort, toLocalInput, fromLocalInput, toIso, conflicts, busyNow, addDays } from "./format";

type Screen = "scan" | "how" | "who" | "done";
interface Dialog { word: string; tone: "ok" | "no" | "pick"; body: React.ReactNode; actions: { label: string; primary?: boolean; danger?: boolean; fn?: () => void }[] }

const OPTS: [string, number][] = [["1 day", 1], ["1 week", 7], ["1 month", 30]];

export function SpotMap({ windows, now, sel, onPick, loaded = true }: { windows: Window[]; now: number; sel: Spot | null; onPick?: (sp: Spot) => void; loaded?: boolean }) {
  const slot = (sp: Spot, name: string, y: number) => {
    if (!loaded) {
      // No availability yet: neutral, not tappable, never shown as available
      return (
        <g key={sp} aria-label={`${name} spot, checking availability`}>
          <rect className={`${s.slot} ${s.slotPending}`} x="64" y={y} width="160" height="56" rx="10" />
          <text className={s.nm} x="144" y={y + 24} textAnchor="middle">{name}</text>
          <text className={`${s.st} ${s.stPending}`} x="144" y={y + 43} textAnchor="middle">Checking…</text>
        </g>
      );
    }
    const b = busyNow(windows, sp, now), on = sel === sp;
    const cls = `${s.slot} ${b ? s.slotBooked : s.slotAvail} ${on ? s.slotSel : ""}`;
    return (
      <g key={sp} className={s.tap} role="button" tabIndex={0} aria-label={`${name} spot, ${b ? (b.reserved ? "reserved" : "booked") : "available"}`}
         onClick={() => onPick?.(sp)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick?.(sp); } }}>
        <rect className={cls} x="64" y={y} width="160" height="56" rx="10" />
        <text className={`${s.nm} ${on ? s.nmSel : ""}`} x="144" y={y + 24} textAnchor="middle">{name}{on ? "  ✓" : ""}</text>
        <text className={`${s.st} ${on ? s.stSel : b ? s.stBooked : s.stAvail}`} x="144" y={y + 43} textAnchor="middle">{b ? (b.reserved ? "Reserved" : `Booked to ${fshort(b.end)}`) : "Available"}</text>
      </g>
    );
  };
  return (
    <div className={s.diagram}>
      <svg viewBox="0 0 320 200" role="img" aria-label="Map: laneway wraps the west and south sides; Northern spot nearest the house, Southern spot below it">
        <rect className={s.lane} x="0" y="0" width="54" height="200" /><rect className={s.lane} x="0" y="150" width="320" height="50" />
        <path className={s.dash} d="M27 0 V173 H320" />
        <text className={s.lbl} x="14" y="75" textAnchor="middle" transform="rotate(-90 14 75)">LANEWAY</text>
        <text className={s.lbl} x="150" y="192" textAnchor="middle">LANEWAY</text>
        <rect className={s.house} x="240" y="0" width="80" height="150" />
        <text className={s.addr} x="280" y="75" textAnchor="middle" transform="rotate(-90 280 75)">180 BEATRICE ST</text>
        {slot("northern", "Northern", 12)}{slot("southern", "Southern", 82)}
        <text className={s.lbl} x="312" y="193" textAnchor="end">N ↑</text>
      </svg>
    </div>
  );
}

export default function ParkingFlow({ initialSpot }: { initialSpot: Spot | null }) {
  const [now] = useState(() => Date.now());
  const [windows, setWindows] = useState<Window[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState<Screen>("scan");
  const [spot, setSpot] = useState<Spot | null>(initialSpot);
  const [start, setStart] = useState(now);
  const [later, setLater] = useState(false);
  const [end, setEnd] = useState<number | null>(null);
  const [dlg, setDlg] = useState<Dialog | null>(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ ref: string; price: number; plate: string; email: string } | null>(null);
  const form = useRef({ plate: "", name: "", phone: "", email: "" });
  const dlgInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const from = new Date(now - DAY).toISOString(), to = new Date(now + 120 * DAY).toISOString();
    fetch(`/api/events?spot=both&start=${from}&end=${to}`).then(r => r.json()).then(j => {
      setWindows((j.events || []).map((e: { spot: Spot; start: string; end: string; reserved?: boolean }) => ({ spot: e.spot, start: new Date(e.start).getTime(), end: new Date(e.end).getTime(), reserved: !!e.reserved })));
    }).catch(() => {}).finally(() => setLoaded(true));
  }, [now]);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1500); };
  const copy = (t: string) => { try { navigator.clipboard.writeText(t).then(() => say("Copied"), () => say("Copy: " + t)); } catch { say("Copy: " + t); } };
  const price = (a: number, b: number) => calculateBestPrice(toIso(a), toIso(b)).totalCents;

  // ---- dialogs ----
  const dateDialog = (word: string, label: string, def: number, min: number, onOk: (v: number) => void, err?: string) => setDlg({
    word, tone: "pick",
    body: <><div className={s.field}><label htmlFor="dlgDate">{label}</label><input ref={dlgInput} id="dlgDate" type="datetime-local" defaultValue={toLocalInput(def)} min={toLocalInput(min)} /></div>{err && <div className={s.err}>{err}</div>}</>,
    actions: [{ label: "Continue", primary: true, fn: () => { const v = fromLocalInput(dlgInput.current?.value || ""); onOk(Number.isFinite(v) ? v : def); } }, { label: "Back" }],
  });

  // ---- scan ----
  const b = spot ? busyNow(windows, spot, now) : undefined;
  const onBook = () => {
    if (!spot) { setDlg({ word: "WHICH SPOT?", tone: "pick", body: "Tap the spot you want on the map, then press Book.", actions: [{ label: "OK", primary: true }] }); return; }
    if (b?.reserved) { setDlg({ word: "RESERVED", tone: "no", body: `The ${cap(spot)} spot is reserved for a tenant and can't be booked.`, actions: [{ label: "OK", primary: true }] }); return; }
    if (b) { setLater(true); setStart(b.end); } else { setLater(false); setStart(now); }
    setEnd(null); setScreen("how");
  };

  // ---- how ----
  const minStart = spot && busyNow(windows, spot, now) ? busyNow(windows, spot, now)!.end : now;
  const spotTaken = minStart > now;
  const askStart = (err?: string) => dateDialog("START WHEN?", "Starts", Math.max(later ? start : addDays(now, 1), minStart), minStart, v => {
    const GRACE = 5 * 60e3;
    if (spotTaken && v < minStart) { askStart(`The spot is taken until ${f(minStart)}. Choose a later start.`); return; }
    if (!spotTaken && v < now - GRACE) { askStart("That time has already passed. Choose a later start, or use \"Start now\"."); return; }
    if (!spotTaken && v <= now + GRACE) { setLater(false); setStart(now); return; }   // "now", give or take the picker's minute
    setLater(true); setStart(v);
  }, err);
  const askEnd = (err?: string) => dateDialog("UNTIL WHEN?", "Ends", end && end > addDays(start, 1) ? end : addDays(start, 2), addDays(start, 1), e => {
    if (!spot) return;
    if (e < addDays(start, 1)) { askEnd("The minimum stay is one day."); return; }
    const c = conflicts(windows, spot, start, e);
    if (c.length) { askEnd(`${cap(spot)} is booked from ${f(c[0].start)}. Choose an earlier end.`); return; }
    setEnd(e); setScreen("who");
  }, err);

  // ---- who ----
  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!spot || !end) return;
    const v = form.current;
    const miss = (["plate", "name", "phone", "email"] as const).filter(k => !v[k].trim());
    if (miss.length) { setDlg({ word: "MISSING INFO", tone: "no", body: "Please fill in your plate, name, phone and email.", actions: [{ label: "OK", primary: true, fn: () => document.getElementById("f-" + miss[0])?.focus() }] }); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/book", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spot, startIso: toIso(start), endIso: toIso(end), plate: v.plate.trim().toUpperCase(), name: v.name.trim(), phone: v.phone.trim(), email: v.email.trim() }) });
      const j = await res.json();
      if (!res.ok) {
        setDlg({ word: res.status === 409 ? "UNAVAILABLE" : "SOMETHING WENT WRONG", tone: "no", body: res.status === 409 ? `The ${cap(spot)} spot was just booked for part of that time. Pick different dates.` : (j.error || "Please try again."), actions: [{ label: "OK", primary: true, fn: () => setScreen("how") }] });
        return;
      }
      try { localStorage.setItem("bp-last", j.ref); } catch {}
      setDone({ ref: j.ref, price: j.priceCents, plate: v.plate.trim().toUpperCase(), email: v.email.trim() });
      setScreen("done");
    } catch { setDlg({ word: "SOMETHING WENT WRONG", tone: "no", body: "Please check your connection and try again.", actions: [{ label: "OK", primary: true }] }); }
    finally { setBusy(false); }
  };

  const back = () => setScreen(screen === "who" ? "how" : "scan");
  const total = end ? price(start, end) : 0;

  return (
    <div className={s.page}>
      <div className={s.wrap}>
      <div className={s.phone}>
        <div className={s.top}>
          <span className={s.crumb}>{screen === "scan" ? "Parking" : spot ? `${cap(spot)} spot` : "Parking"}</span>
          {screen !== "scan" && screen !== "done" && <button className={s.back} onClick={back} aria-label="Back"><span aria-hidden="true">←</span> Back</button>}
        </div>

        {screen === "scan" && (
          <section className={s.screen}>
            <div>
              {!loaded ? <><div className={`${s.word} ${s.wordPending}`}>CHECKING…</div><div className={s.spotname}>{spot ? `${cap(spot)} spot` : "Loading availability"}</div></>
                : !spot ? <><div className={`${s.word} ${s.wordPick}`}>WHICH SPOT?</div><div className={s.spotname}>Tap the spot you want.</div></>
                : <><div className={`${s.word} ${b ? s.wordNo : s.wordOk}`}>{b ? "UNAVAILABLE" : "AVAILABLE"}</div><div className={s.spotname}>{cap(spot)} spot</div></>}
            </div>
            <SpotMap windows={windows} now={now} sel={loaded ? spot : null} onPick={loaded ? setSpot : undefined} loaded={loaded} />
            {spot && b && (b.reserved
              ? <p className={s.sub}>This spot is reserved for a tenant and isn&apos;t available to book. Please don&apos;t park here.</p>
              : <p className={s.sub}>This spot is taken until <b>{f(b.end)}</b>. Please don&apos;t park here now. You can still book it for a later date.</p>)}
            <div className={s.bottom}><button className={`${s.btn} ${s.btnPrimary}`} onClick={onBook} disabled={!loaded}>{!loaded ? "Checking availability…" : !spot ? "Book" : b?.reserved ? "Not available" : b ? "Book for a later date" : "Book now"}</button></div>
          </section>
        )}

        {screen === "how" && spot && (
          <section className={s.screen}>
            <div><div className={s.spotname}>{cap(spot)} spot</div><p className={s.sub}>How long?</p></div>
            <div className={`${s.start} ${later ? s.startLater : ""}`}>
              <span className={s.startLbl}>{later ? "Starts" : "Starts now"}</span>
              <span className={s.startWhen}>{f(start)}</span>
              <button onClick={() => askStart()}>{later ? "Change" : "Future date?"}</button>
            </div>
            <div className={s.opts}>
              {OPTS.map(([label, days]) => {
                const e = addDays(start, days), c = conflicts(windows, spot, start, e);
                return (
                  <button key={label} className={s.opt} disabled={c.length > 0} onClick={() => { setEnd(e); setScreen("who"); }}>
                    <span>{label}<span className={`${s.til} ${c.length ? s.tilBad : ""}`}>{c.length ? `Spot is booked from ${f(c[0].start)}` : `Ends ${f(e)}`}</span></span>
                    <span className={s.pr}>{formatPrice(price(start, e)).replace(/\.00$/, "")}</span>
                  </button>
                );
              })}
              <button className={s.opt} onClick={() => askEnd()}><span>Other length</span><span className={s.pr}>›</span></button>
            </div>
            <p className={s.fine}>{PRICING.daily.label} a day · {PRICING.weekly.label} a week · {PRICING.monthly.label} a month. You always get the cheapest combination.</p>
          </section>
        )}

        {screen === "who" && spot && end && (
          <section className={s.screen}>
            <div className={s.oneline}><span>{cap(spot)} · {f(start)} → {f(end)}</span><span className={s.pr}>{formatPrice(total)}</span></div>
            <form className={s.opts} onSubmit={submit} noValidate>
              <div className={s.field}><label htmlFor="f-plate">Licence plate</label><input id="f-plate" className={s.plate} placeholder="ABCD 123" autoComplete="off" onChange={e => { e.target.value = e.target.value.toUpperCase(); form.current.plate = e.target.value; }} /></div>
              <div className={s.field}><label htmlFor="f-name">Name</label><input id="f-name" autoComplete="name" onChange={e => (form.current.name = e.target.value)} /></div>
              <div className={s.two}>
                <div className={s.field}><label htmlFor="f-phone">Phone</label><input id="f-phone" type="tel" autoComplete="tel" onChange={e => (form.current.phone = e.target.value)} /></div>
                <div className={s.field}><label htmlFor="f-email">Email</label><input id="f-email" type="email" autoComplete="email" onChange={e => (form.current.email = e.target.value)} /></div>
              </div>
              <div className={s.bottom}>
                <button className={`${s.btn} ${s.btnPrimary}`} type="submit" disabled={busy}>{busy ? "Booking…" : `Book · ${formatPrice(total)}`}</button>
                <p className={s.fine}>By booking you agree to the <a href="/terms" target="_blank" rel="noopener">parking terms</a>. You park at your own risk.</p>
              </div>
            </form>
          </section>
        )}

        {screen === "done" && spot && end && done && (
          <section className={s.screen}>
            <div><div className={`${s.word} ${s.wordOk}`}>BOOKED</div><div className={s.spotname}>{cap(spot)} spot</div><p className={s.sub}>{f(start)} → {f(end)}</p></div>
            <div className={s.ref}>{done.ref}</div>
            <button className={`${s.btn} ${s.btnSm}`} style={{ alignSelf: "center" }} onClick={() => copy(done.ref)}>Copy code</button>
            <div className={s.pay}>
              <h2>Pay before you leave the spot</h2>
              <div className={s.amt}>{formatPrice(done.price)}</div>
              <div className={s.copy}><code>{BOOKING_OWNER_EMAIL}</code><button className={`${s.btn} ${s.btnSm}`} onClick={() => copy(BOOKING_OWNER_EMAIL)}>Copy</button></div>
              <p className={s.fine} style={{ textAlign: "left" }}>E-transfer, with your code in the message. A confirmation is on its way to {done.email}.</p>
            </div>
            <div className={s.bottom}><Link className={s.btn} href="/parking/manage">Manage this booking</Link></div>
          </section>
        )}

        <div className={s.foot}><Link href="/parking/manage">Manage a booking</Link><Link href="/parking/help">Help</Link></div>

        {dlg && (
          <div className={s.modal} onClick={e => { if (e.target === e.currentTarget) setDlg(null); }}>
            <div className={s.sheet}>
              <div className={`${s.word} ${dlg.tone === "ok" ? s.wordOk : dlg.tone === "no" ? s.wordNo : s.wordPick}`}>{dlg.word}</div>
              <div className={s.sub}>{dlg.body}</div>
              <div className={s.opts}>
                {dlg.actions.map(a => <button key={a.label} className={`${s.btn} ${a.primary ? s.btnPrimary : a.danger ? s.btnDanger : ""}`} onClick={() => { setDlg(null); a.fn?.(); }}>{a.label}</button>)}
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
      {toast && <div className={s.toast}>{toast}</div>}
    </div>
  );
}
