"use client";
/**
 * Lista de cumpărături comună, stocată în foaia „Lista” din Google Sheets.
 * Se reîmprospătează la fiecare 15 secunde, deci bifările celeilalte persoane apar aproape imediat.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { useT, type TKey } from "@/lib/i18n";
import { isChecked, sheetsApi, type SharedItem } from "@/lib/sheets";
import { AISLE_ORDER, formatAmount, type ShoppingItem } from "@/lib/shopping";
import type { Catalog } from "@/lib/catalog";
import { Button, EmptyState, Input, RoundCheck, cx } from "./ui";
import { ProductPhoto } from "./RecipeCard";

export function SharedList({ myItems, catalog }: { myItems: ShoppingItem[]; catalog: Catalog }) {
  const { t, l, lang } = useT();
  const cfg = useApp((s) => s.sheets)!;
  const [rows, setRows] = useState<SharedItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [newItem, setNewItem] = useState("");
  const pausedUntil = useRef(0);

  const load = useCallback(async () => {
    if (Date.now() < pausedUntil.current) return;
    try {
      const r = await sheetsApi.list(cfg);
      if (Date.now() >= pausedUntil.current) setRows(r.rows);
      setErr(null);
    } catch (e) { setErr((e as Error).message); }
  }, [cfg]);

  useEffect(() => {
    load();
    const id = setInterval(() => document.visibilityState === "visible" && load(), 15000);
    return () => clearInterval(id);
  }, [load]);

  const act = async (fn: () => Promise<unknown>, msg?: string) => {
    setBusy(true); setNote(null);
    try { await fn(); if (msg) setNote(msg); pausedUntil.current = 0; await load(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const toggle = (it: SharedItem) => {
    const next = !isChecked(it.bifat);
    // Actualizare optimistă; pauză scurtă a reîmprospătării ca să nu „sară” bifa înapoi.
    pausedUntil.current = Date.now() + 4000;
    setRows((rs) => rs?.map((r) => (r.id === it.id ? { ...r, bifat: next } : r)) ?? rs);
    sheetsApi.check(cfg, String(it.id), next).catch((e) => setErr((e as Error).message));
  };

  const pushMine = () => act(() => sheetsApi.mergeList(cfg, myItems.map((i) => {
    const ing = catalog.ingMap[i.ingredientId];
    return { id: i.ingredientId, produs: l(ing.name), cantitate: +i.amount.toFixed(2), unitate: ing.unit, raion: i.aisle };
  })), t("sh.pushed", { n: myItems.length }));

  const amountOf = (it: SharedItem) => {
    const n = Number(it.cantitate);
    if (!it.cantitate || Number.isNaN(n)) return String(it.cantitate ?? "");
    const unit = it.unitate === "g" || it.unitate === "ml" || it.unitate === "pcs" ? it.unitate : null;
    return unit ? formatAmount(n, unit, lang) : `${n} ${it.unitate}`;
  };

  const groups = (rows ?? []).reduce<Record<string, SharedItem[]>>((acc, r) => ((acc[r.raion || "other"] ??= []).push(r), acc), {});
  const order = Object.keys(groups).sort((a, b) => AISLE_ORDER.indexOf(a as never) - AISLE_ORDER.indexOf(b as never));
  const done = (rows ?? []).filter((r) => isChecked(r.bifat)).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button onClick={pushMine} disabled={busy || !myItems.length}>{t("sh.pushMine")}</Button>
        <Button variant="secondary" onClick={() => act(load)} disabled={busy} aria-label="refresh">↻</Button>
        {done > 0 && <Button variant="ghost" onClick={() => confirm(t("sh.clearConfirm")) && act(() => sheetsApi.clearChecked(cfg))} disabled={busy}>{t("sh.clear")}</Button>}
      </div>
      <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newItem.trim()) { const n = newItem.trim(); setNewItem(""); act(() => sheetsApi.addItem(cfg, n)); } }}>
        <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder={t("sh.addPlaceholder")} aria-label={t("common.add")} />
        <Button type="submit" variant="secondary" disabled={busy || !newItem.trim()}>＋</Button>
      </form>
      {note && <p className="mb-3 text-sm font-semibold text-brand-700 dark:text-brand-300" role="status">✓ {note}</p>}
      {err && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">⚠️ {err}</p>}

      {rows === null ? <p className="text-sm text-ink-2">{t("common.loading")}</p> : rows.length === 0 ? (
        <EmptyState emoji="🧺" title={t("sh.emptyShared")} text={t("sh.emptySharedHint")} />
      ) : (
        <>
          <p className="mb-3 px-1 text-[13px] text-ink-2">{t("shop.checked", { a: done, b: rows.length })}</p>
          <div>
            {order.map((aisle) => (
              <section key={aisle} className="mb-6">
                <h3 className="mb-1.5 px-4 text-[13px] font-medium uppercase tracking-wide text-ink-2 dark:text-[#98989d]">{AISLE_ORDER.includes(aisle as never) ? t(`aisle.${aisle}` as TKey) : aisle}</h3>
                <ul className="divide-y divide-black/[0.06] overflow-hidden rounded-2xl bg-white shadow-card dark:divide-white/10 dark:bg-[#1c1c1e] dark:shadow-none">
                  {groups[aisle].map((it) => {
                    const c = isChecked(it.bifat);
                    const known = catalog.ingMap[String(it.id)];
                    return (
                      <li key={String(it.id)} className="flex items-center gap-3 px-4 py-2.5">
                        <RoundCheck checked={c} onChange={() => toggle(it)} label={String(it.produs)} />
                        <button type="button" onClick={() => toggle(it)} className={cx("flex min-w-0 flex-1 items-center gap-3 text-left", c && "opacity-40")}>
                          {known ? <ProductPhoto id={known.id} size={44} /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f5f5f7] text-xl dark:bg-[#2c2c2e]">📝</span>}
                          <div className="min-w-0">
                            <p className={cx("truncate text-[17px]", c && "line-through")}>{known ? l(known.name) : String(it.produs)}</p>
                            <p className="truncate text-[13px] text-ink-2 dark:text-[#98989d]">{[amountOf(it), it.cine].filter(Boolean).join(" · ")}</p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
      <p className="mt-4 text-xs text-ink-2">ℹ️ {t("sh.sharedHint")}</p>
    </div>
  );
}
