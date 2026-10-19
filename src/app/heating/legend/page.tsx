import type { Metadata } from "next";
import Link from "next/link";
import s from "../../parking/parking.module.css";
import { MARKUP } from "./markup";
import "./legend.css";

export const metadata: Metadata = { title: "How to read the screens · 180 Beatrice", description: "What each camera at 180 Beatrice sees, what the icons mean, and how the monitor turns them into readings" };

export default function Legend() {
  return (
    <div className={s.page}>
      <div className={s.wrap}>
        <div className={s.article}>
          <p className={s.sub}><Link href="/heating">← Heating</Link></p>
          <h1>How to read the screens</h1>
          <p>What each camera sees, what the icons mean, and how the monitor turns them into readings.</p>
        </div>
        <div className="heatingLegend" dangerouslySetInnerHTML={{ __html: MARKUP }} />
      </div>
    </div>
  );
}
