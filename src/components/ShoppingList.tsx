"use client";
/** Lista de cumpărături grupată pe raioane, cu produsul ales din magazin pentru fiecare ingredient. */
import { useT, type TKey } from "@/lib/i18n";
import { dateShort, mdl } from "@/lib/format";
import { effectivePrice, type Catalog } from "@/lib/catalog";
import { formatAmount, type Pick, type ShoppingItem } from "@/lib/shopping";
import { Tag, cx } from "./ui";

export function ShoppingList({ items, picks, catalog, checked, onToggle }: {
  items: ShoppingItem[]; picks: Record<string, Pick | null>; catalog: Catalog;
  checked: Record<string, boolean>; onToggle: (id: string) => void;
}) {
  const { t, l, lang } = useT();
  const groups = items.reduce<Record<string, ShoppingItem[]>>((acc, i) => ((acc[i.aisle] ??= []).push(i), acc), {});
  return (
    <div className="space-y-5">
      {Object.entries(groups).map(([aisle, list]) => (
        <section key={aisle} className="print-break">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{t(`aisle.${aisle}` as TKey)} · {list.length}</h3>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {list.map((it) => {
              const ing = catalog.ingMap[it.ingredientId];
              const pick = picks[it.ingredientId];
              const p = pick?.product;
              const done = !!checked[it.ingredientId];
              const store = p && catalog.storeMap[p.storeId];
              const unitPrice = p ? (effectivePrice(p) / (ing.unit === "pcs" ? p.packSize * (ing.gramsPerUnit ?? 100) : p.packSize)) * 1000 : 0;
              const promo = p && effectivePrice(p) < p.price;
              return (
                <li key={it.ingredientId} className={cx("flex gap-3 p-3", done && "bg-slate-50 dark:bg-slate-950")}>
                  <input type="checkbox" checked={done} onChange={() => onToggle(it.ingredientId)} className="mt-1 h-6 w-6 shrink-0 accent-brand-600" aria-label={l(ing.name)} />
                  <div className={cx("min-w-0 flex-1", done && "line-through opacity-50")}>
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span aria-hidden>{ing.emoji}</span>
                      <span className="font-semibold">{l(ing.name)}</span>
                      <span className="text-sm text-slate-500">{formatAmount(it.amount, ing.unit, lang)}</span>
                    </div>
                    {p ? (
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        <span className="font-semibold" style={{ color: store?.color }}>{store?.name}</span> · {p.name} ({p.brand}) · {p.byWeight ? `${formatAmount(pick!.packs * p.packSize, ing.unit, lang)} ${lang === "ro" ? "la cântar" : "на развес"}` : `${p.packLabel} × ${pick!.packs}`}
                        {" · "}{ing.unit === "ml" ? t("shop.perL", { x: mdl(unitPrice, lang) }) : t("shop.perKg", { x: mdl(unitPrice, lang) })}
                        {promo && <> · <Tag tone="red">{t("shop.promo")} −{Math.round((1 - effectivePrice(p) / p.price) * 100)}%</Tag></>}
                        <div className="text-[11px] text-slate-400">{t("shop.lastUpdate", { d: dateShort(p.updatedAt, lang) })} · EAN {p.ean}</div>
                      </div>
                    ) : (
                      <div className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">{t("shop.outOfStock")}</div>
                    )}
                  </div>
                  {pick && (
                    <div className="shrink-0 text-right">
                      <div className="font-bold tabular-nums">{mdl(pick.cost, lang)}</div>
                      {promo && <div className="text-xs text-slate-400 line-through tabular-nums">{mdl(p!.price * pick.packs, lang)}</div>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
