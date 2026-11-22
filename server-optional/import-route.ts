/**
 * POST /api/import — import pe server al feed-urilor de prețuri (CSV/XML de la URL sau conținut).
 * Body: { storeId: string, format: "csv" | "xml", url?: string, content?: string }
 *
 * Dacă SUPABASE_SERVICE_ROLE_KEY este setat, rândurile sunt scrise în tabelul `store_products`
 * (upsert după store_id + ean). Altfel, endpoint-ul doar validează și întoarce rândurile parsate.
 * Protejează endpoint-ul cu un header secret (IMPORT_TOKEN) când rulează în producție / cron.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseCsv, parseXml } from "@/lib/importer";

export async function POST(req: Request) {
  const token = process.env.IMPORT_TOKEN;
  if (token && req.headers.get("x-import-token") !== token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { storeId?: string; format?: "csv" | "xml"; url?: string; content?: string } | null;
  if (!body?.storeId || !body.format) return NextResponse.json({ error: "storeId și format sunt obligatorii" }, { status: 400 });

  let content = body.content ?? "";
  if (body.url) {
    const res = await fetch(body.url, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ error: `feed indisponibil: ${res.status}` }, { status: 502 });
    content = await res.text();
  }
  const parsed = body.format === "xml" ? parseXml(content, body.storeId) : parseCsv(content, body.storeId);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key && parsed.rows.length) {
    const db = createClient(url, key);
    const now = new Date().toISOString();
    const { error } = await db.from("store_products").upsert(
      parsed.rows.map((r) => ({
        store_id: r.storeId, ean: r.ean, ingredient_id: r.ingredientId ?? null, name: r.name ?? null, brand: r.brand ?? null,
        pack_size: r.packSize ?? null, pack_label: r.packLabel ?? null, price: r.price, promo_price: r.promoPrice ?? null,
        promo_until: r.promoUntil ?? null, in_stock: r.inStock ?? true, image_url: r.image ?? null, updated_at: now,
      })),
      { onConflict: "store_id,ean" },
    );
    if (error) return NextResponse.json({ error: error.message, ...parsed }, { status: 500 });
    await db.from("import_log").insert({ store_id: body.storeId, source: body.url ? "feed" : "upload", rows: parsed.rows.length, errors: parsed.errors.length });
    return NextResponse.json({ saved: parsed.rows.length, errors: parsed.errors });
  }
  return NextResponse.json({ saved: 0, dryRun: true, ...parsed });
}
