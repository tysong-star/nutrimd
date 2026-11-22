"use client";
/**
 * Date publice Nr1 (oferte, broșuri, rețete, magazine), actualizate zilnic de scripts/fetch-nr1.mjs.
 * Conținutul rămâne pe nr1.md: aici sunt doar titluri, previzualizări și linkuri.
 */
import { useEffect, useState } from "react";
import { asset } from "./paths";

export interface Nr1Link { url: string; image: string; title: string; persons?: string }
export interface Nr1Shop { lat: number; lng: number; address: string; url: string; hours: string }
export interface Nr1Data { source: string; updatedAt: string | null; offers: Nr1Link[]; booklets: Nr1Link[]; recipes: Nr1Link[]; shops: Nr1Shop[] }

let cache: Nr1Data | null = null;

export function useNr1(): Nr1Data | null {
  const [data, setData] = useState<Nr1Data | null>(cache);
  useEffect(() => {
    if (cache) return;
    fetch(asset("/data/nr1.json"), { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Nr1Data | null) => { if (d) { cache = d; setData(d); } })
      .catch(() => {});
  }, []);
  return data;
}

/** Link care deschide adresa în Apple Maps pe iPhone (și în Google Maps în rest). */
export function mapsUrl(name: string, address: string, lat: number, lng: number) {
  const q = encodeURIComponent(`${name}, ${address}, Chișinău`);
  const apple = typeof navigator !== "undefined" && /iPhone|iPad|Macintosh/.test(navigator.userAgent);
  return apple ? `https://maps.apple.com/?q=${q}&ll=${lat},${lng}` : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
