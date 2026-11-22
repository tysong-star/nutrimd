"use client";
/**
 * Cele mai apropiate magazine: distanța (haversine) față de locația utilizatorului
 * sau de centrul orașului ales, plus hartă OpenStreetMap încorporată (fără cheie API).
 */
import { useMemo, useState } from "react";
import { CITIES, STORE_LOCATIONS } from "@/data/stores";
import { useT } from "@/lib/i18n";
import type { Store } from "@/lib/types";
import { Button } from "./ui";

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function StoreMap({ city, stores }: { city: string; stores: Store[] }) {
  const { t } = useT();
  const center = CITIES.find((c) => c.name === city) ?? CITIES[0];
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const origin = me ?? center;
  const ids = new Set(stores.map((s) => s.id));
  const nearest = useMemo(() => STORE_LOCATIONS.filter((l) => ids.has(l.storeId)).map((l) => ({ ...l, d: km(origin, l) })).sort((a, b) => a.d - b.d).slice(0, 6),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [origin.lat, origin.lng, stores]);
  const [focus, setFocus] = useState(0);
  const f = nearest[focus] ?? nearest[0];
  const bbox = f ? `${f.lng - 0.02},${f.lat - 0.012},${f.lng + 0.02},${f.lat + 0.012}` : "";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => navigator.geolocation?.getCurrentPosition((p) => setMe({ lat: p.coords.latitude, lng: p.coords.longitude }), (e) => setErr(e.message))}>📍 {t("shop.locate")}</Button>
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>
      {f && (
        <iframe title={f.label} loading="lazy" className="h-56 w-full rounded-2xl border border-black/[0.06] dark:border-white/10"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${f.lat},${f.lng}`} />
      )}
      <ul className="mt-3 divide-y divide-black/[0.06] dark:divide-white/10">
        {nearest.map((l, i) => {
          const s = stores.find((x) => x.id === l.storeId)!;
          return (
            <li key={l.label}>
              <button onClick={() => setFocus(i)} className="flex min-h-[48px] w-full items-center gap-3 text-left text-sm">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="flex-1 font-medium">{l.label}</span>
                <span className="tabular-nums text-ink-2">{t("shop.km", { x: l.d.toFixed(1) })}</span>
                <a href={`https://www.openstreetmap.org/directions?to=${l.lat},${l.lng}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-brand-700 dark:text-brand-300" aria-label="route">🧭</a>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-ink-2">ℹ️ Locațiile sunt demonstrative. / Адреса демонстрационные.</p>
    </div>
  );
}
