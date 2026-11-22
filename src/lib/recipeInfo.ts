import type { Allergen, Diet, Ingredient, Nutrients, Profile, Recipe, RecipeInfo } from "./types";
import { fastInfo } from "./fasting";

export const ZERO: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, salt: 0 };

export function addN(a: Nutrients, b: Nutrients, k = 1): Nutrients {
  return {
    kcal: a.kcal + b.kcal * k, protein: a.protein + b.protein * k, carbs: a.carbs + b.carbs * k,
    fat: a.fat + b.fat * k, fiber: a.fiber + b.fiber * k, sugar: a.sugar + b.sugar * k, salt: a.salt + b.salt * k,
  };
}

export const roundN = (n: Nutrients): Nutrients => ({
  kcal: Math.round(n.kcal), protein: +n.protein.toFixed(1), carbs: +n.carbs.toFixed(1), fat: +n.fat.toFixed(1),
  fiber: +n.fiber.toFixed(1), sugar: +n.sugar.toFixed(1), salt: +n.salt.toFixed(2),
});

/** Cantitatea în grame (pentru calcul nutrițional). */
export function toGrams(ing: Ingredient, amount: number): number {
  return ing.unit === "pcs" ? amount * (ing.gramsPerUnit ?? 100) : amount;
}

/** Preț minim per unitate de ingredient (MDL / g|ml|buc), calculat din produse. */
export type PriceIndex = Record<string, number>;

const ANIMAL_MEAT = new Set(["meat", "poultry"]);
const SEA = new Set(["fish", "seafood"]);

export function computeRecipeInfo(recipe: Recipe, ingMap: Record<string, Ingredient>, prices: PriceIndex): RecipeInfo {
  let total = { ...ZERO };
  let cost = 0;
  const allergens = new Set<Allergen>();
  const cats = new Set<string>();
  let hasGluten = false;
  for (const ri of recipe.ingredients) {
    const ing = ingMap[ri.id];
    if (!ing) continue;
    const g = toGrams(ing, ri.amount);
    total = addN(total, ing.per100, g / 100);
    // Ingredientele de cămară se contorizează la cost proporțional, nu la pachet.
    cost += (prices[ing.id] ?? ing.refPricePerKg / 1000 * (ing.unit === "pcs" ? ing.gramsPerUnit ?? 100 : 1)) * ri.amount;
    ing.allergens.forEach((a) => allergens.add(a));
    if (ing.allergens.includes("gluten")) hasGluten = true;
    cats.add(ing.category);
  }
  const per = roundN(addN(ZERO, total, 1 / recipe.servings));
  const has = (c: string) => cats.has(c);
  const diets: Diet[] = ["omnivore"];
  const noMeat = ![...cats].some((c) => ANIMAL_MEAT.has(c));
  const noSea = ![...cats].some((c) => SEA.has(c));
  const noAnimalProducts = !has("dairy") && !has("egg");
  if (noMeat && noSea) diets.push("vegetarian");
  if (noMeat && noSea && noAnimalProducts && !has("honey")) diets.push("vegan");
  if (noMeat) diets.push("pescatarian");
  if (noMeat && noSea && noAnimalProducts) diets.push("orthodox_fast");
  const netCarbs = per.carbs - per.fiber;
  if (netCarbs <= 12) diets.push("keto");
  if (per.carbs <= 30) diets.push("lowcarb");
  if (!has("grain") && !has("legume") && !has("dairy") && !has("sugar")) diets.push("paleo");
  if (!cats.has("meat") && per.sugar < 15 && (["mediterranean", "middle_eastern", "italian", "moldovan"].includes(recipe.cuisine))) diets.push("mediterranean");
  if (per.protein >= 20 && (per.protein * 4) / Math.max(1, per.kcal) >= 0.25) diets.push("highprotein");
  if (!has("sugar") && !has("honey") && per.sugar < 10) diets.push("sugarfree");

  const totalMin = recipe.prepMin + recipe.cookMin;
  const costPerServing = +(cost / recipe.servings).toFixed(2);
  const tags: string[] = [];
  if (diets.includes("orthodox_fast")) tags.push("fast");
  if (totalMin <= 20) tags.push("quick");
  if (costPerServing <= 20) tags.push("cheap");
  if (diets.includes("highprotein")) tags.push("highprotein");
  if (!hasGluten) tags.push("glutenfree");
  if (!allergens.has("lactose")) tags.push("lactosefree");
  if (diets.includes("vegan")) tags.push("vegan");
  if (diets.includes("keto")) tags.push("keto");
  if (recipe.mealPrepFriendly) tags.push("mealprep");
  (recipe.extraTags ?? []).forEach((t) => tags.push(t));

  return { nutrition: per, costPerServing, allergens: [...allergens], diets, tags, totalMin };
}

/** Verifică dacă un ingredient încalcă restricțiile utilizatorului. */
export function ingredientConflict(ing: Ingredient, p: Profile): "allergen" | "excluded" | "custom" | null {
  if (ing.allergens.some((a) => p.allergens.includes(a))) return "allergen";
  if (p.excludedIngredients.includes(ing.id)) return "excluded";
  const names = `${ing.name.ro} ${ing.name.ru}`.toLowerCase();
  if (p.customAllergens.some((c) => c.trim() && names.includes(c.trim().toLowerCase()))) return "custom";
  return null;
}

export interface FilterOpts { date?: string; ignoreTime?: boolean }

/** Dieta cerută pentru o anumită zi (postul ortodox se aplică doar în zilele de post). */
export function dietForDate(p: Profile, date?: string): { diet: Diet; fishOk?: boolean } {
  if (p.diet !== "orthodox_fast") return { diet: p.diet };
  if (!date) return { diet: "orthodox_fast" };
  const f = fastInfo(date);
  if (!f.fasting) return { diet: "omnivore" };
  return { diet: f.fishAllowed ? "pescatarian" : "orthodox_fast", fishOk: f.fishAllowed };
}

export function recipeAllowed(recipe: Recipe, info: RecipeInfo, ingMap: Record<string, Ingredient>, p: Profile, opts: FilterOpts = {}): boolean {
  const { diet } = dietForDate(p, opts.date);
  if (diet === "pescatarian" && p.diet === "orthodox_fast") {
    // zi cu dezlegare la pește: fără carne, lactate, ouă
    const bad = recipe.ingredients.some((ri) => ["meat", "poultry", "dairy", "egg"].includes(ingMap[ri.id]?.category));
    if (bad) return false;
  } else if (!info.diets.includes(diet)) return false;
  if (recipe.ingredients.some((ri) => ingMap[ri.id] && ingredientConflict(ingMap[ri.id], p) && !findSubstitute(ingMap[ri.id], ingMap, p))) return false;
  if (!opts.ignoreTime && info.totalMin > p.maxCookMin) return false;
  if (recipe.difficulty > p.maxDifficulty) return false;
  if (recipe.equipment.some((e) => !p.equipment.includes(e))) return false;
  return true;
}

/** Substituție inteligentă: prima alternativă compatibilă cu profilul. */
export function findSubstitute(ing: Ingredient, ingMap: Record<string, Ingredient>, p: Profile, unavailable: Set<string> = new Set()): Ingredient | null {
  for (const id of ing.substitutes ?? []) {
    const s = ingMap[id];
    if (s && !ingredientConflict(s, p) && !unavailable.has(id)) return s;
  }
  return null;
}

/** Cantitatea echivalentă a înlocuitorului (în unitatea acestuia). */
export function subAmount(from: Ingredient, to: Ingredient, amount: number): number {
  if (to.unit === from.unit) return amount;
  const grams = toGrams(from, amount);
  return to.unit === "pcs" ? Math.max(1, Math.round(grams / (to.gramsPerUnit ?? 100))) : grams;
}
