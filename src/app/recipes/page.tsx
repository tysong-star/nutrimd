"use client";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useCatalog } from "@/lib/catalog";
import { useApp } from "@/lib/store";
import { useT, type TKey } from "@/lib/i18n";
import { recipeAllowed } from "@/lib/recipeInfo";
import { isoDate } from "@/lib/planner";
import type { Allergen, Cuisine, Diet, MealType } from "@/lib/types";
import { RecipeCard } from "@/components/RecipeCard";
import { Chip, EmptyState, Input, Select, Tag, cx } from "@/components/ui";
import { ALLERGENS, CUISINES, DIETS } from "@/components/ProfileSections";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const TAGS = ["fast", "quick", "cheap", "highprotein", "glutenfree", "lactosefree", "vegan", "keto", "mealprep", "traditional"];
type Sort = "relevance" | "time" | "cost" | "protein" | "kcal";

function RecipesInner() {
  const { t, l } = useT();
  const params = useSearchParams();
  const catalog = useCatalog();
  const profile = useApp((s) => s.profile);
  const favorites = useApp((s) => s.favorites);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"all" | "fav" | "fridge">(params.get("mode") === "fridge" ? "fridge" : params.get("mode") === "fav" ? "fav" : "all");
  const [showFilters, setShowFilters] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [cuisine, setCuisine] = useState<Cuisine | null>(null);
  const [diet, setDiet] = useState<Diet | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [avoid, setAvoid] = useState<Allergen[]>([]);
  const [maxTime, setMaxTime] = useState<number>(999);
  const [maxCost, setMaxCost] = useState<number>(999);
  const [maxDiff, setMaxDiff] = useState<number>(3);
  const [sort, setSort] = useState<Sort>("relevance");
  const [fridge, setFridge] = useState<string[]>([]);
  const [fridgeQ, setFridgeQ] = useState("");

  const today = isoDate(new Date());
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = catalog.recipes.map((r) => {
      const info = catalog.info[r.id];
      const missing = r.ingredients.filter((ri) => !catalog.ingMap[ri.id]?.pantry && !fridge.includes(ri.id)).map((ri) => ri.id);
      return { r, info, missing, matched: r.ingredients.filter((ri) => fridge.includes(ri.id)).length };
    });
    if (mode === "fav") list = list.filter((x) => favorites.includes(x.r.id));
    if (mode === "fridge") list = fridge.length ? list.filter((x) => x.matched > 0) : [];
    if (needle) list = list.filter(({ r }) => [r.title.ro, r.title.ru, r.description.ro, r.description.ru, ...r.ingredients.map((i) => `${catalog.ingMap[i.id]?.name.ro} ${catalog.ingMap[i.id]?.name.ru}`)].join(" ").toLowerCase().includes(needle));
    if (onlyMine) list = list.filter(({ r, info }) => recipeAllowed(r, info, catalog.ingMap, profile, { date: today }));
    if (mealType) list = list.filter(({ r }) => r.mealTypes.includes(mealType));
    if (cuisine) list = list.filter(({ r }) => r.cuisine === cuisine);
    if (diet) list = list.filter(({ info }) => info.diets.includes(diet));
    if (tags.length) list = list.filter(({ info }) => tags.every((tg) => info.tags.includes(tg)));
    if (avoid.length) list = list.filter(({ info }) => !info.allergens.some((a) => avoid.includes(a)));
    list = list.filter(({ r, info }) => info.totalMin <= maxTime && info.costPerServing <= maxCost && r.difficulty <= maxDiff);
    const sorters: Record<Sort, (a: (typeof list)[number], b: (typeof list)[number]) => number> = {
      relevance: (a, b) => (mode === "fridge" ? a.missing.length - b.missing.length || b.matched - a.matched : Number(profile.cuisines.includes(b.r.cuisine)) - Number(profile.cuisines.includes(a.r.cuisine))),
      time: (a, b) => a.info.totalMin - b.info.totalMin,
      cost: (a, b) => a.info.costPerServing - b.info.costPerServing,
      protein: (a, b) => b.info.nutrition.protein - a.info.nutrition.protein,
      kcal: (a, b) => a.info.nutrition.kcal - b.info.nutrition.kcal,
    };
    return [...list].sort(sorters[sort]);
  }, [catalog, q, mode, favorites, fridge, onlyMine, mealType, cuisine, diet, tags, avoid, maxTime, maxCost, maxDiff, sort, profile, today]);

  const fridgeMatches = fridgeQ.length >= 2 ? catalog.ingredients.filter((i) => !i.pantry && !fridge.includes(i.id) && `${i.name.ro} ${i.name.ru}`.toLowerCase().includes(fridgeQ.toLowerCase())).slice(0, 10) : [];
  const activeFilters = [onlyMine, mealType, cuisine, diet, tags.length, avoid.length, maxTime < 999, maxCost < 999, maxDiff < 3].filter(Boolean).length;
  const reset = () => { setOnlyMine(false); setMealType(null); setCuisine(null); setDiet(null); setTags([]); setAvoid([]); setMaxTime(999); setMaxCost(999); setMaxDiff(3); };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">{t("rec.title")}</h1>
      <div className="flex gap-2">
        <Input type="search" placeholder={t("rec.search")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("rec.search")} />
        <button onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}
          className={cx("relative min-h-[44px] shrink-0 rounded-xl border px-4 font-semibold", showFilters ? "border-brand-600 bg-brand-50 dark:bg-brand-900/40" : "border-slate-300 dark:border-slate-700")}>
          ⚙️ <span className="hidden sm:inline">{t("rec.filters")}</span>
          {activeFilters > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs text-white">{activeFilters}</span>}
        </button>
      </div>

      <div className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={mode === "all"} onClick={() => setMode("all")}>{t("common.all")}</Chip>
        <Chip active={mode === "fav"} onClick={() => setMode("fav")}>❤️ {t("rec.favorites")} ({favorites.length})</Chip>
        <Chip active={mode === "fridge"} onClick={() => setMode("fridge")}>🧊 {t("rec.fridge")}</Chip>
        <span className="mx-1 w-px shrink-0 bg-slate-200 dark:bg-slate-800" />
        {MEAL_TYPES.map((m) => <Chip key={m} active={mealType === m} onClick={() => setMealType(mealType === m ? null : m)}>{t(m === "snack" ? "slot.snack1" : (`slot.${m}` as TKey))}</Chip>)}
      </div>

      {showFilters && (
        <div className="mt-3 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <Chip active={onlyMine} onClick={() => setOnlyMine(!onlyMine)}>✅ {t("rec.onlyMine")}</Chip>
          <FilterRow label={t("p.diet")}>{DIETS.map((d) => <Chip key={d} active={diet === d} onClick={() => setDiet(diet === d ? null : d)}>{t(`diet.${d}` as TKey)}</Chip>)}</FilterRow>
          <FilterRow label={t("p.cuisines")}>{CUISINES.map((c) => <Chip key={c} active={cuisine === c} onClick={() => setCuisine(cuisine === c ? null : c)}>{t(`cu.${c}` as TKey)}</Chip>)}</FilterRow>
          <FilterRow label="Tags">{TAGS.map((tg) => <Chip key={tg} active={tags.includes(tg)} onClick={() => setTags(tags.includes(tg) ? tags.filter((x) => x !== tg) : [...tags, tg])}>{t(`tag.${tg}` as TKey)}</Chip>)}</FilterRow>
          <FilterRow label={`🚫 ${t("p.allergens")}`}>{ALLERGENS.map((a) => <Chip key={a} active={avoid.includes(a)} onClick={() => setAvoid(avoid.includes(a) ? avoid.filter((x) => x !== a) : [...avoid, a])}>{t(`al.${a}` as TKey)}</Chip>)}</FilterRow>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="text-sm font-semibold">{t("p.maxTime")}<Select value={maxTime} onChange={(e) => setMaxTime(Number(e.target.value))}>{[15, 30, 45, 60, 999].map((m) => <option key={m} value={m}>{m === 999 ? t("time.any") : `≤ ${m} min`}</option>)}</Select></label>
            <label className="text-sm font-semibold">{t("rec.cost")}<Select value={maxCost} onChange={(e) => setMaxCost(Number(e.target.value))}>{[15, 25, 40, 60, 999].map((m) => <option key={m} value={m}>{m === 999 ? t("common.all") : `≤ ${m} lei`}</option>)}</Select></label>
            <label className="text-sm font-semibold">{t("p.difficulty")}<Select value={maxDiff} onChange={(e) => setMaxDiff(Number(e.target.value))}>{[1, 2, 3].map((d) => <option key={d} value={d}>{t(`diff.${d}` as TKey)}</option>)}</Select></label>
            <label className="text-sm font-semibold">{t("rec.sort")}<Select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>{(["relevance", "time", "cost", "protein", "kcal"] as Sort[]).map((s) => <option key={s} value={s}>{t(`sort.${s}` as TKey)}</option>)}</Select></label>
          </div>
          <button onClick={reset} className="text-sm font-semibold text-brand-700 underline dark:text-brand-300">Reset</button>
        </div>
      )}

      {mode === "fridge" && (
        <div className="mt-3 rounded-2xl bg-sky-50 p-4 dark:bg-sky-950/40">
          <p className="mb-2 text-sm">{t("rec.fridgeHint")}</p>
          <Input value={fridgeQ} onChange={(e) => setFridgeQ(e.target.value)} placeholder="ouă, cartofi, яйца…" aria-label={t("rec.fridge")} />
          <div className="mt-2 flex flex-wrap gap-2">
            {fridgeMatches.map((i) => <Chip key={i.id} onClick={() => { setFridge([...fridge, i.id]); setFridgeQ(""); }}>{i.emoji} {l(i.name)} +</Chip>)}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {fridge.map((id) => <button key={id} onClick={() => setFridge(fridge.filter((x) => x !== id))}><Tag tone="blue">{catalog.ingMap[id].emoji} {l(catalog.ingMap[id].name)} ✕</Tag></button>)}
          </div>
        </div>
      )}

      <p className="mt-4 text-sm text-slate-500" aria-live="polite">{results.length} / {catalog.recipes.length}</p>
      {results.length === 0 ? (
        <div className="mt-4"><EmptyState emoji={mode === "fridge" ? "🧊" : "🔍"} title={mode === "fridge" && !fridge.length ? t("rec.fridge") : t("rec.none")} text={mode === "fridge" ? t("rec.fridgeHint") : undefined} /></div>
      ) : (
        <div className="mt-2 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map(({ r, info, missing }) => (
            <RecipeCard key={r.id} recipe={r} info={info}
              extra={mode === "fridge" ? (
                <p className={cx("mt-2 text-xs font-semibold", missing.length ? "text-amber-700 dark:text-amber-300" : "text-brand-700 dark:text-brand-300")}>
                  {missing.length ? `${t("rec.missing", { n: missing.length })}: ${missing.slice(0, 3).map((id) => l(catalog.ingMap[id]?.name)).join(", ")}${missing.length > 3 ? "…" : ""}` : t("rec.haveAll")}
                </p>
              ) : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-sm font-semibold">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export default function RecipesPage() {
  return <Suspense><RecipesInner /></Suspense>;
}
