"use client";
/**
 * Starea aplicației (zustand + persistență locală).
 * În „mod demo” totul se salvează în localStorage. Când Supabase este configurat,
 * `lib/sync.ts` sincronizează profilul, planul și jurnalul cu baza de date.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SheetsConfig } from "./sheets";
import type { JournalEntry, Lang, MealPlan, MealSlot, Product, Profile, Recipe, Review, Store } from "./types";

export interface AdminState {
  recipes: Record<string, Recipe>; // rețete noi sau editate
  deletedRecipes: string[];
  productOverrides: Record<string, Partial<Product>>;
  customProducts: Product[];
  deletedProducts: string[];
  customStores: Store[];
  disabledStores: string[];
  /** Asociere ingredient–produs preferat: `${storeId}:${ingredientId}` -> productId */
  mapping: Record<string, string>;
  importLog: { date: string; source: string; storeId: string; rows: number; updated: number; created: number; errors: number }[];
  reviewStatus: Record<string, Review["status"]>;
}

export interface AppState {
  lang: Lang;
  theme: "system" | "light" | "dark";
  fontScale: number;
  profile: Profile;
  plan: MealPlan | null;
  favorites: string[];
  journal: JournalEntry[];
  weights: { date: string; kg: number }[];
  water: Record<string, number>;
  workouts: { id: string; date: string; workoutId: string; minutes: number; kcal: number }[];
  spending: { id: string; date: string; amount: number; storeId: string }[];
  shoppingChecked: Record<string, boolean>;
  excludePantry: boolean;
  userReviews: Review[];
  reminders: { enabled: boolean; times: Partial<Record<MealSlot, string>>; water: boolean; shoppingDay: number | null };
  isAdmin: boolean;
  auth: { mode: "guest" | "supabase"; email?: string; phone?: string };
  admin: AdminState;
  /** Conexiunea la Google Sheets (prețuri + listă comună). */
  sheets: SheetsConfig | null;
  set: (p: Partial<AppState>) => void;
  setProfile: (p: Partial<Profile>) => void;
  setAdmin: (fn: (a: AdminState) => Partial<AdminState>) => void;
  toggleFavorite: (id: string) => void;
  resetAll: () => void;
}

export const DEFAULT_PROFILE: Profile = {
  name: "",
  age: 30,
  sex: "female",
  heightCm: 168,
  weightKg: 68,
  activity: "light",
  goal: "maintain",
  mealsPerDay: 4,
  budget: { amount: 1200, period: "week" },
  allergens: [],
  customAllergens: [],
  diet: "omnivore",
  cuisines: ["moldovan", "mediterranean"],
  excludedIngredients: [],
  maxCookMin: 60,
  maxDifficulty: 3,
  equipment: ["stove", "oven", "blender"],
  householdSize: 1,
  city: "Chișinău",
  preferredStores: ["linella", "nr1", "metro"],
  onboarded: false,
};

export const DEFAULT_ADMIN: AdminState = {
  recipes: {}, deletedRecipes: [], productOverrides: {}, customProducts: [], deletedProducts: [],
  customStores: [], disabledStores: [], mapping: {}, importLog: [], reviewStatus: {},
};

const initial = {
  lang: "ro" as Lang,
  theme: "system" as const,
  fontScale: 1,
  profile: DEFAULT_PROFILE,
  plan: null,
  favorites: [],
  journal: [],
  weights: [],
  water: {},
  workouts: [],
  spending: [],
  shoppingChecked: {},
  excludePantry: true,
  userReviews: [],
  reminders: { enabled: false, times: { breakfast: "08:00", lunch: "13:00", dinner: "19:00" }, water: true, shoppingDay: 6 },
  isAdmin: false,
  auth: { mode: "guest" as const },
  admin: DEFAULT_ADMIN,
  sheets: null as SheetsConfig | null,
};

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      ...initial,
      set: (p) => set(p),
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      setAdmin: (fn) => set((s) => ({ admin: { ...s.admin, ...fn(s.admin) } })),
      toggleFavorite: (id) =>
        set((s) => ({ favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id] })),
      resetAll: () => set({ ...initial }),
    }),
    {
      name: "nutrimd-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        return { ...current, ...p, profile: { ...DEFAULT_PROFILE, ...p.profile }, admin: { ...DEFAULT_ADMIN, ...p.admin } };
      },
    },
  ),
);
