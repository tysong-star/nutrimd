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
import { ProductPhoto, RecipeCard } from "@/components/RecipeCard";
import { IconFilter, IconSearch } from "@/components/icons";
import { Button, Chip, EmptyState, Field, IconButton, Input, Modal, PageHeader, Segmented, Select, Toggle, cx } from "@/components/ui";
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
      <PageHeader title={t("rec.title")} actions={
        <IconButton label={t("rec.filters")} onClick={() => setShowFilters(true)} className={cx(activeFilters > 0 && "bg-brand-500/100 text-white dark:bg-brand-500/100")}><IconFilter width={20} height={20} /></IconButton>
      } />
      <div className="relative">
        <IconSearch width={18} height={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
        <Input type="search" placeholder={t("rec.search")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("rec.search")} className="pl-9" />
      </div>
      <Segmented className="mt-3" value={mode} onChange={setMode} options={[
        { value: "all", label: t("common.all") },
        { value: "fav", label: t("rec.favorites") },
        { value: "fridge", label: t("rec.fridge") },
      ]} />

      {mode === "fridge" && (
        <div className="mt-4">
          <p className="mb-2 px-1 text-[15px] text-ink-2 dark:text-[#98989d]">{t("rec.fridgeHint")}</p>
          <Input value={fridgeQ} onChange={(e) => setFridgeQ(e.target.value)} placeholder="ouă, cartofi, яйца…" aria-label={t("rec.fridge")} />
          {fridgeMatches.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {fridgeMatches.map((i) => (
                <button key={i.id} onClick={() => { setFridge([...fridge, i.id]); setFridgeQ(""); }} className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 text-[15px] shadow-card dark:bg-[#1c1c1e]">
                  <ProductPhoto id={i.id} size={28} className="rounded-full" />{l(i.name)}
                </button>
              ))}
            </div>
          )}
          {fridge.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {fridge.map((id) => (
                <button key={id} onClick={() => setFridge(fridge.filter((x) => x !== id))} className="flex items-center gap-2 rounded-full bg-brand-500/100/10 py-1 pl-1 pr-3 text-[15px] text-brand-800 dark:text-brand-300">
                  <ProductPhoto id={id} size={28} className="rounded-full" />{l(catalog.ingMap[id].name)} ✕
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {results.length === 0 ? (
        <EmptyState emoji={mode === "fridge" ? "🧊" : mode === "fav" ? "♡" : "🔍"} title={mode === "fridge" && !fridge.length ? t("rec.fridge") : t("rec.none")} text={mode === "fridge" ? t("rec.fridgeHint") : undefined} />
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {results.map(({ r, info, missing }) => (
            <RecipeCard key={r.id} recipe={r} info={info}
              extra={mode === "fridge" ? (
                <p className={cx("px-0.5 text-[13px] font-medium", missing.length ? "text-amber-700 dark:text-amber-400" : "text-brand-700 dark:text-brand-400")}>
                  {missing.length ? t("rec.missing", { n: missing.length }) : t("rec.haveAll")}
                </p>
              ) : undefined} />
          ))}
        </div>
      )}

      <Modal open={showFilters} onClose={() => setShowFilters(false)} title={t("rec.filters")}>
        <div className="space-y-5">
          <div className="rounded-2xl bg-white px-4 dark:bg-[#2c2c2e]"><Toggle checked={onlyMine} onChange={setOnlyMine} label={t("rec.onlyMine")} /></div>
          <FilterRow label={t("plan.day")}>{MEAL_TYPES.map((m) => <Chip key={m} active={mealType === m} onClick={() => setMealType(mealType === m ? null : m)}>{t(m === "snack" ? "slot.snack1" : (`slot.${m}` as TKey))}</Chip>)}</FilterRow>
          <FilterRow label={t("p.diet")}>{DIETS.map((d) => <Chip key={d} active={diet === d} onClick={() => setDiet(diet === d ? null : d)}>{t(`diet.${d}` as TKey)}</Chip>)}</FilterRow>
          <FilterRow label={t("p.cuisines")}>{CUISINES.map((c) => <Chip key={c} active={cuisine === c} onClick={() => setCuisine(cuisine === c ? null : c)}>{t(`cu.${c}` as TKey)}</Chip>)}</FilterRow>
          <FilterRow label="Tags">{TAGS.map((tg) => <Chip key={tg} active={tags.includes(tg)} onClick={() => setTags(tags.includes(tg) ? tags.filter((x) => x !== tg) : [...tags, tg])}>{t(`tag.${tg}` as TKey)}</Chip>)}</FilterRow>
          <FilterRow label={t("p.allergens")}>{ALLERGENS.map((a) => <Chip key={a} active={avoid.includes(a)} onClick={() => setAvoid(avoid.includes(a) ? avoid.filter((x) => x !== a) : [...avoid, a])}>{t(`al.${a}` as TKey)}</Chip>)}</FilterRow>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("p.maxTime")}><Select value={maxTime} onChange={(e) => setMaxTime(Number(e.target.value))}>{[15, 30, 45, 60, 999].map((m) => <option key={m} value={m}>{m === 999 ? t("time.any") : `≤ ${m} min`}</option>)}</Select></Field>
            <Field label={t("rec.cost")}><Select value={maxCost} onChange={(e) => setMaxCost(Number(e.target.value))}>{[15, 25, 40, 60, 999].map((m) => <option key={m} value={m}>{m === 999 ? t("common.all") : `≤ ${m} lei`}</option>)}</Select></Field>
            <Field label={t("p.difficulty")}><Select value={maxDiff} onChange={(e) => setMaxDiff(Number(e.target.value))}>{[1, 2, 3].map((d) => <option key={d} value={d}>{t(`diff.${d}` as TKey)}</option>)}</Select></Field>
            <Field label={t("rec.sort")}><Select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>{(["relevance", "time", "cost", "protein", "kcal"] as Sort[]).map((x) => <option key={x} value={x}>{t(`sort.${x}` as TKey)}</option>)}</Select></Field>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setShowFilters(false)}>{t("common.done")} · {results.length}</Button>
            <Button variant="secondary" onClick={reset}>Reset</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 px-1 text-[13px] font-medium uppercase tracking-wide text-ink-2 dark:text-[#98989d]">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export default function RecipesPage() {
  return <Suspense><RecipesInner /></Suspense>;
}
