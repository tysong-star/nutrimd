"use client";
/** Lista de cumpărături grupată pe raioane: poza produsului, numele, ambalajul, prețul. */
import { useT, type TKey } from "@/lib/i18n";
import { mdl } from "@/lib/format";
import { effectivePrice, type Catalog } from "@/lib/catalog";
import { formatAmount, type Pick, type ShoppingItem } from "@/lib/shopping";
import { ProductPhoto } from "./RecipeCard";
import { RoundCheck, cx } from "./ui";

export function ShoppingList({ items, picks, catalog, checked, onToggle, extraIds = [] }: {
  items: ShoppingItem[]; picks: Record<string, Pick | null>; catalog: Catalog;
  checked: Record<string, boolean>; onToggle: (id: string) => void; extraIds?: string[];
}) {
  const { t, l, lang } = useT();
  const groups = items.reduce<Record<string, ShoppingItem[]>>((acc, i) => ((acc[i.aisle] ??= []).push(i), acc), {});
  return (
    <div>
      {Object.entries(groups).map(([aisle, list]) => (
        <section key={aisle} className="print-break mb-6">
          <h3 className="mb-1.5 px-4 text-[13px] font-medium uppercase tracking-wide text-ink-2 dark:text-[#98989d]">{t(`aisle.${aisle}` as TKey)}</h3>
          <ul className="divide-y divide-black/[0.06] overflow-hidden rounded-2xl bg-white shadow-card dark:divide-white/10 dark:bg-[#1c1c1e] dark:shadow-none">
            {list.map((it) => {
              const ing = catalog.ingMap[it.ingredientId];
              const pick = picks[it.ingredientId];
              const p = pick?.product;
              const done = !!checked[it.ingredientId];
              const promo = p && effectivePrice(p) < p.price;
              const qty = p ? (p.byWeight ? formatAmount(pick!.packs * p.packSize, ing.unit, lang) : `${p.packLabel}${pick!.packs > 1 ? ` × ${pick!.packs}` : ""}`) : formatAmount(it.amount, ing.unit, lang);
              return (
                <li key={it.ingredientId} className="flex items-center gap-3 px-4 py-2.5">
                  <RoundCheck checked={done} onChange={() => onToggle(it.ingredientId)} label={l(ing.name)} />
                  <button type="button" onClick={() => onToggle(it.ingredientId)} className={cx("flex min-w-0 flex-1 items-center gap-3 text-left transition", done && "opacity-40")}>
                    <ProductPhoto id={ing.id} size={44} src={p?.image} />
                    <div className="min-w-0">
                      <p className={cx("truncate text-[17px] leading-snug", done && "line-through")}>{l(ing.name)}</p>
                      <p className="truncate text-[13px] text-ink-2 dark:text-[#98989d]">
                        {qty}{p ? ` · ${catalog.storeMap[p.storeId]?.name}` : ` · ${t("shop.outOfStock")}`}
                        {extraIds.includes(it.ingredientId) && ` · ${t("shop.fromRecipes")}`}
                      </p>
                    </div>
                  </button>
                  {pick && (
                    <div className={cx("shrink-0 text-right", done && "opacity-40")}>
                      <p className="text-[17px] tabular-nums">{mdl(pick.cost, lang)}</p>
                      {promo && <p className="text-[12px] font-semibold text-red-500">−{Math.round((1 - effectivePrice(p!) / p!.price) * 100)}%</p>}
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
