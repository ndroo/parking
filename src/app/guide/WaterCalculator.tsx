"use client";
import { useState } from "react";
import g from "./guide.module.css";

const money = (n: number) => n.toLocaleString("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Interactive version of the water proration example in the guide
export default function WaterCalculator({ initialBill, initialOccupants, included }: { initialBill: number; initialOccupants: number[]; included: number }) {
  const [bill, setBill] = useState(String(initialBill));
  const [people, setPeople] = useState(initialOccupants.map(String));

  const billNum = Math.max(0, Number(bill) || 0);
  const counts = people.map(p => Math.max(0, Math.floor(Number(p) || 0)));
  const total = counts.reduce((a, b) => a + b, 0);
  // Each person above the included allowance pays their per-person share; no credits below it
  const rows = counts.map(n => {
    const above = Math.max(0, n - included);
    const charge = total > 0 ? (billNum * above) / total : 0;
    return { n, above, charge };
  });
  const charged = rows.reduce((a, r) => a + r.charge, 0);
  const changed = billNum !== initialBill || counts.some((c, i) => c !== initialOccupants[i]);

  return (
    <div className={g.calc}>
      <div className={g.calcHead}>
        <span className={g.calcBadge}>Example</span>
        <span className={g.calcHint}>Try your own numbers</span>
        {changed && (
          <button type="button" className={g.calcReset} onClick={() => { setBill(String(initialBill)); setPeople(initialOccupants.map(String)); }}>
            Reset
          </button>
        )}
      </div>

      <div className={g.calcInputs}>
        <label className={g.calcField}>
          <span>Quarterly water bill</span>
          <div className={g.calcMoney}>
            <i>$</i>
            <input inputMode="decimal" value={bill} onChange={e => setBill(e.target.value.replace(/[^\d.]/g, ""))} aria-label="Quarterly water bill in dollars" />
          </div>
        </label>
        {people.map((p, i) => (
          <label key={i} className={g.calcField}>
            <span>Unit {i + 1} people</span>
            <div className={g.stepper}>
              <button type="button" onClick={() => setPeople(ps => ps.map((x, j) => (j === i ? String(Math.max(0, (Number(x) || 0) - 1)) : x)))} aria-label={`Fewer people in Unit ${i + 1}`}>−</button>
              <input inputMode="numeric" value={p} onChange={e => setPeople(ps => ps.map((x, j) => (j === i ? e.target.value.replace(/\D/g, "").slice(0, 2) : x)))} aria-label={`People in Unit ${i + 1}`} />
              <button type="button" onClick={() => setPeople(ps => ps.map((x, j) => (j === i ? String(Math.min(20, (Number(x) || 0) + 1)) : x)))} aria-label={`More people in Unit ${i + 1}`}>+</button>
            </div>
          </label>
        ))}
      </div>

      <p className={g.calcSummary}>
        {total} {total === 1 ? "person" : "people"} in the building. Water is included for {included} per unit, and we cover <b>{money(Math.max(0, billNum - charged))}</b> of this bill.
      </p>

      <table className={g.calcTable}>
        <thead><tr><th>Unit</th><th>Calculation</th><th>Water charge</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>Unit {i + 1} ({r.n})</td>
              <td>{r.charge > 0 ? `${money(billNum)} × (${r.n} − ${included}) ÷ ${total}` : `${included} or fewer people`}</td>
              <td><b>{r.charge > 0 ? `${money(r.charge)}/qtr` : "$0"}</b></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
