import type { ActivityLevel, Goal, MacroTargets, Profile } from "./types";

/** Coeficienți de activitate (PAL) standard. */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Rata metabolică bazală — ecuația Mifflin-St Jeor. */
export function bmrMifflin(p: Pick<Profile, "sex" | "weightKg" | "heightCm" | "age">): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === "male" ? base + 5 : base - 161;
}

/** Ajustare calorică și proteine (g/kg) în funcție de obiectiv. */
const GOAL_RULES: Record<Goal, { kcalDelta: number; kcalMult: number; proteinPerKg: number; fatPct: number }> = {
  lose: { kcalDelta: 0, kcalMult: 0.8, proteinPerKg: 1.8, fatPct: 0.28 },
  maintain: { kcalDelta: 0, kcalMult: 1, proteinPerKg: 1.4, fatPct: 0.3 },
  gain: { kcalDelta: 0, kcalMult: 1.12, proteinPerKg: 1.8, fatPct: 0.27 },
  recomp: { kcalDelta: 0, kcalMult: 0.95, proteinPerKg: 2.0, fatPct: 0.28 },
  // Recomandări generale; sarcina/alăptarea necesită supraveghere medicală.
  pregnancy: { kcalDelta: 340, kcalMult: 1, proteinPerKg: 1.3, fatPct: 0.3 },
  lactation: { kcalDelta: 450, kcalMult: 1, proteinPerKg: 1.3, fatPct: 0.3 },
  athlete: { kcalDelta: 0, kcalMult: 1.1, proteinPerKg: 2.0, fatPct: 0.25 },
};

export function tdee(p: Profile): number {
  return bmrMifflin(p) * ACTIVITY_FACTORS[p.activity];
}

/** Calculează țintele zilnice; suprascrierile manuale din profil au prioritate. */
export function calcTargets(p: Profile): MacroTargets {
  const rule = GOAL_RULES[p.goal];
  const kcalRaw = tdee(p) * rule.kcalMult + rule.kcalDelta;
  // Nu coborâm sub un minim de siguranță.
  const kcal = Math.round(Math.max(p.sex === "male" ? 1500 : 1200, kcalRaw) / 10) * 10;
  const protein = Math.round(p.weightKg * rule.proteinPerKg);
  const fat = Math.round((kcal * rule.fatPct) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const fiber = Math.round((kcal / 1000) * 14); // 14 g / 1000 kcal
  const waterMl = Math.round((p.weightKg * 33) / 50) * 50 + (p.goal === "lactation" ? 700 : 0);
  const auto: MacroTargets = { kcal, protein, carbs, fat, fiber, waterMl };

  // Dieta keto/low-carb redistribuie carbohidrații.
  if (p.diet === "keto") {
    auto.carbs = 30;
    auto.fat = Math.round((kcal - protein * 4 - 30 * 4) / 9);
  } else if (p.diet === "lowcarb") {
    auto.carbs = Math.min(auto.carbs, 100);
    auto.fat = Math.round((kcal - protein * 4 - auto.carbs * 4) / 9);
  }
  return { ...auto, ...stripUndefined(p.manualTargets ?? {}) };
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && !Number.isNaN(v))) as Partial<T>;
}

export function bmi(p: Pick<Profile, "weightKg" | "heightCm">) {
  const h = p.heightCm / 100;
  return p.weightKg / (h * h);
}

/** Bugetul convertit pe zi (în MDL). */
export function dailyBudget(p: Profile): number {
  const { amount, period } = p.budget;
  const perDay = period === "day" ? amount : period === "week" ? amount / 7 : amount / 30;
  return perDay;
}

/** Repartizarea caloriilor pe mese în funcție de numărul de mese/zi. */
import type { MealSlot } from "./types";
export function slotsFor(mealsPerDay: number): { slot: MealSlot; share: number }[] {
  switch (Math.min(6, Math.max(2, mealsPerDay))) {
    case 2: return [{ slot: "lunch", share: 0.5 }, { slot: "dinner", share: 0.5 }];
    case 3: return [{ slot: "breakfast", share: 0.3 }, { slot: "lunch", share: 0.4 }, { slot: "dinner", share: 0.3 }];
    case 4: return [{ slot: "breakfast", share: 0.25 }, { slot: "lunch", share: 0.35 }, { slot: "snack2", share: 0.1 }, { slot: "dinner", share: 0.3 }];
    case 5: return [{ slot: "breakfast", share: 0.25 }, { slot: "snack1", share: 0.1 }, { slot: "lunch", share: 0.3 }, { slot: "snack2", share: 0.1 }, { slot: "dinner", share: 0.25 }];
    default: return [{ slot: "breakfast", share: 0.22 }, { slot: "snack1", share: 0.1 }, { slot: "lunch", share: 0.28 }, { slot: "snack2", share: 0.1 }, { slot: "dinner", share: 0.22 }, { slot: "snack3", share: 0.08 }];
  }
}

export function slotToMealType(slot: MealSlot) {
  return slot.startsWith("snack") ? "snack" : (slot as "breakfast" | "lunch" | "dinner");
}

/** Calorii arse (MET). */
export const burnedKcal = (met: number, weightKg: number, minutes: number) => Math.round(met * weightKg * (minutes / 60));
