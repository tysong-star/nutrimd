"use client";
/** Carduri-link către nr1.md (oferte, broșura de promoții, rețete). Imaginile se încarcă direct de pe nr1.md. */
import { useState } from "react";
import type { Nr1Link } from "@/lib/nr1";
import { cx } from "./ui";

function Thumb({ src, alt }: { src: string; alt: string }) {
  const [ok, setOk] = useState(true);
  return ok
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setOk(false)} className="h-full w-full object-cover" />
    : <span className="flex h-full w-full items-center justify-center text-3xl" aria-hidden>🏷</span>;
}

export function Nr1Cards({ items, aspect = "aspect-[4/3]", width = "w-56" }: { items: Nr1Link[]; aspect?: string; width?: string }) {
  if (!items.length) return null;
  return (
    <div className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
      {items.map((it) => (
        <a key={it.url} href={it.url} target="_blank" rel="noreferrer" className={cx("shrink-0 snap-start", width)}>
          <div className={cx("overflow-hidden rounded-2xl bg-white shadow-card dark:bg-[#1c1c1e]", aspect)}><Thumb src={it.image} alt={it.title} /></div>
          <p className="mt-2 line-clamp-2 px-0.5 text-[15px] font-semibold leading-snug">{it.title}</p>
          <p className="px-0.5 text-[13px] text-ink-2 dark:text-[#98989d]">nr1.md{it.persons ? ` · ${it.persons}` : ""} ↗</p>
        </a>
      ))}
    </div>
  );
}
