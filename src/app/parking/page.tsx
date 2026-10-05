import type { Metadata } from "next";
import ParkingFlow from "./ParkingFlow";

export const metadata: Metadata = { title: "Parking - 180 Beatrice", description: "Book a parking spot at 180 Beatrice St, Toronto" };

export default function ParkingPage() {
  return <ParkingFlow initialSpot={null} />;
}
