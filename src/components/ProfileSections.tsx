"use client";
/**
 * Secțiunile formularului de profil — reutilizate în wizard-ul de onboarding și în pagina „Profil”.
 */
import { useState } from "react";
import type { ActivityLevel, Allergen, Cuisine, Diet, Equipment, Goal, MacroTargets, Profile } from "@/lib/types";
import { useApp } from "@/lib/store";
import { useT, type TKey } from "@/lib/i18n";
import { bmi, bmrMifflin, calcTargets, tdee } from "@/lib/nutrition";
import { INGREDIENTS } from "@/data/ingredients";
import { CITIES, STORES } from "@/data/stores";
import { Chip, Field, Input, Select, Tag, Toggle } from "./ui";

export const ALLERGENS: Allergen[] = ["gluten", "lactose", "eggs", "nuts", "peanuts", "soy", "fish", "shellfish", "sesame", "celery", "mustard", "lupin", "sulfites"];
export const DIETS: Diet[] = ["omnivore", "vegetarian", "vegan", "pescatarian", "keto", "lowcarb", "paleo", "mediterranean", "highprotein", "sugarfree", "orthodox_fast"];
export const CUISINES: Cuisine[] = ["moldovan", "ukrainian", "romanian", "italian", "asian", "mediterranean", "middle_eastern", "international"];
export const EQUIPMENT: Equipment[] = ["stove", "oven", "airfryer", "multicooker", "blender", "microwave", "grill"];
const ACTIVITIES: ActivityLevel[] = ["sedentary", "light", "moderate", "active", "very_active"];
const GOALS: { id: Goal; icon: string }[] = [
  { id: "lose", icon: "⬇️" }, { id: "maintain", icon: "⚖️" }, { id: "gain", icon: "💪" }, { id: "recomp", icon: "🔄" },
  { id: "pregnancy", icon: "🤰" }, { id: "lactation", icon: "🍼" }, { id: "athlete", icon: "🏅" },
];

function toggleIn<T>(arr: T[], v: T) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}
const numVal = (v: string) => (v === "" ? 0 : Number(v));

export function PersonalSection() {
  const { t } = useT();
  const p = useApp((s) => s.profile);
  const setProfile = useApp((s) => s.setProfile);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("p.name")}><Input value={p.name} onChange={(e) => setProfile({ name: e.target.value })} autoComplete="given-name" /></Field>
      <Field label={t("p.sex")}>
        <div className="flex gap-2">
          {(["female", "male"] as const).map((s) => <Chip key={s} active={p.sex === s} onClick={() => setProfile({ sex: s })}>{t(s === "male" ? "p.male" : "p.female")}</Chip>)}
        </div>
      </Field>
      <Field label={t("p.age")}><Input type="number" inputMode="numeric" min={14} max={100} value={p.age || ""} onChange={(e) => setProfile({ age: numVal(e.target.value) })} /></Field>
      <Field label={t("p.height")}><Input type="number" inputMode="numeric" min={120} max={230} value={p.heightCm || ""} onChange={(e) => setProfile({ heightCm: numVal(e.target.value) })} /></Field>
      <Field label={t("p.weight")}><Input type="number" inputMode="decimal" step="0.1" min={35} max={250} value={p.weightKg || ""} onChange={(e) => setProfile({ weightKg: numVal(e.target.value) })} /></Field>
      <Field label={t("p.targetWeight")} hint={t("common.optional")}><Input type="number" inputMode="decimal" step="0.1" value={p.targetWeightKg ?? ""} onChange={(e) => setProfile({ targetWeightKg: e.target.value ? Number(e.target.value) : undefined })} /></Field>
      <div className="sm:col-span-2">
        <Field label={t("p.activity")}>
          <div className="grid gap-2">
            {ACTIVITIES.map((a) => (
              <button key={a} type="button" onClick={() => setProfile({ activity: a })} aria-pressed={p.activity === a}
                className={`min-h-[48px] rounded-xl border px-4 text-left text-sm font-medium ${p.activity === a ? "border-brand-600 bg-brand-500/100/10" : "border-black/10 dark:border-white/10"}`}>
                {t(`act.${a}` as TKey)}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </div>
  );
}

export function GoalSection() {
  const { t } = useT();
  const p = useApp((s) => s.profile);
  const setProfile = useApp((s) => s.setProfile);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {GOALS.map((g) => (
        <button key={g.id} type="button" onClick={() => setProfile({ goal: g.id })} aria-pressed={p.goal === g.id}
          className={`flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 text-center font-semibold transition ${p.goal === g.id ? "border-brand-600 bg-brand-500/100/10" : "border-black/[0.06] hover:border-brand-400 dark:border-white/10"}`}>
          <span className="text-3xl" aria-hidden>{g.icon}</span>
          <span className="text-sm">{t(`goal.${g.id}` as TKey)}</span>
        </button>
      ))}
    </div>
  );
}

export function TargetsSection() {
  const { t } = useT();
  const p = useApp((s) => s.profile);
  const setProfile = useApp((s) => s.setProfile);
  const auto = calcTargets({ ...p, manualTargets: undefined });
  const cur = calcTargets(p);
  const [manual, setManual] = useState(!!p.manualTargets && Object.keys(p.manualTargets).length > 0);
  const fields: { k: keyof MacroTargets; label: TKey; unit: string }[] = [
    { k: "kcal", label: "macro.kcal", unit: "kcal" }, { k: "protein", label: "macro.protein", unit: "g" },
    { k: "carbs", label: "macro.carbs", unit: "g" }, { k: "fat", label: "macro.fat", unit: "g" },
    { k: "fiber", label: "macro.fiber", unit: "g" }, { k: "waterMl", label: "macro.water", unit: "ml" },
  ];
  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/10"><div className="text-xs text-ink-2">{t("prof.bmi")}</div><div className="text-lg font-bold">{bmi(p).toFixed(1)}</div></div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/10"><div className="text-xs text-ink-2">{t("prof.bmr")}</div><div className="text-lg font-bold">{Math.round(bmrMifflin(p))}</div></div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/10"><div className="text-xs text-ink-2">{t("prof.tdee")}</div><div className="text-lg font-bold">{Math.round(tdee(p))}</div></div>
      </div>
      <p className="mb-3 text-sm text-ink-2 dark:text-[#98989d]">{t("ob.autoCalc")}</p>
      <Toggle checked={manual} label={t("prof.manual")} onChange={(v) => { setManual(v); if (!v) setProfile({ manualTargets: undefined }); }} />
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {fields.map((f) => (
          <Field key={f.k} label={`${t(f.label)} (${f.unit})`} hint={manual && p.manualTargets?.[f.k] !== undefined ? `auto: ${auto[f.k]}` : undefined}>
            <Input type="number" inputMode="numeric" disabled={!manual} value={cur[f.k]}
              onChange={(e) => setProfile({ manualTargets: { ...p.manualTargets, [f.k]: Number(e.target.value) } })} />
          </Field>
        ))}
      </div>
      {(p.goal === "pregnancy" || p.goal === "lactation") && (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">⚠️ {t("disclaimer")}</p>
      )}
    </div>
  );
}

export function MealsBudgetSection() {
  const { t } = useT();
  const p = useApp((s) => s.profile);
  const setProfile = useApp((s) => s.setProfile);
  return (
    <div className="space-y-5">
      <Field label={t("p.mealsPerDay")}>
        <div className="flex flex-wrap gap-2">{[2, 3, 4, 5, 6].map((n) => <Chip key={n} active={p.mealsPerDay === n} onClick={() => setProfile({ mealsPerDay: n })}>{n}</Chip>)}</div>
      </Field>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Field label={`${t("p.budget")} (MDL)`}><Input type="number" inputMode="numeric" min={0} value={p.budget.amount || ""} onChange={(e) => setProfile({ budget: { ...p.budget, amount: numVal(e.target.value) } })} /></Field>
        <Field label="&nbsp;">
          <Select value={p.budget.period} onChange={(e) => setProfile({ budget: { ...p.budget, period: e.target.value as Profile["budget"]["period"] } })}>
            {(["day", "week", "month"] as const).map((x) => <option key={x} value={x}>{t(`period.${x}`)}</option>)}
          </Select>
        </Field>
      </div>
      <Field label={t("p.household")}>
        <div className="flex flex-wrap gap-2">{[1, 2, 3, 4, 5, 6].map((n) => <Chip key={n} active={p.householdSize === n} onClick={() => setProfile({ householdSize: n })}>{n}</Chip>)}</div>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("p.city")}>
          <Select value={p.city} onChange={(e) => setProfile({ city: e.target.value })}>{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}</Select>
        </Field>
      </div>
      <Field label={t("p.stores")}>
        <div className="flex flex-wrap gap-2">
          {STORES.map((s) => <Chip key={s.id} active={p.preferredStores.includes(s.id)} onClick={() => setProfile({ preferredStores: toggleIn(p.preferredStores, s.id) })}>{s.name}</Chip>)}
        </div>
      </Field>
    </div>
  );
}

export function DietSection() {
  const { t, l } = useT();
  const p = useApp((s) => s.profile);
  const setProfile = useApp((s) => s.setProfile);
  const [custom, setCustom] = useState("");
  const [q, setQ] = useState("");
  const matches = q.length >= 2 ? INGREDIENTS.filter((i) => `${i.name.ro} ${i.name.ru}`.toLowerCase().includes(q.toLowerCase()) && !p.excludedIngredients.includes(i.id)).slice(0, 8) : [];
  return (
    <div className="space-y-6">
      <Field label={t("p.diet")}>
        <div className="flex flex-wrap gap-2">{DIETS.map((d) => <Chip key={d} active={p.diet === d} onClick={() => setProfile({ diet: d })}>{d === "orthodox_fast" ? "☦️ " : ""}{t(`diet.${d}` as TKey)}</Chip>)}</div>
      </Field>
      <Field label={t("p.allergens")}>
        <div className="flex flex-wrap gap-2">{ALLERGENS.map((a) => <Chip key={a} active={p.allergens.includes(a)} onClick={() => setProfile({ allergens: toggleIn(p.allergens, a) })}>{t(`al.${a}` as TKey)}</Chip>)}</div>
      </Field>
      <Field label={t("p.customAllergens")}>
        <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="ex.: căpșuni / клубника"
          onKeyDown={(e) => { if (e.key === "Enter" && custom.trim()) { e.preventDefault(); setProfile({ customAllergens: [...p.customAllergens, custom.trim()] }); setCustom(""); } }} />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {p.customAllergens.map((c) => <button key={c} type="button" onClick={() => setProfile({ customAllergens: p.customAllergens.filter((x) => x !== c) })}><Tag tone="red">{c} ✕</Tag></button>)}
        </div>
      </Field>
      <Field label={t("p.excluded")}>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.search")} />
        {matches.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {matches.map((i) => <Chip key={i.id} onClick={() => { setProfile({ excludedIngredients: [...p.excludedIngredients, i.id] }); setQ(""); }}>{i.emoji} {l(i.name)} +</Chip>)}
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {p.excludedIngredients.map((id) => {
            const i = INGREDIENTS.find((x) => x.id === id);
            return i && <button key={id} type="button" onClick={() => setProfile({ excludedIngredients: p.excludedIngredients.filter((x) => x !== id) })}><Tag tone="slate">{i.emoji} {l(i.name)} ✕</Tag></button>;
          })}
        </div>
      </Field>
    </div>
  );
}

export function KitchenSection() {
  const { t } = useT();
  const p = useApp((s) => s.profile);
  const setProfile = useApp((s) => s.setProfile);
  return (
    <div className="space-y-6">
      <Field label={t("p.cuisines")}>
        <div className="flex flex-wrap gap-2">{CUISINES.map((c) => <Chip key={c} active={p.cuisines.includes(c)} onClick={() => setProfile({ cuisines: toggleIn(p.cuisines, c) })}>{t(`cu.${c}` as TKey)}</Chip>)}</div>
      </Field>
      <Field label={t("p.maxTime")}>
        <div className="flex flex-wrap gap-2">
          {([15, 30, 60, 999] as const).map((m) => <Chip key={m} active={p.maxCookMin === m} onClick={() => setProfile({ maxCookMin: m })}>{m === 999 ? t("time.any") : m === 60 ? "60+ min" : `${m} min`}</Chip>)}
        </div>
      </Field>
      <Field label={t("p.difficulty")}>
        <div className="flex flex-wrap gap-2">{([1, 2, 3] as const).map((d) => <Chip key={d} active={p.maxDifficulty === d} onClick={() => setProfile({ maxDifficulty: d })}>{"★".repeat(d)} {t(`diff.${d}`)}</Chip>)}</div>
      </Field>
      <Field label={t("p.equipment")}>
        <div className="flex flex-wrap gap-2">{EQUIPMENT.map((e) => <Chip key={e} active={p.equipment.includes(e)} onClick={() => setProfile({ equipment: toggleIn(p.equipment, e) })}>{t(`eq.${e}` as TKey)}</Chip>)}</div>
      </Field>
    </div>
  );
}
