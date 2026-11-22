"use client";
/**
 * Client pentru backend-ul Google Sheets (google-apps-script/Code.gs).
 *
 * Apps Script nu răspunde la cereri „preflight” CORS, așa că trimitem POST cu corp text simplu
 * (fără Content-Type JSON) — cererea rămâne „simplă” și răspunsul vine cu CORS permis.
 */
import { useApp } from "./store";
import type { Product } from "./types";
import { applyImport, rowsFromRecords } from "./importer";

export interface SheetsConfig {
  url: string; token: string; who: string;
  lastPriceSync?: string; lastPriceCount?: number;
  /** Id-urile produselor care au venit din Sheet (pentru „doar prețurile mele”). */
  sheetProductIds?: string[];
  onlyMine?: boolean;
}

export interface SharedItem { id: string; produs: string; cantitate: number | string; unitate: string; raion: string; bifat: boolean | string; cine: string; actualizat?: string }

// http:// e permis doar pentru localhost (teste locale).
export const sheetsReady = (c?: SheetsConfig | null): c is SheetsConfig =>
  !!c && (/^https:\/\//.test(c.url) || /^http:\/\/(localhost|127\.0\.0\.1)[:/]/.test(c.url)) && !!c.token;

async function call<T>(cfg: SheetsConfig, action: string, payload: Record<string, unknown> = {}, method: "GET" | "POST" = "POST"): Promise<T> {
  let res: Response;
  if (method === "GET") {
    const q = new URLSearchParams({ action, token: cfg.token, ...Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, String(v)])) });
    res = await fetch(`${cfg.url}?${q}`, { redirect: "follow" });
  } else {
    res = await fetch(cfg.url, { method: "POST", redirect: "follow", body: JSON.stringify({ action, token: cfg.token, ...payload }) });
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json().catch(() => { throw new Error("Răspuns invalid — verifică URL-ul (trebuie să se termine cu /exec)."); });
  if (!data.ok) throw new Error(data.error ?? "eroare");
  return data as T;
}

export const sheetsApi = {
  ping: (c: SheetsConfig) => call<{ sheet: string }>(c, "ping", {}, "GET"),
  prices: (c: SheetsConfig) => call<{ rows: Record<string, unknown>[] }>(c, "prices", {}, "GET"),
  seedPrices: (c: SheetsConfig, rows: Record<string, unknown>[], replace = false) => call<{ added: number }>(c, "seedPrices", { rows, replace }),
  list: (c: SheetsConfig) => call<{ rows: SharedItem[] }>(c, "list", {}, "GET"),
  mergeList: (c: SheetsConfig, items: Omit<SharedItem, "bifat" | "cine">[]) => call<{ added: number; updated: number }>(c, "mergeList", { items, who: c.who }),
  check: (c: SheetsConfig, id: string, checked: boolean) => call(c, "check", { id, checked, who: c.who }),
  addItem: (c: SheetsConfig, name: string) => call(c, "addItem", { name, who: c.who }),
  clearChecked: (c: SheetsConfig) => call<{ removed: number }>(c, "clearChecked"),
  spend: (c: SheetsConfig, date: string, amount: number, store: string) => call(c, "spend", { date, amount, store, who: c.who }),
};

export const isChecked = (v: unknown) => v === true || String(v).toLowerCase() === "true";

/** Produs -> rând pentru foaia „Preturi”. */
export function productToRow(p: Product) {
  return {
    store_id: p.storeId, ean: p.ean, ingredient_id: p.ingredientId, name: p.name, brand: p.brand,
    pack_size: p.packSize, pack_label: p.packLabel, price: p.price, promo_price: p.promoPrice ?? "",
    promo_until: p.promoUntil?.slice(0, 10) ?? "", in_stock: p.inStock ? 1 : 0, by_weight: p.byWeight ? 1 : 0, updated_at: p.updatedAt,
  };
}

/**
 * Descarcă prețurile din Sheet și le aplică peste catalog (aceeași logică ca importul CSV din Admin).
 * Rândurile din Sheet au prioritate față de datele demo.
 */
export async function syncPrices(existing: Product[], emojiFor: (id: string) => string) {
  const st = useApp.getState();
  const cfg = st.sheets;
  if (!sheetsReady(cfg)) throw new Error("Google Sheets nu e configurat");
  const { rows } = await sheetsApi.prices(cfg);
  const { rows: parsed, errors } = rowsFromRecords(rows);
  // Data din Sheet (updated_at) e păstrată ca „ultima actualizare” afișată lângă preț.
  const { overrides, created } = applyImport(parsed, existing, emojiFor);
  for (const r of parsed) {
    const src = rows.find((x) => String(x.ean).replace(/\D/g, "") === r.ean && x.store_id === r.storeId);
    const when = src?.updated_at ? new Date(String(src.updated_at)) : null;
    if (when && !Number.isNaN(when.getTime())) {
      const hit = existing.find((p) => p.storeId === r.storeId && p.ean === r.ean);
      if (hit && overrides[hit.id]) overrides[hit.id].updatedAt = when.toISOString();
      const c = created.find((p) => p.storeId === r.storeId && p.ean === r.ean);
      if (c) c.updatedAt = when.toISOString();
    }
  }
  st.setAdmin((a) => ({
    productOverrides: { ...a.productOverrides, ...Object.fromEntries(Object.entries(overrides).map(([id, p]) => [id, { ...a.productOverrides[id], ...p }])) },
    customProducts: [...a.customProducts.filter((p) => !created.some((c) => c.id === p.id)), ...created],
  }));
  const sheetProductIds = [...Object.keys(overrides), ...created.map((c) => c.id)];
  st.set({ sheets: { ...cfg, lastPriceSync: new Date().toISOString(), lastPriceCount: parsed.length, sheetProductIds } });
  return { count: parsed.length, updated: Object.keys(overrides).length, created: created.length, errors };
}
