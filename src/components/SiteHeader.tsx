"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import s from "./SiteHeader.module.css";

// One header for the whole site (parking + showings), rendered from the root layout
export default function SiteHeader() {
  const path = usePathname() || "/";
  const darkOk = (path.startsWith("/showings") && !path.startsWith("/showings/admin")) || path.startsWith("/guide") || path.startsWith("/parking") || path === "/" || path.startsWith("/terms");
  const active = path.startsWith("/showings") ? "showings" : path.startsWith("/guide") ? "guide" : path.startsWith("/parking") ? "parking" : "";

  return (
    <header className={`${s.bar} ${darkOk ? s.darkOk : ""}`}>
      <div className={s.narrow}>
        <div className={s.inner}>
          <Link href="/" className={s.brand}>
            <span className={s.mark}><i className="bi bi-house-door-fill"></i></span>
            180 Beatrice
          </Link>
          <nav className={s.nav}>
            <Link href="/parking" className={`${s.link} ${active === "parking" ? s.active : ""}`}>
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
