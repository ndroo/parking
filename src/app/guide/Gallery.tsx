"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import g from "./guide.module.css";
import type { GuidePhoto } from "@/lib/tenantGuide";

function Lightbox({ photos, index, onIndex, onClose }: {
  photos: GuidePhoto[]; index: number; onIndex: (i: number) => void; onClose: () => void;
}) {
  const touch = useRef<{ x: number; y: number } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const many = photos.length > 1;
  const go = useCallback((d: number) => onIndex((index + d + photos.length) % photos.length), [index, photos.length, onIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && many) go(1);
      else if (e.key === "ArrowLeft" && many) go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [go, many, onClose]);

  const photo = photos[index];
  return createPortal(
    <div
      className={g.lightbox}
      role="dialog"
      aria-modal="true"
      aria-label={photo.alt}
      onClick={onClose}
      onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchEnd={e => {
        if (!touch.current) return;
        const dx = e.changedTouches[0].clientX - touch.current.x;
        const dy = e.changedTouches[0].clientY - touch.current.y;
        touch.current = null;
        if (dy > 80 && Math.abs(dy) > Math.abs(dx)) onClose();
        else if (many && Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}
    >
      <div className={g.lbTop} onClick={e => e.stopPropagation()}>
        <span className={g.lbCount}>{many ? `${index + 1} / ${photos.length}` : ""}</span>
        <button ref={closeRef} className={g.lbClose} onClick={onClose} aria-label="Close photo">
          <i className="bi bi-x-lg"></i>
        </button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={g.lbImg} src={photo.src} alt={photo.alt} onClick={e => e.stopPropagation()} />
      <div className={g.lbCaption} onClick={e => e.stopPropagation()}>{photo.alt}</div>
      {many && (
        <>
          <button className={`${g.lbNav} ${g.lbPrev}`} onClick={e => { e.stopPropagation(); go(-1); }} aria-label="Previous photo">
            <i className="bi bi-chevron-left"></i>
          </button>
          <button className={`${g.lbNav} ${g.lbNext}`} onClick={e => { e.stopPropagation(); go(1); }} aria-label="Next photo">
            <i className="bi bi-chevron-right"></i>
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}

// Thumbnails show the whole photo (portrait or landscape) over a blurred fill
export function Gallery({ photos }: { photos?: GuidePhoto[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!photos?.length) return null;
  return (
    <>
      <div className={`${g.photos} ${photos.length === 1 ? g.photosOne : ""}`}>
        {photos.map((ph, i) => (
          <button key={ph.src} type="button" className={g.photo} onClick={() => setOpen(i)} aria-label={`View photo: ${ph.alt}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={g.photoBlur} src={ph.src} alt="" aria-hidden="true" loading="lazy" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={g.photoImg} src={ph.src} alt={ph.alt} loading="lazy" />
            <span className={g.photoCap}>{ph.alt}</span>
            <span className={g.photoZoom}><i className="bi bi-arrows-fullscreen"></i></span>
          </button>
        ))}
      </div>
      {open !== null && <Lightbox photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </>
  );
}

// A single inline image (About / History) that opens the same viewer
export function ZoomImage({ photo, className }: { photo: GuidePhoto; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={`${g.zoomBtn} ${className || ""}`} onClick={() => setOpen(true)} aria-label={`View photo: ${photo.alt}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.src} alt={photo.alt} loading="lazy" />
      </button>
      {open && <Lightbox photos={[photo]} index={0} onIndex={() => {}} onClose={() => setOpen(false)} />}
    </>
  );
}
