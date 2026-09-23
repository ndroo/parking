"use client";
import { useRef } from "react";

// Email preview that keeps its scroll position when the content refreshes
export default function PreviewFrame({ html, title, height, dim }: { html: string; title: string; height: number; dim?: boolean }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const scrollY = useRef(0);
  return (
    <iframe
      ref={ref}
      title={title}
      srcDoc={html}
      onLoad={() => {
        const w = ref.current?.contentWindow;
        if (!w) return;
        w.scrollTo(0, scrollY.current);
        w.addEventListener("scroll", () => { scrollY.current = w.scrollY; });
      }}
      style={{ width: "100%", height, border: "1px solid var(--bs-border-color)", borderRadius: 12, background: "#f5f1ea", opacity: dim ? 0.7 : 1, transition: "opacity 0.15s" }}
    />
  );
}
