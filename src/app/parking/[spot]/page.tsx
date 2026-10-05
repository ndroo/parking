import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ParkingFlow from "../ParkingFlow";
import { Spot } from "@/lib/types";

const SPOTS: Spot[] = ["northern", "southern"];

export async function generateMetadata({ params }: { params: Promise<{ spot: string }> }): Promise<Metadata> {
  const { spot } = await params;
  const name = spot.charAt(0).toUpperCase() + spot.slice(1);
  return { title: `${name} spot - 180 Beatrice Parking`, description: `Book the ${name} parking spot at 180 Beatrice St, Toronto` };
}

// The QR code on each sign points here: /parking/northern or /parking/southern
export default async function SpotPage({ params }: { params: Promise<{ spot: string }> }) {
  const { spot } = await params;
  const sp = spot.toLowerCase() as Spot;
  if (!SPOTS.includes(sp)) redirect("/parking");
  return <ParkingFlow initialSpot={sp} />;
}
