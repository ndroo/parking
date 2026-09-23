import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Showings - 180 Beatrice",
  description: "Book a private apartment showing at 180 Beatrice St, Toronto",
};

export default function ShowingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
