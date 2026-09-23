"use client";
import { useState } from "react";
import g from "./guide.module.css";

const money = (n: number) => n.toLocaleString("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Stepper({ label, value, onChange, min = 0, max = 20 }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <label className={g.calcField}>
      <span>{label}</span>
      <div className={g.stepper}>
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label={`Decrease ${label}`}>−</button>
        <input inputMode="numeric" value={value} onChange={e => onChange(Math.min(max, Math.max(min, Number(e.target.value.replace(/\D/g, "")) || 0)))} aria-label={label} />
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`Increase ${label}`}>+</button>
      </div>
    </label>
  );
}

// Rough estimate of a household's monthly water charge, agreed at lease signing
export default function WaterCalculator({ quarterlyBill, yourAdults, otherAdults, includedAdults, note }: {
  quarterlyBill: number; yourAdults: number; otherAdults: number; includedAdults: number; note: string;
}) {
  const [bill, setBill] = useState(String(quarterlyBill));
  const [yours, setYours] = useState(yourAdults);
  const [others, setOthers] = useState(otherAdults);

  const billNum = Math.max(0, Number(bill) || 0);
  const totalAdults = yours + others;
  const extra = Math.max(0, yours - includedAdults);
  const perAdultMonthly = totalAdults > 0 ? billNum / 3 / totalAdults : 0;
  const monthly = extra * perAdultMonthly;
  const changed = billNum !== quarterlyBill || yours !== yourAdults || others !== otherAdults;

  return (
    <div className={g.calc}>
      <div className={g.calcHead}>
        <span className={g.calcBadge}>Example</span>
        <span className={g.calcHint}>Estimate a monthly water charge</span>
        {changed && (
          <button type="button" className={g.calcReset} onClick={() => { setBill(String(quarterlyBill)); setYours(yourAdults); setOthers(otherAdults); }}>
            Reset
          </button>
        )}
      </div>

      <div className={g.calcInputs3}>
        <Stepper label="Adults in your unit" value={yours} onChange={setYours} />
        <Stepper label="Adults in other units" value={others} onChange={setOthers} />
        <label className={g.calcField}>
          <span>Building water bill (quarterly)</span>
          <div className={g.calcMoney}>
            <i>$</i>
            <input inputMode="decimal" value={bill} onChange={e => setBill(e.target.value.replace(/[^\d.]/g, ""))} aria-label="Building water bill per quarter in dollars" />
          </div>
        </label>
      </div>

      <div className={g.calcResult}>
        <span>Estimated water charge</span>
        <b>{monthly > 0 ? `${money(monthly)}/month` : "Included"}</b>
        <small>
          {monthly > 0
            ? `${extra} adult${extra === 1 ? "" : "s"} above ${includedAdults} × ${money(perAdultMonthly)} (each adult's monthly share: ${money(billNum)} ÷ 3 months ÷ ${totalAdults} adults)`
            : `Water is included for up to ${includedAdults} adults.`}
        </small>
      </div>
      <p className={g.small}>{note}</p>
    </div>
  );
}
