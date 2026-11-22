"use client";
/**
 * Catalogul combină datele de bază (demo sau importate) cu modificările din panoul Admin
 * și cu profilul utilizatorului (substituții automate pentru alergeni/excluderi).
 * La integrarea cu Supabase, `baseRecipes`/`baseProducts` vor veni din baza de date.
 */
import { useMemo } from "react";
import { INGREDIENTS, INGREDIENT_MAP } from "@/data/ingredients";
import { RECIPES } from "@/data/recipes";
import { DEMO_PRODUCTS, STORES } from "@/data/stores";
import type { Ingredient, Product, Profile, Recipe, RecipeInfo, Store } from "./types";
import { computeRecipeInfo, findSubstitute, ingredientConflict, subAmount, type PriceIndex } from "./recipeInfo";
import { useApp, type AdminState } from "./store";

export const effectivePrice = (p: Product) => (p.promoPrice && p.promoUntil && new Date(p.promoUntil) > new Date() ? p.promoPrice : p.price);

export interface Catalog {
  ingredients: Ingredient[];
  ingMap: Record<string, Ingredient>;
  stores: Store[];
  storeMap: Record<string, Store>;
  products: Product[];
  productsByIngredient: Record<string, Product[]>;
  productByEan: Record<string, Product>;
  prices: PriceIndex;
  recipes: Recipe[];
  recipeMap: Record<string, Recipe>;
  info: Record<string, RecipeInfo>;
  /** Substituțiile aplicate pentru profilul curent: recipeId -> [original, înlocuitor][] */
  substitutions: Record<string, [string, string][]>;
}

export function buildCatalog(admin: AdminState, profile?: Profile, onlyIds?: string[] | null): Catalog {
  const stores = [...STORES, ...admin.customStores].filter((s) => !admin.disabledStores.includes(s.id));
  const storeIds = new Set(stores.map((s) => s.id));
  const products = [...DEMO_PRODUCTS, ...admin.customProducts]
    .filter((p) => storeIds.has(p.storeId) && !admin.deletedProducts.includes(p.id))
    .filter((p) => !onlyIds || onlyIds.includes(p.id)) // „doar prețurile din Google Sheet”
    .map((p) => (admin.productOverrides[p.id] ? { ...p, ...admin.productOverrides[p.id] } : p));

  const productsByIngredient: Record<string, Product[]> = {};
  const productByEan: Record<string, Product> = {};
  for (const p of products) {
    (productsByIngredient[p.ingredientId] ??= []).push(p);
    productByEan[p.ean] = p;
  }
  // Index de preț: cel mai mic preț/unitate dintre produsele în stoc.
  const prices: PriceIndex = {};
  for (const [ingId, list] of Object.entries(productsByIngredient)) {
    const inStock = list.filter((p) => p.inStock);
    const src = inStock.length ? inStock : list;
    prices[ingId] = Math.min(...src.map((p) => effectivePrice(p) / p.packSize));
  }

  const baseRecipes = RECIPES.filter((r) => !admin.deletedRecipes.includes(r.id)).map((r) => admin.recipes[r.id] ?? r);
  const customRecipes = Object.values(admin.recipes).filter((r) => !RECIPES.some((b) => b.id === r.id) && !admin.deletedRecipes.includes(r.id));
  const ingMap = INGREDIENT_MAP;
  const substitutions: Record<string, [string, string][]> = {};

  const recipes = [...baseRecipes, ...customRecipes].map((r) => {
    if (!profile) return r;
    // Ingrediente lipsă din stoc în toate magazinele => încercăm substituție.
    const subs: [string, string][] = [];
    const ingredients = r.ingredients.map((ri) => {
      const ing = ingMap[ri.id];
      if (!ing) return ri;
      const allOut = (productsByIngredient[ing.id] ?? []).every((p) => !p.inStock);
      if (ingredientConflict(ing, profile) || allOut) {
        const sub = findSubstitute(ing, ingMap, profile);
        if (sub) {
          subs.push([ing.id, sub.id]);
          const amount = subAmount(ing, sub, ri.amount);
          return { ...ri, id: sub.id, amount };
        }
      }
      return ri;
    });
    if (subs.length) substitutions[r.id] = subs;
    return subs.length ? { ...r, ingredients } : r;
  });

  const info: Record<string, RecipeInfo> = {};
  for (const r of recipes) info[r.id] = computeRecipeInfo(r, ingMap, prices);

  return {
    ingredients: INGREDIENTS, ingMap, stores, storeMap: Object.fromEntries(stores.map((s) => [s.id, s])),
    products, productsByIngredient, productByEan, prices,
    recipes, recipeMap: Object.fromEntries(recipes.map((r) => [r.id, r])), info, substitutions,
  };
}

/** Catalog personalizat pentru profilul curent (memoizat). */
export function useCatalog(): Catalog {
  const admin = useApp((s) => s.admin);
  const profile = useApp((s) => s.profile);
  const sheets = useApp((s) => s.sheets);
  const onlyIds = sheets?.onlyMine && sheets.sheetProductIds?.length ? sheets.sheetProductIds : null;
  return useMemo(() => buildCatalog(admin, profile, onlyIds), [admin, profile, onlyIds]);
}
