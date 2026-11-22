"use client";
import { absoluteUrl } from "@/lib/paths";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCatalog } from "@/lib/catalog";
import { useApp } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { mdl } from "@/lib/format";
import { dailyBudget } from "@/lib/nutrition";
import { addDays, isoDate } from "@/lib/planner";
import { aggregatePlan, basketForStores, compareStores, encodeList, formatAmount } from "@/lib/shopping";
import { uid } from "@/lib/random";
import { ShoppingList } from "@/components/ShoppingList";
import { StoreMap } from "@/components/StoreMap";
import { SharedList } from "@/components/SharedList";
import { sheetsApi, sheetsReady } from "@/lib/sheets";
import { Button, Card, Chip, EmptyState, SectionTitle, Toggle, cx } from "@/components/ui";

type Period = "today" | "week" | "all";
type Choice = "cheapest" | "mixed" | string;

export default function ShoppingPage() {
  const { t, l, lang } = useT();
  const catalog = useCatalog();
  const profile = useApp((s) => s.profile);
  const plan = useApp((s) => s.plan);
  const checked = useApp((s) => s.shoppingChecked);
  const excludePantry = useApp((s) => s.excludePantry);
  const mapping = useApp((s) => s.admin.mapping);
  const set = useApp((s) => s.set);
  const [period, setPeriod] = useState<Period>("week");
  const [choice, setChoice] = useState<Choice>("cheapest");
  const [copied, setCopied] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const sheets = useApp((s) => s.sheets);
  const [tab, setTab] = useState<"mine" | "shared">("mine");
  const today = isoDate(new Date());

  const items = useMemo(() => {
    if (!plan) return [];
    const to = period === "today" ? today : period === "week" ? addDays(today, 6) : undefined;
    const from = period === "all" ? undefined : today;
    return aggregatePlan(plan, catalog, profile.householdSize, from, to).filter((i) => !(excludePantry && i.pantry));
  }, [plan, catalog, profile.householdSize, period, excludePantry, today]);

  const cmp = useMemo(() => compareStores(items, catalog, profile.city, mapping), [items, catalog, profile.city, mapping]);
  const basket = useMemo(() => {
    if (choice === "cheapest") return cmp.cheapest;
    if (choice === "mixed") return cmp.bestMixed ?? cmp.cheapest;
    return basketForStores(items, catalog, [choice], mapping);
  }, [choice, cmp, items, catalog, mapping]);

  const tabs = sheetsReady(sheets) ? (
    <div className="no-print mb-4 flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {(["mine", "shared"] as const).map((x) => (
        <button key={x} onClick={() => setTab(x)} aria-pressed={tab === x} className={cx("min-h-[44px] flex-1 rounded-lg text-sm font-semibold", tab === x && "bg-white shadow dark:bg-slate-950")}>
          {x === "mine" ? `🛒 ${t("sh.mine")}` : `👭 ${t("sh.shared")}`}
        </button>
      ))}
    </div>
  ) : null;

  if (tab === "shared" && sheetsReady(sheets)) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-extrabold tracking-tight">{t("shop.title")}</h1>
        {tabs}
        <SharedList myItems={items} catalog={catalog} />
      </div>
    );
  }

  if (!plan || items.length === 0) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-extrabold tracking-tight">{t("shop.title")}</h1>
        {tabs}
        <EmptyState emoji="🛒" title={t("shop.empty")} action={<Link href="/plan"><Button>{t("plan.generate")}</Button></Link>} />
      </div>
    );
  }

  const daysInPeriod = period === "today" ? 1 : period === "week" ? 7 : plan.days.length;
  const periodBudget = dailyBudget(profile) * daysInPeriod;
  const doneCount = items.filter((i) => checked[i.ingredientId]).length;
  const localStores = catalog.stores.filter((s) => s.cities.includes(profile.city));
  const shareUrl = typeof window !== "undefined" ? absoluteUrl(`/shopping/shared/?d=${encodeList(items)}`) : "";
  const shareText = `🛒 NutriMD\n${items.map((i) => `• ${l(catalog.ingMap[i.ingredientId].name)} — ${formatAmount(i.amount, catalog.ingMap[i.ingredientId].unit, lang)}`).join("\n")}\n\n${shareUrl}`;
  const storeNames = (ids: string[]) => ids.map((id) => catalog.storeMap[id]?.name).join(" + ");
  const singleStore = basket?.storeIds.length === 1 ? catalog.storeMap[basket.storeIds[0]] : null;

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: t("shop.title"), text: shareText }); } catch { /* anulat */ }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">{t("shop.title")}</h1>
        <div className="no-print flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={share}>📤 {t("shop.share")}</Button>
          <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost">WhatsApp</Button></a>
          <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("🛒 NutriMD")}`} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost">Telegram</Button></a>
          <Button size="sm" variant="ghost" onClick={async () => { await navigator.clipboard.writeText(shareUrl); setCopied(true); }}>{copied ? `✓ ${t("shop.copied")}` : `🔗 ${t("shop.copyLink")}`}</Button>
          <Button size="sm" variant="ghost" onClick={() => window.print()}>📄 {t("shop.pdf")}</Button>
        </div>
      </div>

      {tabs}
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        {(["today", "week", "all"] as const).map((p) => <Chip key={p} active={period === p} onClick={() => setPeriod(p)}>{t(p === "today" ? "shop.todayOnly" : p === "week" ? "shop.thisWeek" : "shop.allPlan")}</Chip>)}
        <div className="w-full sm:ml-auto sm:w-auto"><Toggle checked={excludePantry} onChange={(v) => set({ excludePantry: v })} label={t("shop.excludePantry")} /></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-semibold">{t("shop.checked", { a: doneCount, b: items.length })}</span>
            {doneCount > 0 && <button className="no-print font-semibold text-brand-700 underline dark:text-brand-300" onClick={() => set({ shoppingChecked: {} })}>{t("shop.uncheck")}</button>}
          </div>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full bg-brand-500 transition-all" style={{ width: `${(doneCount / items.length) * 100}%` }} /></div>
          {basket && <ShoppingList items={items} picks={basket.picks} catalog={catalog} checked={checked} onToggle={(id) => set({ shoppingChecked: { ...checked, [id]: !checked[id] } })} />}
        </div>

        <aside className="no-print space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <h2 className="mb-1 text-lg font-bold">⚖️ {t("shop.compare")}</h2>
            <p className="mb-3 text-xs text-slate-500">{profile.city} · {sheets?.onlyMine && sheets.sheetProductIds?.length ? `📗 ${t("sh.fromSheet")}` : t("common.demo")}</p>
            <div className="space-y-2">
              <StoreRow active={choice === "cheapest"} onClick={() => setChoice("cheapest")} label={`🏆 ${t("shop.cheapest")}: ${cmp.cheapest ? storeNames(cmp.cheapest.storeIds) : "—"}`} total={cmp.cheapest?.total ?? 0} missing={cmp.cheapest?.missing.length ?? 0} lang={lang} t={t} />
              {cmp.bestMixed && cmp.cheapest && (
                <StoreRow active={choice === "mixed"} onClick={() => setChoice("mixed")} label={`🔀 ${t("shop.mixed")}: ${storeNames(cmp.bestMixed.storeIds)}`} total={cmp.bestMixed.total} missing={cmp.bestMixed.missing.length} lang={lang} t={t}
                  hint={t("shop.mixedHint", { a: catalog.storeMap[cmp.bestMixed.storeIds[0]].name, b: catalog.storeMap[cmp.bestMixed.storeIds[1]].name, x: mdl(Math.max(0, cmp.cheapest.total - cmp.bestMixed.total), lang) })} />
              )}
              <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
              {cmp.single.map((b) => (
                <StoreRow key={b.storeIds[0]} active={choice === b.storeIds[0]} onClick={() => setChoice(b.storeIds[0])} label={catalog.storeMap[b.storeIds[0]].name} color={catalog.storeMap[b.storeIds[0]].color}
                  total={b.total} missing={b.missing.length} lang={lang} t={t} preferred={profile.preferredStores.includes(b.storeIds[0])} />
              ))}
            </div>
          </Card>

          {basket && (
            <Card>
              <div className="flex items-baseline justify-between"><span className="font-semibold">{t("shop.total")}</span><span className="text-2xl font-extrabold tabular-nums">{mdl(basket.total, lang)}</span></div>
              {basket.savingsVsRegular > 0 && <p className="text-sm text-brand-700 dark:text-brand-300">🏷 −{mdl(basket.savingsVsRegular, lang)} {t("shop.promo")}</p>}
              <p className="mt-1 text-xs text-slate-500">{t("p.budget")}: {mdl(periodBudget, lang)}</p>
              <p className="mt-1 text-xs text-slate-500">ℹ️ {t("shop.packsHint")}</p>
              {basket.total > periodBudget && (
                <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
                  {t("shop.overBudget", { x: mdl(basket.total - periodBudget, lang) })}
                  <Link href="/plan" className="mt-1 block font-semibold underline">{t("plan.fitBudget")} →</Link>
                </div>
              )}
              <div className="mt-4 flex flex-col gap-2">
                {singleStore?.onlineUrl && (
                  <a href={singleStore.deliveryUrl ?? singleStore.onlineUrl} target="_blank" rel="noreferrer"><Button className="w-full">🛵 {t("shop.orderOnline")} — {singleStore.name}</Button></a>
                )}
                <Button variant="secondary" disabled={recorded} onClick={() => {
                  set({ spending: [...useApp.getState().spending, { id: uid(), date: today, amount: basket.total, storeId: basket.storeIds.join("+") }] });
                  // Cheltuiala apare și în foaia „Cheltuieli” din Google Sheets.
                  if (sheetsReady(sheets)) sheetsApi.spend(sheets, today, basket.total, storeNames(basket.storeIds)).catch(() => {});
                  setRecorded(true);
                }}>{recorded ? `✓ ${t("shop.recorded")}` : `💳 ${t("shop.bought")}`}</Button>
              </div>
            </Card>
          )}

          <Card>
            <SectionTitle>{t("shop.nearest")}</SectionTitle>
            <StoreMap city={profile.city} stores={localStores.length ? localStores : catalog.stores} />
          </Card>
        </aside>
      </div>
    </div>
  );
}

function StoreRow({ active, onClick, label, total, missing, lang, t, hint, color, preferred }: {
  active: boolean; onClick: () => void; label: string; total: number; missing: number; lang: "ro" | "ru";
  t: ReturnType<typeof useT>["t"]; hint?: string; color?: string; preferred?: boolean;
}) {
  return (
    <button onClick={onClick} aria-pressed={active} className={cx("w-full rounded-xl border-2 p-3 text-left transition", active ? "border-brand-600 bg-brand-50 dark:bg-brand-900/30" : "border-transparent bg-slate-50 hover:border-slate-300 dark:bg-slate-800")}>
      <div className="flex items-center gap-2">
        {color && <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: color }} />}
        <span className="flex-1 text-sm font-semibold">{label}{preferred ? " ⭐" : ""}</span>
        <span className="font-bold tabular-nums">{mdl(total, lang)}</span>
      </div>
      {missing > 0 && <div className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">{t("shop.missing", { n: missing })}</div>}
      {hint && <div className="mt-0.5 text-xs text-brand-700 dark:text-brand-300">{hint}</div>}
    </button>
  );
}
