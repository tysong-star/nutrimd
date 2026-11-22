/**
 * Tipuri de domeniu NutriMD.
 * Toate textele afișate utilizatorului care provin din date sunt bilingve (ro/ru).
 */

export type Lang = "ro" | "ru";
export type L10n = { ro: string; ru: string };

// ---------- Profil ----------
export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose" | "maintain" | "gain" | "recomp" | "pregnancy" | "lactation" | "athlete";
export type BudgetPeriod = "day" | "week" | "month";
export type Diet =
  | "omnivore" | "vegetarian" | "vegan" | "pescatarian" | "keto" | "lowcarb"
  | "paleo" | "mediterranean" | "highprotein" | "sugarfree" | "orthodox_fast";
export type Allergen =
  | "gluten" | "lactose" | "eggs" | "nuts" | "peanuts" | "soy" | "fish" | "shellfish"
  | "sesame" | "celery" | "mustard" | "lupin" | "sulfites";
export type Cuisine = "moldovan" | "ukrainian" | "italian" | "asian" | "mediterranean" | "romanian" | "middle_eastern" | "international";
export type Equipment = "oven" | "stove" | "airfryer" | "multicooker" | "blender" | "microwave" | "grill";
export type MealSlot = "breakfast" | "snack1" | "lunch" | "snack2" | "dinner" | "snack3";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface MacroTargets {
  kcal: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  fiber: number; // g
  waterMl: number;
}

export interface Profile {
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  targetWeightKg?: number;
  activity: ActivityLevel;
  goal: Goal;
  /** Dacă e setat, înlocuiește calculul automat. */
  manualTargets?: Partial<MacroTargets>;
  mealsPerDay: number; // 2–6 (mese principale + gustări)
  budget: { amount: number; period: BudgetPeriod };
  allergens: Allergen[];
  customAllergens: string[]; // text liber, căutat în numele ingredientelor
  diet: Diet;
  cuisines: Cuisine[];
  excludedIngredients: string[]; // id-uri de ingrediente
  maxCookMin: 15 | 30 | 60 | 999;
  maxDifficulty: 1 | 2 | 3;
  equipment: Equipment[];
  householdSize: number;
  city: string;
  preferredStores: string[];
  onboarded: boolean;
  consentAt?: string; // ISO — consimțământ GDPR
}

// ---------- Ingrediente / rețete ----------
export type Aisle =
  | "vegetables" | "fruits" | "dairy" | "meat" | "fish" | "bakery" | "grains"
  | "canned" | "spices" | "oils" | "frozen" | "drinks" | "nuts" | "other";

export type IngredientCategory =
  | "meat" | "poultry" | "fish" | "seafood" | "dairy" | "egg" | "grain" | "legume"
  | "vegetable" | "fruit" | "nut" | "seed" | "oil" | "sugar" | "spice" | "honey" | "other";

export interface Nutrients {
  kcal: number; protein: number; carbs: number; fat: number;
  fiber: number; sugar: number; salt: number;
}

export interface Ingredient {
  id: string;
  name: L10n;
  emoji: string;
  aisle: Aisle;
  category: IngredientCategory;
  /** Unitatea de măsură în rețete. „pcs” = bucăți (convertite în grame prin gramsPerUnit). */
  unit: "g" | "ml" | "pcs";
  gramsPerUnit?: number;
  per100: Nutrients; // la 100 g
  allergens: Allergen[];
  /** Preț de referință MDL/kg (folosit pentru generarea prețurilor demo). */
  refPricePerKg: number;
  /** Ingredient de bază pe care probabil îl ai acasă (sare, condimente). */
  pantry?: boolean;
  substitutes?: string[];
}

export interface RecipeIngredient { id: string; amount: number; note?: L10n }
export interface RecipeStep { text: L10n; timerMin?: number; image?: string }
export interface VideoChapter { stepIndex: number; startSec: number }

export interface Recipe {
  id: string;
  title: L10n;
  description: L10n;
  emoji: string;
  gradient: [string, string];
  image?: string;
  video?: { url: string; chapters: VideoChapter[]; captionsUrl?: string };
  cuisine: Cuisine;
  mealTypes: MealType[];
  servings: number;
  prepMin: number;
  cookMin: number;
  difficulty: 1 | 2 | 3;
  equipment: Equipment[];
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  extraTags?: string[];
  mealPrepFriendly?: boolean;
  custom?: boolean;
}

/** Informații derivate calculate dintr-o rețetă (per porție). */
export interface RecipeInfo {
  nutrition: Nutrients;
  costPerServing: number;
  allergens: Allergen[];
  diets: Diet[];
  tags: string[];
  totalMin: number;
}

// ---------- Magazine / produse ----------
export interface Store {
  id: string;
  name: string;
  color: string;
  onlineUrl?: string;
  deliveryUrl?: string;
  cities: string[];
  priceFactor: number; // demo
  /** Sursa datelor: api | feed | admin | demo */
  source: "api" | "feed" | "admin" | "demo";
}

export interface StoreLocation { storeId: string; city: string; label: string; lat: number; lng: number }

export interface Product {
  id: string;
  storeId: string;
  ingredientId: string;
  name: string;
  brand: string;
  packSize: number; // în unitatea ingredientului (g/ml/pcs)
  packLabel: string; // „1 kg”, „500 g”, „10 buc”
  price: number; // MDL
  promoPrice?: number;
  promoUntil?: string;
  inStock: boolean;
  /** Vândut la cântar: se plătește cantitatea exactă (prețul e per `packSize`). */
  byWeight?: boolean;
  ean: string;
  emoji: string;
  updatedAt: string; // ISO
  image?: string;
}

// ---------- Plan ----------
export interface PlannedMeal {
  uid: string;
  slot: MealSlot;
  recipeId: string;
  portions: number; // porții de persoană (multiplicator)
  eaten?: boolean;
  mealPrepGroup?: string;
}
export interface PlanDay { date: string; meals: PlannedMeal[] }
export interface MealPlan { createdAt: string; days: PlanDay[]; mealPrep: boolean }

// ---------- Jurnal ----------
export interface JournalEntry {
  id: string;
  date: string; // yyyy-mm-dd
  slot: MealSlot | "extra";
  name: string;
  grams?: number;
  nutrition: Nutrients;
  source: "plan" | "search" | "barcode" | "manual";
  refId?: string;
}

export interface Review {
  id: string;
  recipeId: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  status: "pending" | "approved" | "hidden";
}

export interface Workout {
  id: string;
  name: L10n;
  emoji: string;
  met: number;
  minutes: number;
  videoUrl?: string;
  steps: L10n[];
}
