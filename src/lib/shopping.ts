/**
 * Lista de cumpărături: agregare din plan, potrivire cu produse reale per magazin,
 * comparator de prețuri și „coș mixt” (2 magazine).
 */
import type { Aisle, Lang, MealPlan, Product } from "./types";
import { effectivePrice, type Catalog } from "./catalog";

export interface ShoppingItem {
  ingredientId: string;
  amount: number; // în unitatea ingredientului
  aisle: Aisle;
  pantry: boolean;
  recipes: string[];
}

export const AISLE_ORDER: Aisle[] = ["vegetables", "fruits", "dairy", "meat", "fish", "bakery", "grains", "canned", "frozen", "nuts", "oils", "spices", "drinks", "other"];

export function aggregatePlan(plan: MealPlan, catalog: Catalog, household: number, from?: string, to?: string): ShoppingItem[] {
  const map = new Map<string, ShoppingItem>();
  for (const day of plan.days) {
    if ((from && day.date < from) || (to && day.date > to)) continue;
    for (const meal of day.meals) {
      const recipe = catalog.recipeMap[meal.recipeId];
      if (!recipe) continue;
      for (const ri of recipe.ingredients) {
        const ing = catalog.ingMap[ri.id];
        if (!ing) continue;
        const amt = (ri.amount / recipe.servings) * meal.portions * household;
        const cur = map.get(ing.id) ?? { ingredientId: ing.id, amount: 0, aisle: ing.aisle, pantry: !!ing.pantry, recipes: [] };
        cur.amount += amt;
        if (!cur.recipes.includes(recipe.id)) cur.recipes.push(recipe.id);
        map.set(ing.id, cur);
      }
    }
  }
  return [...map.values()]
    .map((i) => ({ ...i, amount: catalog.ingMap[i.ingredientId].unit === "pcs" ? Math.ceil(i.amount * 4) / 4 : Math.ceil(i.amount / 5) * 5 }))
    .sort((a, b) => AISLE_ORDER.indexOf(a.aisle) - AISLE_ORDER.indexOf(b.aisle));
}

/** Adaugă în listă ingredientele rețetelor puse manual („Adaugă în listă” de pe pagina rețetei). */
export function mergeExtras(items: ShoppingItem[], extras: { recipeId: string; items: { id: string; amount: number }[] }[], catalog: Catalog): ShoppingItem[] {
  const map = new Map(items.map((i) => [i.ingredientId, { ...i, recipes: [...i.recipes] }]));
  for (const ex of extras) {
    for (const it of ex.items) {
      const ing = catalog.ingMap[it.id];
      if (!ing) continue;
      const cur = map.get(it.id) ?? { ingredientId: it.id, amount: 0, aisle: ing.aisle, pantry: !!ing.pantry, recipes: [] };
      cur.amount += it.amount;
      if (!cur.recipes.includes(ex.recipeId)) cur.recipes.push(ex.recipeId);
      map.set(it.id, cur);
    }
  }
  return [...map.values()].sort((a, b) => AISLE_ORDER.indexOf(a.aisle) - AISLE_ORDER.indexOf(b.aisle));
}

export interface Pick { product: Product; packs: number; cost: number }

/** Cea mai ieftină combinație de pachete dintr-un magazin pentru o cantitate. */
export function bestPick(products: Product[], amount: number): Pick | null {
  let best: Pick | null = null;
  for (const p of products) {
    if (!p.inStock) continue;
    // La cântar: cantitatea exactă (rotunjită la 50 g, minim 100 g); altfel pachete întregi.
    const packs = p.byWeight
      ? Math.max(100, Math.ceil(amount / 50) * 50) / p.packSize
      : Math.max(1, Math.ceil(amount / p.packSize - 0.05));
    const cost = packs * effectivePrice(p);
    if (!best || cost < best.cost) best = { product: p, packs, cost };
  }
  return best;
}

export interface StoreBasket {
  storeIds: string[];
  total: number;
  picks: Record<string, Pick | null>;
  missing: string[];
  savingsVsRegular: number; // economii din promoții
}

export function basketForStores(items: ShoppingItem[], catalog: Catalog, storeIds: string[], preferredMap: Record<string, string> = {}): StoreBasket {
  const picks: Record<string, Pick | null> = {};
  let total = 0;
  let savings = 0;
  const missing: string[] = [];
  for (const it of items) {
    let best: Pick | null = null;
    for (const sid of storeIds) {
      const prods = (catalog.productsByIngredient[it.ingredientId] ?? []).filter((p) => p.storeId === sid);
      // asocierea ingredient–produs din Admin are prioritate
      const forced = prods.find((p) => p.id === preferredMap[`${sid}:${it.ingredientId}`] && p.inStock);
      const pick = forced ? bestPick([forced], it.amount) : bestPick(prods, it.amount);
      if (pick && (!best || pick.cost < best.cost)) best = pick;
    }
    picks[it.ingredientId] = best;
    if (best) {
      total += best.cost;
      savings += best.packs * best.product.price - best.cost;
    } else missing.push(it.ingredientId);
  }
  return { storeIds, total: +total.toFixed(2), picks, missing, savingsVsRegular: +savings.toFixed(2) };
}

export interface Comparison { single: StoreBasket[]; bestMixed: StoreBasket | null; cheapest: StoreBasket | null }

/** Compară coșul în toate magazinele + cea mai bună combinație de 2 magazine. */
export function compareStores(items: ShoppingItem[], catalog: Catalog, city: string, preferredMap: Record<string, string> = {}): Comparison {
  const stores = catalog.stores.filter((s) => !city || s.cities.includes(city));
  const single = stores.map((s) => basketForStores(items, catalog, [s.id], preferredMap));
  // Comparație corectă: produsele lipsă se evaluează la cel mai bun preț din ALTE magazine
  // (costul real de a completa coșul) + 25 lei pentru drumul suplimentar.
  const allIds = catalog.stores.map((s) => s.id);
  const fallback = basketForStores(items, catalog, allIds, preferredMap);
  const fair = (b: StoreBasket) => b.total + (b.missing.length ? 25 : 0) + b.missing.reduce((s, id) => s + (fallback.picks[id]?.cost ?? 0) * 1.1, 0);
  single.sort((a, b) => fair(a) - fair(b));
  let bestMixed: StoreBasket | null = null;
  for (let i = 0; i < stores.length; i++)
    for (let j = i + 1; j < stores.length; j++) {
      const b = basketForStores(items, catalog, [stores[i].id, stores[j].id], preferredMap);
      if (!bestMixed || fair(b) < fair(bestMixed)) bestMixed = b;
    }
  const cheapest = single[0] ?? null;
  if (bestMixed && cheapest && fair(cheapest) - fair(bestMixed) < 15) bestMixed = null; // nu merită 2 drumuri pentru < 15 lei
  return { single, bestMixed, cheapest };
}

export function formatAmount(amount: number, unit: "g" | "ml" | "pcs", lang: Lang) {
  if (unit === "pcs") return `${+amount.toFixed(2)} ${lang === "ro" ? "buc" : "шт"}`;
  if (amount >= 1000) return `${+(amount / 1000).toFixed(2)} ${unit === "g" ? "kg" : lang === "ro" ? "l" : "л"}`;
  return `${Math.round(amount)} ${unit === "g" ? (lang === "ro" ? "g" : "г") : lang === "ro" ? "ml" : "мл"}`;
}

/** Codificare compactă a listei pentru link de partajare. */
export function encodeList(items: ShoppingItem[]): string {
  const json = JSON.stringify(items.map((i) => [i.ingredientId, +i.amount.toFixed(2)]));
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function decodeList(s: string): [string, number][] {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(b64))));
  } catch {
    return [];
  }
}
