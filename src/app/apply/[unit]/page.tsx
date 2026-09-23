import type { Metadata } from "next";
import s from "../../showings/showings.module.css";
import { getUnit } from "@/lib/showingUnits";
import { getListing } from "@/lib/listingai";
import ApplyForm from "./ApplyForm";

type Props = { params: Promise<{ unit: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const unit = getUnit((await params).unit);
  return { title: unit ? `Apply for ${unit.label} - 180 Beatrice` : "Apply - 180 Beatrice" };
}

export default async function ApplyPage({ params }: Props) {
  const unit = getUnit((await params).unit);
  if (!unit?.applicationForm || !unit.bookable) {
    return (
      <div className={s.page}>
        <div className={s.wrap} style={{ paddingTop: 80 }}>
          <h1 className={s.title}>Applications are closed.</h1>
          <p className={s.lede}>This unit isn&apos;t taking applications right now.</p>
          <a className={`${s.btn} ${s.btnPrimary}`} href="/showings">See all units</a>
        </div>
      </div>
    );
  }
  const listing = await getListing(unit.listingId);
  return (
    <ApplyForm
      unit={{ slug: unit.slug, label: unit.label, listingUrl: unit.listingUrl }}
      listing={listing && { price: listing.price, beds: listing.beds, baths: listing.baths, photo: listing.photos[0]?.url || "", headline: listing.headline }}
    />
  );
}
