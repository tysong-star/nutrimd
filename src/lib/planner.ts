/**
 * Generatorul de plan de mese.
 * Pentru fiecare zi și fiecare masă alege rețeta + multiplicatorul de porție care
 * minimizează un scor ce combină: abaterea de la caloriile țintei mesei, abaterea de
 * la proteine, costul față de buget, varietatea și preferințele de bucătărie.
 * Algoritm greedy determinist (seed) — rapid (< 10 ms pentru o săptămână).
 */
import type { MacroTargets, MealPlan, MealSlot, PlanDay, PlannedMeal, Profile } from "./types";
import type { Catalog } from "./catalog";
import { recipeAllowed } from "./recipeInfo";
import { dailyBudget, slotToMealType, slotsFor } from "./nutrition";
import { rng, uid } from "./random";

export const PORTION_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function isoDate(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
export function addDays(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

interface Ctx { catalog: Catalog; profile: Profile; targets: MacroTargets; seed: string }

function candidates(ctx: Ctx, slot: MealSlot, date: string) {
  const type = slotToMealType(slot);
  const { catalog, profile } = ctx;
  let list = catalog.recipes.filter((r) => r.mealTypes.includes(type) && recipeAllowed(r, catalog.info[r.id], catalog.ingMap, profile, { date }));
  // Dacă restricțiile sunt prea stricte, relaxăm timpul de gătit înainte de a renunța.
  if (list.length === 0) list = catalog.recipes.filter((r) => r.mealTypes.includes(type) && recipeAllowed(r, catalog.info[r.id], catalog.ingMap, profile, { date, ignoreTime: true }));
  return list;
}

/** Alege cea mai bună rețetă pentru o masă, excluzând eventual anumite rețete. */
export function pickMeal(ctx: Ctx, slot: MealSlot, share: number, date: string, recent: string[], exclude: string[] = [], budgetFactor = 1): PlannedMeal | null {
  const { catalog, targets, profile } = ctx;
  const list = candidates(ctx, slot, date).filter((r) => !exclude.includes(r.id));
  if (!list.length) return null;
  const rand = rng(`${ctx.seed}-${date}-${slot}-${exclude.join(",")}`);
  const kcalTarget = targets.kcal * share;
  const proteinTarget = targets.protein * share;
  const budgetSlot = (dailyBudget(profile) / Math.max(1, profile.householdSize)) * share * budgetFactor;
  let best: { score: number; meal: PlannedMeal } | null = null;
  for (const r of list) {
    const info = catalog.info[r.id];
    for (const portions of PORTION_STEPS) {
      const kcal = info.nutrition.kcal * portions;
      const prot = info.nutrition.protein * portions;
      const cost = info.costPerServing * portions;
      let score = Math.abs(kcal - kcalTarget) / Math.max(1, kcalTarget);
      score += 0.5 * Math.max(0, proteinTarget - prot) / Math.max(1, proteinTarget);
      const fat = info.nutrition.fat * portions, fatTarget = targets.fat * share;
      score += 0.6 * Math.max(0, fat - fatTarget * 1.1) / Math.max(1, fatTarget);
      const carbs = info.nutrition.carbs * portions, carbTarget = targets.carbs * share;
      score += 0.3 * Math.abs(carbs - carbTarget) / Math.max(1, carbTarget);
      if (budgetSlot > 0 && cost > budgetSlot) score += 1.5 * (cost - budgetSlot) / budgetSlot;
      const usedTimes = recent.filter((x) => x === r.id).length;
      score += usedTimes * 0.6;
      if (profile.cuisines.length && !profile.cuisines.includes(r.cuisine)) score += 0.15;
      if (portions !== 1) score += 0.03 * Math.abs(portions - 1);
      score += rand() * 0.12; // ușoară varietate
      if (!best || score < best.score) best = { score, meal: { uid: uid(), slot, recipeId: r.id, portions } };
    }
  }
  return best?.meal ?? null;
}

export function generatePlan(catalog: Catalog, profile: Profile, targets: MacroTargets, startDate: string, days: number, mealPrep: boolean, seed = String(Date.now())): MealPlan {
  const ctx: Ctx = { catalog, profile, targets, seed };
  const slots = slotsFor(profile.mealsPerDay);
  const recent: string[] = [];
  const out: PlanDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    const meals: PlannedMeal[] = [];
    for (const { slot, share } of slots) {
      // Meal prep: prânzul și cina se repetă câte 2–3 zile (gătești o dată).
      if (mealPrep && (slot === "lunch" || slot === "dinner") && i % 3 !== 0) {
        const prev = out[out.length - 1]?.meals.find((m) => m.slot === slot);
        const prevRecipe = prev && catalog.recipeMap[prev.recipeId];
        if (prev && prevRecipe && recipeAllowed(prevRecipe, catalog.info[prevRecipe.id], catalog.ingMap, profile, { date, ignoreTime: true })) {
          meals.push({ ...prev, uid: uid(), eaten: false });
          continue;
        }
      }
      const pool = mealPrep && (slot === "lunch" || slot === "dinner")
        ? catalog.recipes.filter((r) => !r.mealPrepFriendly).map((r) => r.id)
        : [];
      const m = pickMeal(ctx, slot, share, date, recent.slice(-12), pool) ?? pickMeal(ctx, slot, share, date, recent.slice(-12));
      if (m) {
        if (mealPrep && (slot === "lunch" || slot === "dinner")) m.mealPrepGroup = `${slot}-${Math.floor(i / 3)}`;
        meals.push(m);
        recent.push(m.recipeId);
      }
    }
    out.push({ date, meals });
  }
  return { createdAt: new Date().toISOString(), days: out, mealPrep };
}

export function dayTotals(day: PlanDay, catalog: Catalog) {
  let kcal = 0, protein = 0, carbs = 0, fat = 0, fiber = 0, cost = 0;
  for (const m of day.meals) {
    const info = catalog.info[m.recipeId];
    if (!info) continue;
    kcal += info.nutrition.kcal * m.portions;
    protein += info.nutrition.protein * m.portions;
    carbs += info.nutrition.carbs * m.portions;
    fat += info.nutrition.fat * m.portions;
    fiber += info.nutrition.fiber * m.portions;
    cost += info.costPerServing * m.portions;
  }
  return { kcal, protein, carbs, fat, fiber, cost };
}

/** Costul planului pentru întreaga gospodărie. */
export function planCost(plan: MealPlan, catalog: Catalog, household: number) {
  return plan.days.reduce((s, d) => s + dayTotals(d, catalog).cost, 0) * household;
}

/** Înlocuiește cele mai scumpe mese cu alternative mai ieftine până se încadrează în buget. */
export function fitToBudget(plan: MealPlan, catalog: Catalog, profile: Profile, targets: MacroTargets): { plan: MealPlan; changes: number } {
  const budget = dailyBudget(profile) * plan.days.length;
  const ctx: Ctx = { catalog, profile, targets, seed: "budget" };
  const slots = slotsFor(profile.mealsPerDay);
  const next: MealPlan = JSON.parse(JSON.stringify(plan));
  let changes = 0;
  const locked = new Set<string>(); // mese fără alternativă mai ieftină
  for (let guard = 0; guard < 60 && planCost(next, catalog, profile.householdSize) > budget; guard++) {
    // cea mai scumpă masă
    let worst: { d: number; m: number; cost: number } | null = null;
    next.days.forEach((day, d) => day.meals.forEach((meal, m) => {
      const c = catalog.info[meal.recipeId].costPerServing * meal.portions;
      if (!meal.eaten && !locked.has(meal.uid) && (!worst || c > worst.cost)) worst = { d, m, cost: c };
    }));
    if (!worst) break;
    const w = worst as { d: number; m: number; cost: number };
    const day = next.days[w.d];
    const meal = day.meals[w.m];
    const share = slots.find((s) => s.slot === meal.slot)?.share ?? 0.25;
    const replacement = pickMeal(ctx, meal.slot, share, day.date, [], [meal.recipeId], 0.5);
    if (!replacement || catalog.info[replacement.recipeId].costPerServing * replacement.portions >= w.cost) {
      locked.add(meal.uid);
      continue;
    }
    day.meals[w.m] = { ...replacement, slot: meal.slot };
    locked.add(replacement.uid);
    changes++;
  }
  return { plan: next, changes };
}
