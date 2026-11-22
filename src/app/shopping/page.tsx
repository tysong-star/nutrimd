"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCatalog } from "@/lib/catalog";
import { useApp } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { mdl } from "@/lib/format";
import { dailyBudget } from "@/lib/nutrition";
import { addDays, isoDate } from "@/lib/planner";
import { aggregatePlan, basketForStores, compareStores, encodeList, formatAmount, mergeExtras, type StoreBasket } from "@/lib/shopping";
import { uid } from "@/lib/random";
import { absoluteUrl } from "@/lib/paths";
import { sheetsApi, sheetsReady } from "@/lib/sheets";
import { ShoppingList } from "@/components/ShoppingList";
import { SharedList } from "@/components/SharedList";
import { StoreMap } from "@/components/StoreMap";
import { ActionList, Button, EmptyState, IconButton, ListGroup, ListRow, Modal, PageHeader, Segmented, Toggle, cx } from "@/components/ui";
import { IconMore, IconShare } from "@/components/icons";

type Period = "today" | "week" | "all";
type Choice = "cheapest" | "mixed" | string;

export default function ShoppingPage() {
  const { t, l, lang } = useT();
  const catalog = useCatalog();
  const profile = useApp((s) => s.profile);
  const plan = useApp((s) => s.plan);
  const checked = useApp((s) => s.shoppingChecked);
  const excludePantry = useApp((s) => s.excludePantry);
  const extras = useApp((s) => s.shoppingExtras);
  const mapping = useApp((s) => s.admin.mapping);
  const sheets = useApp((s) => s.sheets);
  const set = useApp((s) => s.set);
  const [period, setPeriod] = useState<Period>("week");
  const [choice, setChoice] = useState<Choice>("cheapest");
  const [tab, setTab] = useState<"mine" | "shared">("mine");
  const [menu, setMenu] = useState(false);
  const [storesOpen, setStoresOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const today = isoDate(new Date());

  const items = useMemo(() => {
    const to = period === "today" ? today : period === "week" ? addDays(today, 6) : undefined;
    const base = plan ? aggregatePlan(plan, catalog, profile.householdSize, period === "all" ? undefined : today, to) : [];
    return mergeExtras(base, extras, catalog).filter((i) => !(excludePantry && i.pantry));
  }, [plan, catalog, profile.householdSize, period, excludePantry, today, extras]);
  const extraIds = useMemo(() => [...new Set(extras.flatMap((e) => e.items.map((i) => i.id)))], [extras]);

  const cmp = useMemo(() => compareStores(items, catalog, profile.city, mapping), [items, catalog, profile.city, mapping]);
  const basket = useMemo(() => {
    if (choice === "cheapest") return cmp.cheapest;
    if (choice === "mixed") return cmp.bestMixed ?? cmp.cheapest;
    return basketForStores(items, catalog, [choice], mapping);
  }, [choice, cmp, items, catalog, mapping]);

  const shared = sheetsReady(sheets);
  const tabs = shared ? (
    <Segmented className="no-print mb-5" value={tab} onChange={setTab} options={[{ value: "mine", label: t("sh.mine") }, { value: "shared", label: t("sh.shared") }]} />
  ) : null;

  if (tab === "shared" && shared) {
    return (
      <div>
        <PageHeader title={t("nav.shopping")} />
        {tabs}
        <SharedList myItems={items} catalog={catalog} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        <PageHeader title={t("nav.shopping")} />
        {tabs}
        <EmptyState emoji="🛒" title={t("shop.empty")} action={<Link href="/plan"><Button>{t("plan.generate")}</Button></Link>} />
      </div>
    );
  }

  const daysInPeriod = period === "today" ? 1 : period === "week" ? 7 : plan?.days.length ?? 7;
  const periodBudget = dailyBudget(profile) * daysInPeriod;
  const doneCount = items.filter((i) => checked[i.ingredientId]).length;
  const localStores = catalog.stores.filter((s) => s.cities.includes(profile.city));
  const storeNames = (ids: string[]) => ids.map((id) => catalog.storeMap[id]?.name).join(" + ");
  const singleStore = basket?.storeIds.length === 1 ? catalog.storeMap[basket.storeIds[0]] : null;
  const shareUrl = typeof window !== "undefined" ? absoluteUrl(`/shopping/shared/?d=${encodeList(items)}`) : "";
  const shareText = `🛒 NutriMD\n${items.map((i) => `• ${l(catalog.ingMap[i.ingredientId].name)} — ${formatAmount(i.amount, catalog.ingMap[i.ingredientId].unit, lang)}`).join("\n")}\n\n${shareUrl}`;

  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: t("shop.title"), text: shareText }); } catch { /* anulat */ } }
    else { await navigator.clipboard.writeText(shareUrl); setNote(t("shop.copied")); }
  };

  const storeOption = (b: StoreBasket, label: string, value: Choice) => (
    <ListRow key={value} onClick={() => { setChoice(value); setStoresOpen(false); }}
      title={<span className={cx(choice === value && "font-semibold")}>{label}</span>}
      subtitle={b.missing.length ? t("shop.missing", { n: b.missing.length }) : undefined}
      right={<span className={cx("tabular-nums", choice === value && "font-semibold text-ink dark:text-white")}>{mdl(b.total, lang, 0)}{choice === value ? " ✓" : ""}</span>} />
  );

  return (
    <div>
      <PageHeader title={t("nav.shopping")} actions={<>
        <IconButton label={t("shop.share")} onClick={share}><IconShare width={20} height={20} /></IconButton>
        <IconButton label={t("shop.options")} onClick={() => setMenu(true)}><IconMore width={22} height={22} /></IconButton>
      </>} />
      {tabs}

      <ListGroup>
        <ListRow onClick={() => setStoresOpen(true)} chevron
          title={basket ? storeNames(basket.storeIds) : "—"}
          subtitle={`${t("shop.where")}${basket && basket.savingsVsRegular > 0 ? ` · ${t("shop.promo")} −${mdl(basket.savingsVsRegular, lang, 0)}` : ""}`}
          right={<span className="text-[20px] font-semibold tabular-nums text-ink dark:text-white">{mdl(basket?.total ?? 0, lang, 0)}</span>} />
      </ListGroup>
      {basket && basket.total > periodBudget && (
        <p className="-mt-4 mb-5 px-4 text-[13px] text-amber-700 dark:text-amber-400">{t("shop.overBudget", { x: mdl(basket.total - periodBudget, lang, 0) })}</p>
      )}

      <div className="mb-4 flex items-center gap-3 px-1">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${(doneCount / items.length) * 100}%` }} /></div>
        <span className="text-[13px] tabular-nums text-ink-2">{doneCount}/{items.length}</span>
      </div>

      {basket && <ShoppingList items={items} picks={basket.picks} catalog={catalog} checked={checked} extraIds={extraIds} onToggle={(id) => set({ shoppingChecked: { ...checked, [id]: !checked[id] } })} />}

      <div className="no-print flex flex-col gap-2">
        {singleStore?.onlineUrl && <a href={singleStore.deliveryUrl ?? singleStore.onlineUrl} target="_blank" rel="noreferrer"><Button variant="secondary" className="w-full">{t("shop.orderOnline")} · {singleStore.name}</Button></a>}
        <Button variant="ghost" onClick={() => {
          if (!basket) return;
          set({ spending: [...useApp.getState().spending, { id: uid(), date: today, amount: basket.total, storeId: basket.storeIds.join("+") }] });
          if (shared) sheetsApi.spend(sheets, today, basket.total, storeNames(basket.storeIds)).catch(() => {});
          setNote(t("shop.recorded"));
        }}>{t("shop.bought")}</Button>
        {note && <p className="text-center text-[15px] text-brand-700 dark:text-brand-400" role="status">✓ {note}</p>}
      </div>

      <Modal open={menu} onClose={() => setMenu(false)} title={t("shop.options")}>
        <div className="space-y-4">
          <Segmented value={period} onChange={setPeriod} options={[
            { value: "today", label: t("shop.todayOnly") }, { value: "week", label: t("shop.thisWeek") }, { value: "all", label: t("shop.allPlan") },
          ]} />
          <div className="rounded-2xl bg-white px-4 dark:bg-[#2c2c2e]"><Toggle checked={excludePantry} onChange={(v) => set({ excludePantry: v })} label={t("shop.excludePantry")} /></div>
          <ActionList actions={[
            { label: "WhatsApp", onClick: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank") },
            { label: "Telegram", onClick: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("🛒 NutriMD")}`, "_blank") },
            { label: t("shop.copyLink"), onClick: async () => { await navigator.clipboard.writeText(shareUrl); setNote(t("shop.copied")); setMenu(false); } },
            { label: t("shop.pdf"), onClick: () => { setMenu(false); setTimeout(() => window.print(), 300); } },
          ]} />
          <ActionList actions={[
            { label: t("shop.uncheck"), onClick: () => { set({ shoppingChecked: {} }); setMenu(false); }, disabled: doneCount === 0 },
            { label: t("shop.clearRecipes"), danger: true, onClick: () => { set({ shoppingExtras: [] }); setMenu(false); }, disabled: extras.length === 0 },
          ]} />
        </div>
      </Modal>

      <Modal open={storesOpen} onClose={() => setStoresOpen(false)} title={t("shop.where")}>
        <ListGroup title={t("shop.compare")} footer={`${profile.city} · ${sheets?.onlyMine && sheets.sheetProductIds?.length ? t("sh.fromSheet") : t("common.demo")}`}>
          {cmp.cheapest && storeOption(cmp.cheapest, `${t("shop.cheapest")} · ${storeNames(cmp.cheapest.storeIds)}`, "cheapest")}
          {cmp.bestMixed && storeOption(cmp.bestMixed, `${t("shop.mixed")} · ${storeNames(cmp.bestMixed.storeIds)}`, "mixed")}
        </ListGroup>
        <ListGroup title={t("shop.stores")}>
          {cmp.single.map((b) => storeOption(b, catalog.storeMap[b.storeIds[0]].name, b.storeIds[0]))}
        </ListGroup>
        <ListGroup title={t("shop.nearest")}>
          <div className="p-4"><StoreMap city={profile.city} stores={localStores.length ? localStores : catalog.stores} /></div>
        </ListGroup>
      </Modal>
    </div>
  );
}
