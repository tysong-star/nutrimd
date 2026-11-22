"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCatalog } from "@/lib/catalog";
import { useT } from "@/lib/i18n";
import { mdl } from "@/lib/format";
import { compareStores, decodeList, type ShoppingItem } from "@/lib/shopping";
import { ShoppingList } from "@/components/ShoppingList";
import { EmptyState } from "@/components/ui";

/** Listă primită printr-un link partajat (WhatsApp/Telegram). Bifările sunt locale. */
function Shared() {
  const { t, lang } = useT();
  const params = useSearchParams();
  const catalog = useCatalog();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const items: ShoppingItem[] = useMemo(() => decodeList(params.get("d") ?? "")
    .filter(([id]) => catalog.ingMap[id])
    .map(([id, amount]) => ({ ingredientId: id, amount, aisle: catalog.ingMap[id].aisle, pantry: !!catalog.ingMap[id].pantry, recipes: [] })), [params, catalog]);
  const cmp = useMemo(() => compareStores(items, catalog, ""), [items, catalog]);
  if (!items.length) return <EmptyState emoji="🔗" title={t("shop.empty")} />;
  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold">{t("shop.shared")}</h1>
      {cmp.cheapest && <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">{t("shop.cheapest")}: {cmp.cheapest.storeIds.map((s) => catalog.storeMap[s].name).join(" + ")} — {mdl(cmp.cheapest.total, lang)}</p>}
      {cmp.cheapest && <ShoppingList items={items} picks={cmp.cheapest.picks} catalog={catalog} checked={checked} onToggle={(id) => setChecked({ ...checked, [id]: !checked[id] })} />}
    </div>
  );
}

export default function SharedPage() {
  return <Suspense><Shared /></Suspense>;
}
