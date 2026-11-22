/**
 * Modul de import produse și prețuri per magazin.
 *
 * Surse suportate (vezi README → „Integrarea magazinelor”):
 *  1. API oficial al rețelei (dacă există)  -> implementezi `PriceSource.fetch()` care întoarce `ImportRow[]`
 *  2. Feed CSV / XML de la parteneri         -> `parseCsv()` / `parseXml()`
 *  3. Actualizare manuală din panoul Admin    -> editare directă sau încărcare fișier
 *
 * Toate sursele produc același format normalizat `ImportRow`, apoi `applyImport()` face upsert
 * după (storeId, EAN). Data ultimei actualizări se salvează pe fiecare produs.
 *
 * Format CSV (antet obligatoriu, separator , sau ;):
 *   store_id,ean,ingredient_id,name,brand,pack_size,pack_label,price,promo_price,promo_until,in_stock,image[,by_weight]
 *   (by_weight=1 pentru produse la cântar: prețul e per pack_size, se plătește cantitatea exactă)
 */
import type { Product } from "./types";

export interface ImportRow {
  storeId: string;
  ean: string;
  ingredientId?: string;
  name?: string;
  brand?: string;
  packSize?: number;
  packLabel?: string;
  price: number;
  promoPrice?: number;
  promoUntil?: string;
  inStock?: boolean;
  byWeight?: boolean;
  image?: string;
}

export interface ImportResult {
  rows: ImportRow[];
  errors: { line: number; message: string }[];
}

export interface PriceSource {
  id: string;
  kind: "api" | "feed" | "admin";
  /** Întoarce rândurile normalizate. Pentru API-uri reale rulează pe server (/api/import). */
  fetch(): Promise<ImportRow[]>;
}

const num = (v: string | undefined) => {
  if (v === undefined || v.trim() === "") return undefined;
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};
const bool = (v: string | undefined) => (v === undefined || v === "" ? undefined : ["1", "true", "da", "yes", "да"].includes(v.trim().toLowerCase()));

/** Parser CSV minimal cu suport pentru ghilimele. */
export function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === sep) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function normalize(rec: Record<string, string>, line: number, defaultStore?: string): { row?: ImportRow; error?: string } {
  const storeId = rec.store_id || defaultStore;
  const ean = (rec.ean ?? "").replace(/\D/g, "");
  const price = num(rec.price);
  if (!storeId) return { error: `linia ${line}: lipsește store_id` };
  if (ean.length < 8) return { error: `linia ${line}: EAN invalid` };
  if (price === undefined || Number.isNaN(price) || price <= 0) return { error: `linia ${line}: preț invalid` };
  const promoPrice = num(rec.promo_price);
  return {
    row: {
      storeId, ean, price,
      ingredientId: rec.ingredient_id || undefined,
      name: rec.name || undefined,
      brand: rec.brand || undefined,
      packSize: num(rec.pack_size),
      packLabel: rec.pack_label || undefined,
      promoPrice: promoPrice && !Number.isNaN(promoPrice) ? promoPrice : undefined,
      promoUntil: rec.promo_until || undefined,
      inStock: bool(rec.in_stock),
      byWeight: bool(rec.by_weight),
      image: rec.image || undefined,
    },
  };
}

/** Rânduri deja structurate (ex. din Google Sheets) -> ImportRow. Valorile pot fi numere/booleeni. */
export function rowsFromRecords(records: Record<string, unknown>[], defaultStore?: string): ImportResult {
  const rows: ImportRow[] = [];
  const errors: ImportResult["errors"] = [];
  records.forEach((r, i) => {
    const rec = Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase(), v === null || v === undefined ? "" : typeof v === "boolean" ? (v ? "1" : "0") : String(v)]));
    if (rec.promo_until && !/^\d{4}-\d{2}-\d{2}/.test(rec.promo_until)) {
      const d = new Date(rec.promo_until);
      rec.promo_until = Number.isNaN(d.getTime()) ? "" : d.toISOString();
    }
    const { row, error } = normalize(rec, i + 2, defaultStore);
    if (row) rows.push(row); else errors.push({ line: i + 2, message: error! });
  });
  return { rows, errors };
}

export function parseCsv(text: string, defaultStore?: string): ImportResult {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { rows: [], errors: [{ line: 0, message: "fișier gol" }] };
  const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const header = splitCsvLine(lines[0], sep).map((h) => h.toLowerCase());
  const rows: ImportRow[] = [];
  const errors: ImportResult["errors"] = [];
  lines.slice(1).forEach((l, i) => {
    const cells = splitCsvLine(l, sep);
    const rec = Object.fromEntries(header.map((h, j) => [h, cells[j] ?? ""]));
    const { row, error } = normalize(rec, i + 2, defaultStore);
    if (row) rows.push(row); else errors.push({ line: i + 2, message: error! });
  });
  return { rows, errors };
}

/** XML: <products><product><ean/>...<price/></product></products> (aceleași nume de câmpuri ca CSV). */
export function parseXml(text: string, defaultStore?: string): ImportResult {
  const rows: ImportRow[] = [];
  const errors: ImportResult["errors"] = [];
  const blocks = text.match(/<(product|item|offer)\b[\s\S]*?<\/\1>/gi) ?? [];
  blocks.forEach((b, i) => {
    const rec: Record<string, string> = {};
    for (const m of b.matchAll(/<([a-z_]+)>([\s\S]*?)<\/\1>/gi)) rec[m[1].toLowerCase()] = m[2].replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    const { row, error } = normalize(rec, i + 1, defaultStore);
    if (row) rows.push(row); else errors.push({ line: i + 1, message: error! });
  });
  if (!blocks.length) errors.push({ line: 0, message: "nu s-au găsit elemente <product>" });
  return { rows, errors };
}

/**
 * Aplică rândurile: actualizează produsele existente (același magazin + EAN) și creează produse noi
 * pentru rândurile care au `ingredient_id`. Întoarce modificările pentru stocare.
 */
export function applyImport(rows: ImportRow[], existing: Product[], emojiFor: (ingredientId: string) => string) {
  const now = new Date().toISOString();
  const byKey = new Map(existing.map((p) => [`${p.storeId}:${p.ean}`, p]));
  const overrides: Record<string, Partial<Product>> = {};
  const created: Product[] = [];
  let skipped = 0;
  for (const r of rows) {
    const hit = byKey.get(`${r.storeId}:${r.ean}`);
    const patch: Partial<Product> = {
      price: r.price, promoPrice: r.promoPrice, promoUntil: r.promoUntil, updatedAt: now,
      ...(r.inStock !== undefined && { inStock: r.inStock }),
      ...(r.byWeight !== undefined && { byWeight: r.byWeight }),
      ...(r.name && { name: r.name }), ...(r.brand && { brand: r.brand }),
      ...(r.packSize && { packSize: r.packSize }), ...(r.packLabel && { packLabel: r.packLabel }),
      ...(r.image && { image: r.image }),
    };
    if (hit) overrides[hit.id] = patch;
    else if (r.ingredientId && r.packSize) {
      created.push({
        id: `imp-${r.storeId}-${r.ean}`, storeId: r.storeId, ingredientId: r.ingredientId, ean: r.ean,
        name: r.name ?? r.ean, brand: r.brand ?? "", packSize: r.packSize, packLabel: r.packLabel ?? String(r.packSize),
        price: r.price, promoPrice: r.promoPrice, promoUntil: r.promoUntil, inStock: r.inStock ?? true,
        emoji: emojiFor(r.ingredientId), updatedAt: now, image: r.image,
      });
    } else skipped++;
  }
  return { overrides, created, skipped };
}

export const CSV_TEMPLATE = `store_id,ean,ingredient_id,name,brand,pack_size,pack_label,price,promo_price,promo_until,in_stock,image
linella,4840000000017,potato,Cartofi,Producător local,1000,1 kg,11.90,,,1,
nr1,4840000000024,eggs,Ouă categoria A,Producător local,10,10 buc,27.50,24.90,2026-12-01,1,`;
