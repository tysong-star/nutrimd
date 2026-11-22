"use client";
import { recipeHref } from "@/lib/paths";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCatalog } from "@/lib/catalog";
import { useApp } from "@/lib/store";
import { useT, type TKey } from "@/lib/i18n";
import { calcTargets, dailyBudget, slotsFor } from "@/lib/nutrition";
import { addDays, dayTotals, fitToBudget, generatePlan, isoDate, pickMeal, planCost, PORTION_STEPS } from "@/lib/planner";
import { fastInfo } from "@/lib/fasting";
import { dateLong, mdl, weekdayShort } from "@/lib/format";
import { uid } from "@/lib/random";
import type { MealPlan, PlannedMeal, PlanDay } from "@/lib/types";
import { RecipeImage } from "@/components/RecipeCard";
import { Bar, Ring } from "@/components/viz";
import { Button, Card, Chip, EmptyState, Select, Tag, Toggle, cx } from "@/components/ui";

const SLOT_ORDER = ["breakfast", "snack1", "lunch", "snack2", "dinner", "snack3"];

export default function PlanPage() {
  const { t, l, lang } = useT();
  const catalog = useCatalog();
  const profile = useApp((s) => s.profile);
  const plan = useApp((s) => s.plan);
  const set = useApp((s) => s.set);
  const journal = useApp((s) => s.journal);
  const water = useApp((s) => s.water);
  const targets = calcTargets(profile);
  const today = isoDate(new Date());
  const [view, setView] = useState<"day" | "week">("day");
  const [selected, setSelected] = useState(today);
  const [mealPrep, setMealPrep] = useState(plan?.mealPrep ?? false);
  const [days, setDays] = useState(7);
  const [clipboard, setClipboard] = useState<PlanDay | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ date: string; uid: string } | null>(null);

  const save = (p: MealPlan) => set({ plan: p });
  const gen = () => {
    save(generatePlan(catalog, profile, targets, today, days, mealPrep));
    setSelected(today);
    setMsg(null);
  };

  const cost = plan ? planCost(plan, catalog, profile.householdSize) : 0;
  const budget = plan ? dailyBudget(profile) * plan.days.length : 0;
  const shown = useMemo(() => {
    if (!plan) return [];
    return view === "day" ? plan.days.filter((d) => d.date === selected) : plan.days;
  }, [plan, view, selected]);

  if (!plan || plan.days.length === 0) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-extrabold tracking-tight">{t("plan.title")}</h1>
        <EmptyState emoji="📅" title={t("home.noPlan")} text={t("home.noPlanText")} action={
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-2"><Chip active={days === 1} onClick={() => setDays(1)}>{t("plan.day")}</Chip><Chip active={days === 7} onClick={() => setDays(7)}>{t("plan.week")}</Chip></div>
            <Toggle checked={mealPrep} onChange={setMealPrep} label={`🍱 ${t("plan.mealPrep")}`} />
            <Button size="lg" onClick={gen}>✨ {t("plan.generate")}</Button>
          </div>
        } />
      </div>
    );
  }

  // ---------- operații pe plan ----------
  const updateDay = (date: string, fn: (d: PlanDay) => PlanDay) => save({ ...plan, days: plan.days.map((d) => (d.date === date ? fn(d) : d)) });
  const updateMeal = (date: string, mUid: string, fn: (m: PlannedMeal) => PlannedMeal) => updateDay(date, (d) => ({ ...d, meals: d.meals.map((m) => (m.uid === mUid ? fn(m) : m)) }));

  const swap = (date: string, meal: PlannedMeal) => {
    const share = slotsFor(profile.mealsPerDay).find((s) => s.slot === meal.slot)?.share ?? 0.25;
    const recent = plan.days.flatMap((d) => d.meals.map((m) => m.recipeId));
    const next = pickMeal({ catalog, profile, targets, seed: uid() }, meal.slot, share, date, recent, [meal.recipeId]);
    if (next) updateMeal(date, meal.uid, () => ({ ...next, uid: meal.uid, slot: meal.slot }));
  };

  const move = (from: string, mUid: string, to: string) => {
    if (from === to) return;
    const meal = plan.days.find((d) => d.date === from)?.meals.find((m) => m.uid === mUid);
    if (!meal) return;
    const hasTo = plan.days.some((d) => d.date === to);
    const daysNext = plan.days.map((d) => d.date === from ? { ...d, meals: d.meals.filter((m) => m.uid !== mUid) } : d.date === to ? { ...d, meals: [...d.meals, { ...meal, eaten: false }] } : d);
    if (!hasTo) daysNext.push({ date: to, meals: [{ ...meal, eaten: false }] });
    save({ ...plan, days: daysNext.sort((a, b) => a.date.localeCompare(b.date)) });
  };

  const toggleEaten = (date: string, meal: PlannedMeal) => {
    const info = catalog.info[meal.recipeId];
    const recipe = catalog.recipeMap[meal.recipeId];
    const st = useApp.getState();
    if (meal.eaten) {
      set({ journal: st.journal.filter((j) => j.refId !== meal.uid) });
    } else {
      const n = info.nutrition;
      const k = meal.portions;
      set({ journal: [...st.journal, { id: uid(), date, slot: meal.slot, name: l(recipe.title), source: "plan", refId: meal.uid,
        nutrition: { kcal: n.kcal * k, protein: n.protein * k, carbs: n.carbs * k, fat: n.fat * k, fiber: n.fiber * k, sugar: n.sugar * k, salt: n.salt * k } }] });
    }
    updateMeal(date, meal.uid, (m) => ({ ...m, eaten: !m.eaten }));
  };

  const paste = (to: string) => {
    if (!clipboard) return;
    updateDay(to, (d) => ({ ...d, meals: clipboard.meals.map((m) => ({ ...m, uid: uid(), eaten: false })) }));
  };

  const copyWeek = () => {
    const last = plan.days.at(-1)!.date;
    const src = plan.days.slice(-7);
    const extra = src.map((d, i) => ({ date: addDays(last, i + 1), meals: d.meals.map((m) => ({ ...m, uid: uid(), eaten: false })) }));
    save({ ...plan, days: [...plan.days, ...extra] });
  };

  const doFit = () => {
    const { plan: p, changes } = fitToBudget(plan, catalog, profile, targets);
    save(p);
    setMsg(changes ? t("plan.fitDone", { n: changes }) : t("plan.fitNone"));
  };

  const consumedToday = journal.filter((j) => j.date === selected);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">{t("plan.title")}</h1>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {(["day", "week"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={cx("min-h-[36px] rounded-lg px-3 text-sm font-semibold", view === v && "bg-white shadow dark:bg-slate-950")}>{t(v === "day" ? "plan.day" : "plan.week")}</button>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={gen}>🔄 {t("plan.regenerate")}</Button>
          <Button variant="ghost" size="sm" onClick={copyWeek}>📋 {t("plan.copyWeek")}</Button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 text-sm shadow-sm dark:bg-slate-900">
        <Toggle checked={plan.mealPrep} onChange={(v) => { setMealPrep(v); save(generatePlan(catalog, profile, targets, plan.days[0].date, plan.days.length, v)); }} label={`🍱 ${t("plan.mealPrep")}`} />
        <span className="text-xs text-slate-500">{t("plan.mealPrepHint")}</span>
        <span className="ml-auto font-semibold">{t("plan.cost")}: {mdl(cost, lang)} / {mdl(budget, lang)}</span>
      </div>

      {cost > budget * 1.02 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
          <span>💸 {t("plan.overBudget", { x: mdl(cost - budget, lang) })}</span>
          <Button size="sm" variant="secondary" onClick={doFit}>{t("plan.fitBudget")}</Button>
        </div>
      )}
      {msg && <p className="mb-3 rounded-xl bg-brand-50 p-3 text-sm dark:bg-brand-900/40" role="status">{msg}</p>}

      {/* Selector de zile */}
      <div className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {plan.days.map((d) => {
          const f = fastInfo(d.date);
          return (
            <button key={d.date} onClick={() => { setSelected(d.date); setView("day"); }}
              onDragOver={(e) => e.preventDefault()} onDrop={() => dragging && move(dragging.date, dragging.uid, d.date)}
              className={cx("flex min-h-[64px] min-w-[64px] shrink-0 flex-col items-center justify-center rounded-2xl border-2 px-2 text-sm font-semibold capitalize",
                selected === d.date && view === "day" ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
                d.date === today && selected !== d.date && "border-brand-400")}>
              {weekdayShort(d.date, lang)}
              {profile.diet === "orthodox_fast" && f.fasting && <span aria-label={t("diet.orthodox_fast")}>☦️</span>}
            </button>
          );
        })}
      </div>
      {view === "week" && <p className="mb-3 text-xs text-slate-500">↔️ {t("plan.dragHint")}</p>}

      <div className={cx(view === "week" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "")}>
        {shown.map((day) => {
          const tot = dayTotals(day, catalog);
          const f = fastInfo(day.date);
          const meals = [...day.meals].sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));
          return (
            <section key={day.date} onDragOver={(e) => e.preventDefault()} onDrop={() => dragging && move(dragging.date, dragging.uid, day.date)}
              className={cx("rounded-3xl", view === "week" && "border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900")}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold capitalize">{dateLong(day.date, lang)}</h2>
                {f.fasting && (profile.diet === "orthodox_fast" || view === "day") && <Tag tone="warm">☦️ {f.name ? l(f.name) : ""}{f.fishAllowed ? ` · 🐟 ${t("home.fishAllowed")}` : ""}</Tag>}
                <div className="ml-auto flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setClipboard(day)} title={t("plan.copyDay")}>📄</Button>
                  {clipboard && clipboard.date !== day.date && <Button size="sm" variant="secondary" onClick={() => paste(day.date)}>{t("plan.pasteDay")}</Button>}
                </div>
              </div>

              {view === "day" ? (
                <Card className="mb-4">
                  <div className="flex flex-wrap justify-around gap-3">
                    <Ring value={tot.kcal} max={targets.kcal} label={t("macro.kcal")} color="#039855" warnOver />
                    <Ring value={tot.protein} max={targets.protein} label={t("macro.protein")} color="#2e90fa" />
                    <Ring value={tot.carbs} max={targets.carbs} label={t("macro.carbs")} color="#f79009" />
                    <Ring value={tot.fat} max={targets.fat} label={t("macro.fat")} color="#d444f1" warnOver />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Bar value={tot.fiber} max={targets.fiber} label={t("macro.fiber")} unit="g" color="bg-lime-500" />
                    <Bar value={water[day.date] ?? 0} max={targets.waterMl} label={`💧 ${t("macro.water")}`} unit="ml" color="bg-sky-500" />
                  </div>
                  {consumedToday.length > 0 && <p className="mt-3 text-xs text-slate-500">✓ {t("plan.eaten")}: {Math.round(consumedToday.reduce((s, j) => s + j.nutrition.kcal, 0))} kcal</p>}
                  <p className="mt-1 text-xs text-slate-500">{t("plan.cost")}: {mdl(tot.cost * profile.householdSize, lang)}</p>
                </Card>
              ) : (
                <div className="mb-3 space-y-1.5"><Bar value={tot.kcal} max={targets.kcal} label={t("macro.kcal")} unit="kcal" warnOver /><Bar value={tot.protein} max={targets.protein} label={t("macro.protein")} unit="g" color="bg-sky-500" /></div>
              )}

              <ul className="space-y-3">
                {meals.map((meal) => {
                  const r = catalog.recipeMap[meal.recipeId];
                  const info = catalog.info[meal.recipeId];
                  if (!r) return null;
                  return (
                    <li key={meal.uid} draggable onDragStart={() => setDragging({ date: day.date, uid: meal.uid })} onDragEnd={() => setDragging(null)}
                      className={cx("flex gap-3 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900", meal.eaten && "opacity-60", view === "day" && "cursor-grab")}>
                      <Link href={recipeHref(r.id)} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl"><RecipeImage recipe={r} className="[&>span:first-child]:text-4xl" /></Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                          {t(`slot.${meal.slot}` as TKey)}
                          {meal.mealPrepGroup && <span title="meal prep">🍱</span>}
                        </div>
                        <Link href={recipeHref(r.id)} className="line-clamp-2 font-bold leading-snug hover:underline">{l(r.title)}</Link>
                        <div className="mt-0.5 text-xs text-slate-500">{Math.round(info.nutrition.kcal * meal.portions)} kcal · P {Math.round(info.nutrition.protein * meal.portions)} g · {info.totalMin} min · {mdl(info.costPerServing * meal.portions, lang, 0)}</div>
                        {view === "day" && (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Button size="sm" variant="secondary" onClick={() => swap(day.date, meal)}>🔄 {t("plan.swap")}</Button>
                            <Select aria-label={t("common.servings")} className="!min-h-[36px] !w-auto !py-0 text-sm" value={meal.portions}
                              onChange={(e) => updateMeal(day.date, meal.uid, (m) => ({ ...m, portions: Number(e.target.value) }))}>
                              {PORTION_STEPS.map((p) => <option key={p} value={p}>{t("plan.portions", { n: p })}</option>)}
                            </Select>
                            <Select aria-label={t("plan.moveTo")} className="!min-h-[36px] !w-auto !py-0 text-sm" value="" onChange={(e) => e.target.value && move(day.date, meal.uid, e.target.value)}>
                              <option value="">{t("plan.moveTo")}</option>
                              {plan.days.filter((d) => d.date !== day.date).map((d) => <option key={d.date} value={d.date}>{weekdayShort(d.date, lang)}</option>)}
                            </Select>
                            <button onClick={() => toggleEaten(day.date, meal)} aria-pressed={!!meal.eaten} className={cx("min-h-[36px] rounded-xl px-3 text-sm font-semibold", meal.eaten ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800")}>
                              {meal.eaten ? `✓ ${t("plan.eaten")}` : t("plan.markEaten")}
                            </button>
                            <button onClick={() => updateDay(day.date, (d) => ({ ...d, meals: d.meals.filter((m) => m.uid !== meal.uid) }))} className="min-h-[36px] rounded-xl px-2 text-sm text-slate-500 hover:bg-red-50 hover:text-red-700" aria-label={t("common.delete")}>🗑</button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
                {meals.length === 0 && <li className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700">{t("plan.empty")}</li>}
              </ul>
              {view === "day" && (
                <Link href="/recipes" className="mt-3 block"><Button variant="ghost" className="w-full">＋ {t("plan.addMeal")}</Button></Link>
              )}
            </section>
          );
        })}
      </div>
      <div className="mt-6 text-center">
        <Link href="/shopping"><Button size="lg">🛒 {t("shop.title")}</Button></Link>
      </div>
    </div>
  );
}
