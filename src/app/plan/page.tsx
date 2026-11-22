"use client";
import Link from "next/link";
import { useState } from "react";
import { useCatalog } from "@/lib/catalog";
import { useApp } from "@/lib/store";
import { useT, type TKey } from "@/lib/i18n";
import { calcTargets, dailyBudget, slotsFor } from "@/lib/nutrition";
import { addDays, dayTotals, fitToBudget, generatePlan, isoDate, pickMeal, planCost, PORTION_STEPS } from "@/lib/planner";
import { fastInfo } from "@/lib/fasting";
import { mdl } from "@/lib/format";
import { uid } from "@/lib/random";
import { recipeHref } from "@/lib/paths";
import type { MealPlan, PlannedMeal, PlanDay } from "@/lib/types";
import { RecipeImage } from "@/components/RecipeCard";
import { ActionList, Button, EmptyState, IconButton, ListGroup, Modal, PageHeader, RoundCheck, Segmented, Toggle, cx } from "@/components/ui";
import { IconMore } from "@/components/icons";

const SLOT_ORDER = ["breakfast", "snack1", "lunch", "snack2", "dinner", "snack3"];

export default function PlanPage() {
  const { t, l, lang } = useT();
  const catalog = useCatalog();
  const profile = useApp((s) => s.profile);
  const plan = useApp((s) => s.plan);
  const set = useApp((s) => s.set);
  const targets = calcTargets(profile);
  const today = isoDate(new Date());
  const [selected, setSelected] = useState(today);
  const [days, setDays] = useState<"1" | "7">("7");
  const [mealPrep, setMealPrep] = useState(plan?.mealPrep ?? false);
  const [clipboard, setClipboard] = useState<PlanDay | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [planMenu, setPlanMenu] = useState(false);
  const [mealMenu, setMealMenu] = useState<{ date: string; meal: PlannedMeal } | null>(null);

  const save = (p: MealPlan) => set({ plan: p });
  const gen = (mp = mealPrep, n = Number(days)) => {
    save(generatePlan(catalog, profile, targets, today, n, mp));
    setSelected(today);
    setMsg(null);
  };

  if (!plan || plan.days.length === 0) {
    return (
      <div>
        <PageHeader title={t("plan.title")} />
        <EmptyState emoji="🗓" title={t("home.noPlan")} text={t("home.noPlanText")} action={
          <div className="flex w-72 flex-col gap-4">
            <Segmented value={days} onChange={setDays} options={[{ value: "1", label: t("plan.day") }, { value: "7", label: t("plan.week") }]} />
            <div className="rounded-2xl bg-white px-4 dark:bg-[#1c1c1e]"><Toggle checked={mealPrep} onChange={setMealPrep} label={t("plan.mealPrep")} /></div>
            <Button size="lg" onClick={() => gen()}>{t("plan.generate")}</Button>
          </div>
        } />
      </div>
    );
  }

  const cost = planCost(plan, catalog, profile.householdSize);
  const budget = dailyBudget(profile) * plan.days.length;
  const day = plan.days.find((d) => d.date === selected) ?? plan.days[0];
  const tot = dayTotals(day, catalog);
  const f = fastInfo(day.date);
  const meals = [...day.meals].sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));

  // ---------- operații ----------
  const updateDay = (date: string, fn: (d: PlanDay) => PlanDay) => save({ ...plan, days: plan.days.map((d) => (d.date === date ? fn(d) : d)) });
  const updateMeal = (date: string, mUid: string, fn: (m: PlannedMeal) => PlannedMeal) => updateDay(date, (d) => ({ ...d, meals: d.meals.map((m) => (m.uid === mUid ? fn(m) : m)) }));
  const swap = (date: string, meal: PlannedMeal) => {
    const share = slotsFor(profile.mealsPerDay).find((s) => s.slot === meal.slot)?.share ?? 0.25;
    const recent = plan.days.flatMap((d) => d.meals.map((m) => m.recipeId));
    const next = pickMeal({ catalog, profile, targets, seed: uid() }, meal.slot, share, date, recent, [meal.recipeId]);
    if (next) updateMeal(date, meal.uid, () => ({ ...next, uid: meal.uid, slot: meal.slot }));
  };
  const move = (from: string, mUid: string, to: string) => {
    const meal = plan.days.find((d) => d.date === from)?.meals.find((m) => m.uid === mUid);
    if (!meal || from === to) return;
    save({ ...plan, days: plan.days.map((d) => d.date === from ? { ...d, meals: d.meals.filter((m) => m.uid !== mUid) } : d.date === to ? { ...d, meals: [...d.meals, { ...meal, eaten: false }] } : d) });
  };
  const toggleEaten = (date: string, meal: PlannedMeal) => {
    const info = catalog.info[meal.recipeId];
    const st = useApp.getState();
    if (meal.eaten) set({ journal: st.journal.filter((j) => j.refId !== meal.uid) });
    else {
      const n = info.nutrition, k = meal.portions;
      set({ journal: [...st.journal, { id: uid(), date, slot: meal.slot, name: l(catalog.recipeMap[meal.recipeId].title), source: "plan", refId: meal.uid,
        nutrition: { kcal: n.kcal * k, protein: n.protein * k, carbs: n.carbs * k, fat: n.fat * k, fiber: n.fiber * k, sugar: n.sugar * k, salt: n.salt * k } }] });
    }
    updateMeal(date, meal.uid, (m) => ({ ...m, eaten: !m.eaten }));
  };
  const copyWeek = () => {
    const last = plan.days.at(-1)!.date;
    save({ ...plan, days: [...plan.days, ...plan.days.slice(-7).map((d, i) => ({ date: addDays(last, i + 1), meals: d.meals.map((m) => ({ ...m, uid: uid(), eaten: false })) }))] });
  };
  const doFit = () => {
    const { plan: p, changes } = fitToBudget(plan, catalog, profile, targets);
    save(p);
    setMsg(changes ? t("plan.fitDone", { n: changes }) : t("plan.fitNone"));
  };

  const pct = Math.min(100, (tot.kcal / targets.kcal) * 100);
  const wd = (iso: string) => new Intl.DateTimeFormat(lang === "ro" ? "ro-MD" : "ru-MD", { weekday: "short" }).format(new Date(iso + "T12:00:00")).replace(".", "");
  const setPortions = (delta: number) => {
    if (!mealMenu) return;
    const i = PORTION_STEPS.indexOf(mealMenu.meal.portions);
    const p = PORTION_STEPS[Math.min(PORTION_STEPS.length - 1, Math.max(0, (i < 0 ? 2 : i) + delta))];
    updateMeal(mealMenu.date, mealMenu.meal.uid, (m) => ({ ...m, portions: p }));
    setMealMenu({ ...mealMenu, meal: { ...mealMenu.meal, portions: p } });
  };

  return (
    <div>
      <PageHeader title={t("plan.title")} actions={<IconButton label={t("plan.options")} onClick={() => setPlanMenu(true)}><IconMore width={22} height={22} /></IconButton>} />

      {/* Zilele */}
      <div className="scrollbar-none -mx-4 mb-5 flex gap-1 overflow-x-auto px-4">
        {plan.days.map((d) => {
          const sel = d.date === day.date;
          return (
            <button key={d.date} onClick={() => setSelected(d.date)} aria-pressed={sel} className="flex w-[46px] shrink-0 flex-col items-center gap-1 py-1">
              <span className={cx("text-[12px] font-medium uppercase", d.date === today ? "text-brand-600" : "text-ink-2 dark:text-[#98989d]")}>{wd(d.date)}</span>
              <span className={cx("flex h-9 w-9 items-center justify-center rounded-full text-[17px] font-semibold tabular-nums transition",
                sel ? "bg-ink text-white dark:bg-white dark:text-black" : d.date === today ? "text-brand-600" : "")}>{Number(d.date.slice(8))}</span>
              <span className={cx("h-1 w-1 rounded-full", profile.diet === "orthodox_fast" && fastInfo(d.date).fasting ? "bg-amber-500" : "bg-transparent")} />
            </button>
          );
        })}
      </div>

      {/* Sumar zi */}
      <div className="mb-5 px-1">
        <div className="flex items-baseline justify-between">
          <p className="text-[28px] font-bold tabular-nums tracking-tight">{Math.round(tot.kcal)} <span className="text-[17px] font-medium text-ink-2">/ {targets.kcal} kcal</span></p>
          <p className="text-[15px] text-ink-2 tabular-nums dark:text-[#98989d]">{mdl(tot.cost * profile.householdSize, lang, 0)}</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} /></div>
        <p className="mt-2 text-[13px] text-ink-2 tabular-nums dark:text-[#98989d]">
          {t("macro.protein")} {Math.round(tot.protein)} g · {t("macro.carbs")} {Math.round(tot.carbs)} g · {t("macro.fat")} {Math.round(tot.fat)} g
        </p>
        {f.fasting && profile.diet === "orthodox_fast" && <p className="mt-1 text-[13px] text-amber-700 dark:text-amber-400">☦︎ {f.name ? l(f.name) : ""}{f.fishAllowed ? ` · ${t("home.fishAllowed")}` : ""}</p>}
      </div>

      {cost > budget * 1.02 && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-amber-500/10 px-4 py-3 text-[15px] text-amber-900 dark:text-amber-200">
          <span>{t("plan.overBudget", { x: mdl(cost - budget, lang, 0) })}</span>
          <Button size="sm" variant="secondary" onClick={doFit}>{lang === "ro" ? "Ajustează" : "Исправить"}</Button>
        </div>
      )}
      {msg && <p className="mb-4 px-1 text-[15px] text-brand-700 dark:text-brand-400" role="status">{msg}</p>}

      {meals.length === 0 ? <p className="py-10 text-center text-ink-2">{t("plan.empty2")}</p> : (
        <ListGroup>
          {meals.map((meal) => {
            const r = catalog.recipeMap[meal.recipeId];
            const info = catalog.info[meal.recipeId];
            if (!r) return null;
            return (
              <div key={meal.uid} className={cx("flex items-center gap-3 px-4 py-3", meal.eaten && "opacity-50")}>
                <Link href={recipeHref(r.id)} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl"><RecipeImage recipe={r} /></div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-2 dark:text-[#98989d]">{t(`slot.${meal.slot}` as TKey)}{meal.portions !== 1 ? ` · ${meal.portions}×` : ""}</p>
                    <p className="line-clamp-2 text-[17px] leading-snug">{l(r.title)}</p>
                    <p className="text-[13px] text-ink-2 dark:text-[#98989d]">{Math.round(info.nutrition.kcal * meal.portions)} kcal · {info.totalMin} {t("common.min")}</p>
                  </div>
                </Link>
                <RoundCheck checked={!!meal.eaten} onChange={() => toggleEaten(day.date, meal)} label={t("plan.markEaten")} />
                <button onClick={() => setMealMenu({ date: day.date, meal })} aria-label={t("plan.mealOptions")} className="-mr-2 flex h-10 w-8 items-center justify-center text-ink-3"><IconMore width={20} height={20} /></button>
              </div>
            );
          })}
        </ListGroup>
      )}
      <Link href="/recipes"><Button variant="ghost" className="w-full">＋ {t("plan.addMeal")}</Button></Link>

      <Modal open={planMenu} onClose={() => setPlanMenu(false)} title={t("plan.options")}>
        <div className="space-y-4">
          <div className="rounded-2xl bg-white px-4 dark:bg-[#2c2c2e]">
            <Toggle checked={plan.mealPrep} onChange={(v) => { setMealPrep(v); gen(v, plan.days.length); }} label={t("plan.mealPrep")} />
          </div>
          <p className="-mt-2 px-1 text-[13px] text-ink-2">{t("plan.mealPrepHint")}</p>
          <ActionList actions={[
            { label: t("plan.regenerate"), onClick: () => { gen(plan.mealPrep, plan.days.length); setPlanMenu(false); } },
            { label: t("plan.copyDay"), onClick: () => { setClipboard(day); setPlanMenu(false); } },
            ...(clipboard && clipboard.date !== day.date ? [{ label: `${t("plan.pasteDay")} · ${wd(day.date)} ${Number(day.date.slice(8))}`, onClick: () => { updateDay(day.date, (d) => ({ ...d, meals: clipboard.meals.map((m) => ({ ...m, uid: uid(), eaten: false })) })); setPlanMenu(false); } }] : []),
            { label: t("plan.copyWeek"), onClick: () => { copyWeek(); setPlanMenu(false); } },
            { label: t("plan.fitBudget"), onClick: () => { doFit(); setPlanMenu(false); } },
          ]} />
          <p className="px-1 text-[13px] text-ink-2">{t("plan.cost")}: {mdl(cost, lang, 0)} / {mdl(budget, lang, 0)}</p>
        </div>
      </Modal>

      <Modal open={!!mealMenu} onClose={() => setMealMenu(null)} title={mealMenu ? l(catalog.recipeMap[mealMenu.meal.recipeId]?.title) : ""}>
        {mealMenu && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-2 dark:bg-[#2c2c2e]">
              <span className="text-[17px]">{t("common.servings")}</span>
              <div className="flex items-center gap-3">
                <IconButton label="-" onClick={() => setPortions(-1)}>−</IconButton>
                <span className="w-10 text-center text-[17px] font-semibold tabular-nums">{mealMenu.meal.portions}×</span>
                <IconButton label="+" onClick={() => setPortions(1)}>+</IconButton>
              </div>
            </div>
            <ActionList actions={[
              { label: t("plan.swap"), onClick: () => { swap(mealMenu.date, mealMenu.meal); setMealMenu(null); } },
              { label: mealMenu.meal.eaten ? `✓ ${t("plan.eaten")}` : t("plan.markEaten"), onClick: () => { toggleEaten(mealMenu.date, mealMenu.meal); setMealMenu(null); } },
            ]} />
            <div>
              <p className="mb-2 px-1 text-[13px] font-medium uppercase tracking-wide text-ink-2">{t("plan.moveTo")}</p>
              <div className="flex flex-wrap gap-2">
                {plan.days.filter((d) => d.date !== mealMenu.date).map((d) => (
                  <button key={d.date} onClick={() => { move(mealMenu.date, mealMenu.meal.uid, d.date); setMealMenu(null); }} className="min-h-[36px] rounded-full bg-white px-3.5 text-[15px] dark:bg-[#2c2c2e]">{wd(d.date)} {Number(d.date.slice(8))}</button>
                ))}
              </div>
            </div>
            <ActionList actions={[{ label: t("common.delete"), danger: true, onClick: () => { updateDay(mealMenu.date, (d) => ({ ...d, meals: d.meals.filter((m) => m.uid !== mealMenu.meal.uid) })); setMealMenu(null); } }]} />
          </div>
        )}
      </Modal>
    </div>
  );
}
