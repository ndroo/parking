"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import s from "./SiteHeader.module.css";

// One header for the whole site (parking + showings), rendered from the root layout
export default function SiteHeader() {
  const path = usePathname() || "/";
  const onShowings = (path.startsWith("/showings") && !path.startsWith("/showings/admin")) || path.startsWith("/guide");
  const active = path.startsWith("/showings") ? "showings" : path.startsWith("/guide") ? "guide" : "parking";

  return (
    <header className={`${s.bar} ${onShowings ? s.darkOk : ""}`}>
      <div className={s.narrow}>
        <div className={s.inner}>
          <Link href="/" className={s.brand}>
            <span className={s.mark}><i className="bi bi-house-door-fill"></i></span>
            180 Beatrice
          </Link>
          <nav className={s.nav}>
            <Link href="/" className={`${s.link} ${active === "parking" ? s.active : ""}`}>
              <i className="bi bi-p-square"></i> Parking
            </Link>
            <Link href="/showings" className={`${s.link} ${active === "showings" ? s.active : ""}`}>
              <i className="bi bi-key"></i> Units
            </Link>
            <Link href="/guide" className={`${s.link} ${active === "guide" ? s.active : ""}`}>
              <i className="bi bi-book"></i> Guide
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
