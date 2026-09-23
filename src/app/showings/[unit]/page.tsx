import type { Metadata } from "next";
import s from "../showings.module.css";
import { getListing } from "@/lib/listingai";
import { getUnit, SHOWING_CONTACT } from "@/lib/showingUnits";
import Showings from "./ShowingsClient";

type Props = { params: Promise<{ unit: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const unit = getUnit((await params).unit);
  if (!unit) return { title: "Showings - 180 Beatrice" };
  const listing = await getListing(unit.listingId);
  return {
    title: `Book a showing - ${unit.label}, 180 Beatrice`,
    description: listing?.headline || unit.blurb,
    openGraph: listing?.photos[0] ? { images: [listing.photos[0].url] } : undefined,
  };
}

export default async function ShowingPage({ params }: Props) {
  const unit = getUnit((await params).unit);
  if (!unit) {
    return (
      <div className={s.page}>
        <div className={s.wrap} style={{ paddingTop: 80 }}>
          <h1 className={s.title}>No showings here.</h1>
          <p className={s.lede}>That unit isn&apos;t taking showings right now.</p>
          <a className={`${s.btn} ${s.btnPrimary}`} href="/showings">See all showings</a>
        </div>
      </div>
    );
  }

  const listing = await getListing(unit.listingId);
  const contact = {
    name: listing?.contact.name?.split(/\s+/)[0] || SHOWING_CONTACT.name,
    phone: listing?.contact.phone || SHOWING_CONTACT.phone,
    email: listing?.contact.email || SHOWING_CONTACT.email,
  };
  return <Showings unit={unit} listing={listing} contact={contact} />;
}
