import Link from "next/link";
import s from "../parking/parking.module.css";
import { SITE_CONFIG } from "@/lib/constants";
import { BOOKING_OWNER_EMAIL } from "@/lib/config";

export const metadata = { title: "Parking terms - 180 Beatrice" };

export default function TermsOfService() {
  return (
    <div className={s.page}>
      <div className={s.wrap}>
      <article className={s.article}>
        <h1>Parking terms</h1>
        <p className={s.sub}>{SITE_CONFIG.address}</p>

        <h2>1. Parking at your own risk</h2>
        <p>By using this parking space you agree that you park your vehicle entirely at your own risk. The property owner, landlord and any affiliated parties are not responsible for any damage, theft, vandalism or loss to your vehicle or its contents while parked on the premises.</p>

        <h2>2. No liability for damage</h2>
        <p>The property owner is not liable for damage to your vehicle caused by, among other things:</p>
        <ul><li>Weather (hail, snow, ice, wind)</li><li>Falling objects (tree branches, debris)</li><li>Vandalism or theft by third parties</li><li>Other vehicles or pedestrians</li><li>Normal wear and tear</li><li>Any other cause beyond the property owner&apos;s control</li></ul>

        <h2>3. Vehicle security</h2>
        <p>You are solely responsible for securing your vehicle and anything left inside it. Lock your vehicle and don&apos;t leave valuables visible.</p>

        <h2>4. Rules</h2>
        <p>By booking a space you agree to:</p>
        <ul><li>Park only in the spot you booked (Northern or Southern)</li><li>Park only during your booked time</li><li>Not block other parking spaces, the laneway or building entrances</li><li>Comply with local traffic and parking regulations</li><li>Display the licence plate you registered</li></ul>

        <h2>5. Payment and cancellation</h2>
        <p>Pay by e-transfer to {BOOKING_OWNER_EMAIL} before you leave the spot, with your booking code in the message. Unpaid bookings may be cancelled. Refunds are at the discretion of the property owner.</p>

        <h2>6. Unauthorized vehicles</h2>
        <p>Vehicles parked without a valid booking, or outside their booked time, are parked without the consent of the property owner and may be tagged and towed at the vehicle owner&apos;s expense under City of Toronto Municipal Code Chapter 915.</p>

        <h2>7. Indemnification</h2>
        <p>You agree to indemnify and hold harmless the property owner from any claims, damages, losses or expenses arising from your use of the parking space, including damage you cause to other vehicles or property.</p>

        <h2>8. Changes to these terms</h2>
        <p>These terms may be updated at any time. Continued use of the parking service constitutes acceptance of the current terms.</p>

        <div className={`${s.note} ${s.noteInfo}`} style={{ marginTop: 10 }}>By booking a spot you confirm that you have read and agree to these terms.</div>
        <p className={s.fine} style={{ textAlign: "left" }}><Link href="/parking">Back to parking</Link></p>
      </article>
      </div>
    </div>
  );
}
