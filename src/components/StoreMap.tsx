"use client";
/**
 * Cele mai apropiate magazine. Pentru Nr1 se folosesc adresele reale de pe nr1.md
 * (cu program și coordonate); pentru celelalte rețele, puncte demonstrative.
 * Fiecare rând deschide adresa în Hărți (Apple Maps pe iPhone).
 */
import { useMemo, useState } from "react";
import { CITIES, STORE_LOCATIONS } from "@/data/stores";
import { useT } from "@/lib/i18n";
import { mapsUrl, useNr1 } from "@/lib/nr1";
import type { Store } from "@/lib/types";
import { Button, cx } from "./ui";
import { IconChevron } from "./icons";

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

interface Loc { storeId: string; label: string; lat: number; lng: number; hours?: string; real: boolean }

export function StoreMap({ city, stores }: { city: string; stores: Store[] }) {
  const { t, lang } = useT();
  const nr1 = useNr1();
  const center = CITIES.find((c) => c.name === city) ?? CITIES[0];
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const origin = me ?? center;

  const nearest = useMemo(() => {
    const ids = new Set(stores.map((s) => s.id));
    const realNr1 = (nr1?.shops ?? []).map<Loc>((s) => ({ storeId: "nr1", label: s.address, lat: s.lat, lng: s.lng, hours: s.hours, real: true }));
    // Când avem adrese reale, nu le amestecăm cu punctele demonstrative ale altor rețele.
    const demo = realNr1.length && ids.has("nr1") ? [] : STORE_LOCATIONS.filter((l) => ids.has(l.storeId))
      .map<Loc>((l) => ({ storeId: l.storeId, label: l.label.replace(/^.*? — /, "").replace(" (demo)", ""), lat: l.lat, lng: l.lng, real: false }));
    return [...(ids.has("nr1") ? realNr1 : []), ...demo].map((l) => ({ ...l, d: km(origin, l) })).sort((a, b) => a.d - b.d).slice(0, 8);
  }, [stores, nr1, origin]);

  return (
    <div>
      <Button size="sm" variant="secondary" className="mb-3" onClick={() => navigator.geolocation?.getCurrentPosition((p) => setMe({ lat: p.coords.latitude, lng: p.coords.longitude }), (e) => setErr(e.message))}>{t("shop.locate")}</Button>
      {err && <p className="mb-2 text-[13px] text-red-600">{err}</p>}
      <ul className="-mx-4 divide-y divide-black/[0.06] dark:divide-white/10">
        {nearest.map((l) => {
          const s = stores.find((x) => x.id === l.storeId);
          return (
            <li key={`${l.storeId}-${l.label}`}>
              <a href={mapsUrl(s?.name ?? "", l.label, l.lat, l.lng)} target="_blank" rel="noreferrer" className="flex min-h-[56px] items-center gap-3 px-4 py-2 active:bg-black/[0.04]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s?.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px]">{s?.name} · {l.label}</p>
                  <p className="truncate text-[13px] text-ink-2 dark:text-[#98989d]">{l.hours ? `${l.hours} · ` : ""}{l.real ? t("nr1.realShops") : t("common.demo")}</p>
                </div>
                <span className={cx("shrink-0 text-[15px] tabular-nums text-ink-2")}>{t("shop.km", { x: l.d.toLocaleString(lang === "ro" ? "ro-MD" : "ru-MD", { maximumFractionDigits: 1 }) })}</span>
                <IconChevron className="shrink-0 text-ink-3" />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
