"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { cookHref } from "@/lib/paths";
import { useState } from "react";
import { useCatalog } from "@/lib/catalog";
import { useApp } from "@/lib/store";
import { useT, type TKey } from "@/lib/i18n";
import { mdl, dateShort } from "@/lib/format";
import { findSubstitute, ingredientConflict, subAmount } from "@/lib/recipeInfo";
import { calcTargets, slotsFor, slotToMealType } from "@/lib/nutrition";
import { isoDate } from "@/lib/planner";
import { formatAmount } from "@/lib/shopping";
import { ratingOf, useAllReviews } from "@/lib/reviews";
import { uid } from "@/lib/random";
import { RecipeImage } from "@/components/RecipeCard";
import { StepTimer } from "@/components/Timer";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Button, Card, EmptyState, Tag, cx } from "@/components/ui";

function Stars({ value, onChange, size = "text-lg" }: { value: number; onChange?: (v: number) => void; size?: string }) {
  return (
    <span className={cx("inline-flex", size)} role={onChange ? "radiogroup" : "img"} aria-label={`${value.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => onChange ? (
        <button key={i} type="button" role="radio" aria-checked={value === i} onClick={() => onChange(i)} className="min-h-[40px] min-w-[36px]">{i <= value ? "★" : "☆"}</button>
      ) : <span key={i} className={i <= Math.round(value) ? "text-amber-500" : "text-slate-300"}>★</span>)}
    </span>
  );
}

function RecipeDetail() {
  const id = useSearchParams().get("id") ?? "";
  const { t, l, lang } = useT();
  const catalog = useCatalog();
  const profile = useApp((s) => s.profile);
  const fav = useApp((s) => s.favorites.includes(id));
  const toggleFav = useApp((s) => s.toggleFavorite);
  const plan = useApp((s) => s.plan);
  const set = useApp((s) => s.set);
  const reviews = useAllReviews();
  const [servings, setServings] = useState<number | null>(null);
  const [missingIds, setMissingIds] = useState<string[]>([]);
  const [activeStep, setActiveStep] = useState<number | undefined>();
  const [rv, setRv] = useState({ rating: 5, text: "" });
  const [sent, setSent] = useState(false);
  const [added, setAdded] = useState(false);

  const recipe = catalog.recipeMap[id];
  if (!recipe) return <EmptyState emoji="🤷" title={t("rec.notFound")} action={<Link href="/recipes"><Button>{t("nav.recipes")}</Button></Link>} />;
  const info = catalog.info[id];
  const n = servings ?? Math.max(1, profile.householdSize);
  const k = n / recipe.servings;
  const targets = calcTargets(profile);
  const { avg, count, list } = ratingOf(reviews, id);
  const myPending = reviews.filter((r) => r.recipeId === id && r.status === "pending" && r.id.startsWith("u-"));
  const subs = catalog.substitutions[id] ?? [];

  const addToPlan = () => {
    const today = isoDate(new Date());
    const type = recipe.mealTypes[0];
    const slot = slotsFor(profile.mealsPerDay).find((s) => slotToMealType(s.slot) === type)?.slot ?? "lunch";
    const meal = { uid: uid(), slot, recipeId: id, portions: 1 };
    const days = plan?.days ?? [];
    const has = days.some((d) => d.date === today);
    const next = has ? days.map((d) => (d.date === today ? { ...d, meals: [...d.meals, meal] } : d)) : [...days, { date: today, meals: [meal] }].sort((a, b) => a.date.localeCompare(b.date));
    set({ plan: { createdAt: plan?.createdAt ?? new Date().toISOString(), mealPrep: plan?.mealPrep ?? false, days: next } });
    setAdded(true);
  };

  const submitReview = () => {
    if (!rv.text.trim()) return;
    set({ userReviews: [{ id: `u-${uid()}`, recipeId: id, author: profile.name || "Anonim", rating: rv.rating, text: rv.text.trim(), date: new Date().toISOString(), status: "pending" }, ...useApp.getState().userReviews] });
    setRv({ rating: 5, text: "" });
    setSent(true);
  };

  const nutRows: { key: TKey; v: number; unit: string; target?: number }[] = [
    { key: "macro.kcal", v: info.nutrition.kcal, unit: "kcal", target: targets.kcal },
    { key: "macro.protein", v: info.nutrition.protein, unit: "g", target: targets.protein },
    { key: "macro.carbs", v: info.nutrition.carbs, unit: "g", target: targets.carbs },
    { key: "macro.fat", v: info.nutrition.fat, unit: "g", target: targets.fat },
    { key: "macro.fiber", v: info.nutrition.fiber, unit: "g", target: targets.fiber },
    { key: "macro.sugar", v: info.nutrition.sugar, unit: "g", target: 50 },
    { key: "macro.salt", v: info.nutrition.salt, unit: "g", target: 5 },
  ];

  return (
    <article className="pb-6">
      <div className="relative -mx-4 h-64 overflow-hidden md:mx-0 md:h-80 md:rounded-3xl">
        <RecipeImage recipe={recipe} big />
        <div className="absolute inset-x-0 top-0 flex justify-between p-3">
          <Link href="/recipes" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow dark:bg-slate-900/90" aria-label={t("common.back")}>←</Link>
          <button onClick={() => toggleFav(id)} aria-pressed={fav} aria-label={t("rec.favorites")} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-xl shadow dark:bg-slate-900/90">{fav ? "❤️" : "🤍"}</button>
        </div>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold tracking-tight">{l(recipe.title)}</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">{l(recipe.description)}</p>
          <div className="mt-2 flex items-center gap-2 text-sm"><Stars value={avg} /> <span className="text-slate-500">{t("rec.rating", { r: avg.toFixed(1), n: count })}</span></div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              [t("rec.prep"), `${recipe.prepMin} ${t("common.min")}`],
              [t("rec.cook"), `${recipe.cookMin} ${t("common.min")}`],
              [t("rec.difficulty"), `${"★".repeat(recipe.difficulty)} ${t(`diff.${recipe.difficulty}` as TKey)}`],
              [t("rec.cost"), mdl(info.costPerServing, lang)],
            ].map(([a, b]) => (
              <div key={a} className="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900"><div className="text-xs text-slate-500">{a}</div><div className="font-bold">{b}</div></div>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">💡 {t("rec.costHint")}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {info.tags.map((tg) => <Tag key={tg} tone={tg === "fast" ? "warm" : "green"}>{t(`tag.${tg}` as TKey)}</Tag>)}
            {recipe.equipment.map((e) => <Tag key={e} tone="slate">{t(`eq.${e}` as TKey)}</Tag>)}
          </div>

          {/* Alergeni — foarte vizibili */}
          <div className={cx("mt-4 rounded-2xl border-2 p-3", info.allergens.length ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40" : "border-brand-200 bg-brand-50 dark:border-brand-900 dark:bg-brand-950/40")}>
            <div className="text-sm font-bold">{info.allergens.length ? `⚠️ ${t("rec.allergens")}:` : `✅ ${t("rec.noAllergens")}`}</div>
            {info.allergens.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1.5">{info.allergens.map((a) => <Tag key={a} tone="red">{t(`al.${a}` as TKey)}</Tag>)}</div>}
          </div>
          {subs.length > 0 && (
            <div className="mt-3 rounded-2xl bg-sky-50 p-3 text-sm dark:bg-sky-950/40">
              <b>🔄 {t("rec.substituted")}:</b> {subs.map(([a, b]) => `${l(catalog.ingMap[a].name)} → ${l(catalog.ingMap[b].name)}`).join("; ")}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={cookHref(id)}><Button size="lg">👩‍🍳 {t("rec.cookMode")}</Button></Link>
            <Button size="lg" variant="secondary" onClick={addToPlan} disabled={added}>{added ? `✓ ${t("rec.addedToPlan")}` : `📅 ${t("rec.addToPlan")}`}</Button>
          </div>

          {recipe.video && (
            <section className="mt-8">
              <h2 className="mb-3 text-xl font-bold">🎬 {t("rec.video")}</h2>
              <VideoPlayer video={recipe.video} steps={recipe.steps} activeStep={activeStep} onChapter={setActiveStep} />
            </section>
          )}

          <section className="mt-8">
            <h2 className="mb-3 text-xl font-bold">{t("rec.steps")}</h2>
            <ol className="space-y-4">
              {recipe.steps.map((s, i) => (
                <li key={i} id={`step-${i}`} className={cx("flex gap-4 rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-900", activeStep === i && "ring-2 ring-brand-500")}>
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-36">
                    {s.image
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={s.image} alt={`${t("rec.stepOf", { n: i + 1, total: recipe.steps.length })}`} loading="lazy" className="h-full w-full object-cover" />
                      : <RecipeImage recipe={{ ...recipe, image: undefined }} alt={`${t("rec.stepOf", { n: i + 1, total: recipe.steps.length })}`} className="[&>span:first-child]:text-4xl" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</div>
                    <p className="leading-relaxed">{l(s.text)}</p>
                    {s.timerMin ? <div className="mt-2"><StepTimer minutes={s.timerMin} /></div> : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-8">
            <h2 className="mb-3 text-xl font-bold">{t("rec.reviews")} ({count})</h2>
            <Card className="mb-4">
              {sent ? <p className="text-brand-700 dark:text-brand-300" role="status">{t("rec.reviewSent")}</p> : (
                <form onSubmit={(e) => { e.preventDefault(); submitReview(); }} className="space-y-2">
                  <div className="font-semibold">{t("rec.writeReview")}</div>
                  <Stars value={rv.rating} onChange={(v) => setRv({ ...rv, rating: v })} size="text-2xl text-amber-500" />
                  <textarea value={rv.text} onChange={(e) => setRv({ ...rv, text: e.target.value })} rows={3} maxLength={600} className="w-full rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950" aria-label={t("rec.writeReview")} />
                  <Button type="submit" disabled={!rv.text.trim()}>{t("common.save")}</Button>
                </form>
              )}
            </Card>
            <ul className="space-y-3">
              {[...myPending, ...list].map((r) => (
                <li key={r.id} className="rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-sm"><b>{r.author}</b><Stars value={r.rating} size="text-sm" /><span className="text-slate-500">{dateShort(r.date, lang)}</span>{r.status === "pending" && <Tag tone="warm">{t("adm.pending")}</Tag>}</div>
                  <p className="mt-1 text-sm">{r.text}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">{t("rec.ingredients")}</h2>
              <div className="flex items-center gap-1" role="group" aria-label={t("common.servings")}>
                <button onClick={() => setServings(Math.max(1, n - 1))} className="h-10 w-10 rounded-full bg-slate-100 text-lg font-bold dark:bg-slate-800" aria-label="-">−</button>
                <span className="min-w-[72px] text-center text-sm font-semibold tabular-nums" aria-live="polite">{n} {t("common.servings")}</span>
                <button onClick={() => setServings(Math.min(20, n + 1))} className="h-10 w-10 rounded-full bg-slate-100 text-lg font-bold dark:bg-slate-800" aria-label="+">+</button>
              </div>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recipe.ingredients.map((ri) => {
                const ing = catalog.ingMap[ri.id];
                if (!ing) return null;
                const conflict = ingredientConflict(ing, profile);
                const markedMissing = missingIds.includes(ing.id);
                const sub = conflict || markedMissing ? findSubstitute(ing, catalog.ingMap, profile, new Set(missingIds)) : null;
                return (
                  <li key={ri.id} className="py-2">
                    <div className="flex items-center gap-2">
                      <span aria-hidden className="text-xl">{ing.emoji}</span>
                      <span className={cx("flex-1", markedMissing && "line-through opacity-60")}>{l(ing.name)}{ri.note ? ` (${l(ri.note)})` : ""}</span>
                      <span className="text-sm font-semibold tabular-nums">{formatAmount(ri.amount * k, ing.unit, lang)}</span>
                      <button onClick={() => setMissingIds(markedMissing ? missingIds.filter((x) => x !== ing.id) : [...missingIds, ing.id])}
                        className="rounded-lg px-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Nu am / Нет дома" aria-label={`${l(ing.name)}: nu am`}>{markedMissing ? "↺" : "✗"}</button>
                    </div>
                    {conflict && <div className="ml-8 text-xs font-semibold text-red-700 dark:text-red-300">⚠️ {ing.allergens.map((a) => t(`al.${a}` as TKey)).join(", ") || conflict}</div>}
                    {(conflict || markedMissing) && (
                      <div className="ml-8 text-xs text-sky-800 dark:text-sky-300">
                        {sub ? `🔄 ${t("rec.substitute", { x: `${sub.emoji} ${l(sub.name)} — ${formatAmount(subAmount(ing, sub, ri.amount * k), sub.unit, lang)}` })}` : "—"}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <h2 className="mb-1 text-lg font-bold">{t("rec.nutrition")}</h2>
            <p className="mb-2 text-xs text-slate-500">{t("common.perServing")} · % {lang === "ro" ? "din ținta ta zilnică" : "от вашей суточной нормы"}</p>
            <table className="w-full text-sm">
              <tbody>
                {nutRows.map((r) => (
                  <tr key={r.key} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                    <th scope="row" className="py-1.5 text-left font-medium">{t(r.key)}</th>
                    <td className="py-1.5 text-right font-semibold tabular-nums">{r.v} {r.unit}</td>
                    <td className="w-16 py-1.5 text-right text-xs text-slate-500 tabular-nums">{r.target ? `${Math.round((r.v / r.target) * 100)}%` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </aside>
      </div>
    </article>
  );
}

export default function RecipePage() {
  return <Suspense><RecipeDetail /></Suspense>;
}
