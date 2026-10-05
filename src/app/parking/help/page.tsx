import Link from "next/link";
import s from "../parking.module.css";
import { PRICING } from "@/lib/constants";
import { BOOKING_OWNER_EMAIL } from "@/lib/config";
import { SHOWING_CONTACT } from "@/lib/showingUnits";

export const metadata = { title: "Parking help - 180 Beatrice" };

export default function ParkingHelp() {
  return (
    <div className={s.page}>
      <div className={s.wrap}>
      <div className={s.phone}>
        <div className={s.top}><span className={s.crumb}>Parking</span><Link className={s.back} href="/parking"><span aria-hidden="true">←</span> Back</Link></div>
        <section className={s.screen}>
          <div className={s.spotname}>Help</div>
          <div className={`${s.note} ${s.noteWarn}`}><b>Someone in your spot?</b><br />Don&apos;t confront them. Text the landlord a photo of the plate, the spot name and your code.
            <div className={s.copy} style={{ marginTop: 10 }}><code>{SHOWING_CONTACT.phone}</code></div></div>
          <div className={`${s.note} ${s.noteInfo}`}><b>Rates.</b> {PRICING.daily.label} a day · {PRICING.weekly.label} a week · {PRICING.monthly.label} a month. You always get the cheapest combination.</div>
          <div className={`${s.note} ${s.noteInfo}`}><b>Paying.</b> E-transfer to {BOOKING_OWNER_EMAIL} with your code in the message. Park first, pay before you leave.</div>
          <div className={`${s.note} ${s.noteInfo}`}><b>Which spot is which?</b> Both are on the laneway beside the house. Northern is nearest the house; Southern is next to it. The sign in front of each spot says which it is.</div>
        </section>
        <div className={s.foot}><Link href="/parking/manage">Manage a booking</Link><Link href="/terms">Terms</Link></div>
      </div>
      </div>
    </div>
  );
}
