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
import { Button, EmptyState, Input, cx } from "./ui";

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

  const nameOf = (it: SharedItem) => (catalog.ingMap[String(it.id)] ? `${catalog.ingMap[String(it.id)].emoji} ${l(catalog.ingMap[String(it.id)].name)}` : `📝 ${it.produs}`);
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
        <Button onClick={pushMine} disabled={busy || !myItems.length}>⬆️ {t("sh.pushMine")}</Button>
        <Button variant="ghost" onClick={() => act(load)} disabled={busy}>🔄</Button>
        {done > 0 && <Button variant="ghost" onClick={() => confirm(t("sh.clearConfirm")) && act(() => sheetsApi.clearChecked(cfg))} disabled={busy}>🧹 {t("sh.clear")}</Button>}
      </div>
      <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newItem.trim()) { const n = newItem.trim(); setNewItem(""); act(() => sheetsApi.addItem(cfg, n)); } }}>
        <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder={t("sh.addPlaceholder")} aria-label={t("common.add")} />
        <Button type="submit" variant="secondary" disabled={busy || !newItem.trim()}>＋</Button>
      </form>
      {note && <p className="mb-3 text-sm font-semibold text-brand-700 dark:text-brand-300" role="status">✓ {note}</p>}
      {err && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">⚠️ {err}</p>}

      {rows === null ? <p className="text-sm text-slate-500">{t("common.loading")}</p> : rows.length === 0 ? (
        <EmptyState emoji="🧺" title={t("sh.emptyShared")} text={t("sh.emptySharedHint")} />
      ) : (
        <>
          <p className="mb-3 text-sm font-semibold">{t("shop.checked", { a: done, b: rows.length })}</p>
          <div className="space-y-5">
            {order.map((aisle) => (
              <section key={aisle}>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{AISLE_ORDER.includes(aisle as never) ? t(`aisle.${aisle}` as TKey) : aisle}</h3>
                <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                  {groups[aisle].map((it) => {
                    const c = isChecked(it.bifat);
                    return (
                      <li key={String(it.id)}>
                        <label className={cx("flex min-h-[56px] cursor-pointer items-center gap-3 px-3", c && "bg-slate-50 dark:bg-slate-950")}>
                          <input type="checkbox" checked={c} onChange={() => toggle(it)} className="h-6 w-6 shrink-0 accent-brand-600" />
                          <span className={cx("flex-1", c && "line-through opacity-50")}>
                            <span className="font-semibold">{nameOf(it)}</span> <span className="text-sm text-slate-500">{amountOf(it)}</span>
                          </span>
                          {it.cine && <span className="shrink-0 text-xs text-slate-400">{it.cine}</span>}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
      <p className="mt-4 text-xs text-slate-500">ℹ️ {t("sh.sharedHint")}</p>
    </div>
  );
}
