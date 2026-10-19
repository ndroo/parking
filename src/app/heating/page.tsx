import type { Metadata } from "next";
import s from "../parking/parking.module.css";
import Dashboard from "./Dashboard";

export const metadata: Metadata = { title: "Heating · 180 Beatrice", description: "The boiler, the zone controller and each unit's thermostat at 180 Beatrice, checked every 15 minutes" };

export default function Heating() {
  return (
    <div className={s.page}>
      <div className={s.wrap}>
        <div className={s.article}>
          <h1>Heating</h1>
          <p>The boiler, the zone controller and each unit&apos;s thermostat, checked every 15 minutes by a camera on the boiler room wall. If the heat ever feels off, look here first: the banner at the top says whether anything needs attention.</p>
        </div>
        <Dashboard />
        <p className={s.fine}>Screens are read from pixels with a model as a check, and the page refreshes itself every 5 minutes. <a href="/heating/legend">How to read the screens</a></p>
      </div>
    </div>
  );
}
