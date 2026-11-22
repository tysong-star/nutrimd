"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useCatalog } from "@/lib/catalog";
import { useApp } from "@/lib/store";
import { useT, type TKey } from "@/lib/i18n";
import { dateShort, mdl } from "@/lib/format";
import { calcTargets, slotsFor, slotToMealType } from "@/lib/nutrition";
import { isoDate } from "@/lib/planner";
import { compareStores, formatAmount, type ShoppingItem } from "@/lib/shopping";
import { ratingOf, useAllReviews } from "@/lib/reviews";
import { uid } from "@/lib/random";
import { cookHref } from "@/lib/paths";
import { ProductPhoto, RecipeImage } from "@/components/RecipeCard";
import { StepTimer } from "@/components/Timer";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Button, EmptyState, IconButton, ListGroup, ListRow, Segmented, cx } from "@/components/ui";
import { IconBack, IconCheck, IconHeart } from "@/components/icons";

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <span className="inline-flex text-[20px] text-amber-500" role={onChange ? "radiogroup" : "img"} aria-label={`${value.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => onChange
        ? <button key={i} type="button" role="radio" aria-checked={value === i} onClick={() => onChange(i)} className="min-h-[40px] min-w-[34px]">{i <= value ? "★" : "☆"}</button>
        : <span key={i} className={i <= Math.round(value) ? "" : "text-black/15 dark:text-white/20"}>★</span>)}
    </span>
  );
}

function RecipeDetail() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const { t, l, lang } = useT();
  const catalog = useCatalog();
  const profile = useApp((s) => s.profile);
  const fav = useApp((s) => s.favorites.includes(id));
  const toggleFav = useApp((s) => s.toggleFavorite);
  const plan = useApp((s) => s.plan);
  const extras = useApp((s) => s.shoppingExtras);
  const set = useApp((s) => s.set);
  const reviews = useAllReviews();
  const [servings, setServings] = useState<number | null>(null);
  const [tab, setTab] = useState<"ingredients" | "steps" | "nutrition">("ingredients");
  const [atHome, setAtHome] = useState<string[]>([]);
  const [activeStep, setActiveStep] = useState<number | undefined>();
  const [showReviews, setShowReviews] = useState(false);
  const [rv, setRv] = useState({ rating: 5, text: "" });
  const [sent, setSent] = useState(false);
  const [addedPlan, setAddedPlan] = useState(false);

  const recipe = catalog.recipeMap[id];
  const n = servings ?? Math.max(1, profile.householdSize);
  const k = recipe ? n / recipe.servings : 1;

  // Ce trebuie cumpărat pentru rețetă (fără condimentele de bază și fără ce ai acasă).
  const buyItems: ShoppingItem[] = useMemo(() => !recipe ? [] : recipe.ingredients
    .map((ri) => ({ ri, ing: catalog.ingMap[ri.id] }))
    .filter(({ ing }) => ing && !ing.pantry)
    .map(({ ri, ing }) => ({ ingredientId: ing.id, amount: ri.amount * k, aisle: ing.aisle, pantry: false, recipes: [recipe.id] })), [recipe, catalog, k]);
  const needed = buyItems.filter((i) => !atHome.includes(i.ingredientId));
  const basket = useMemo(() => compareStores(needed, catalog, profile.city).cheapest, [needed, catalog, profile.city]);
  const alreadyAdded = extras.some((e) => e.recipeId === id);

  if (!recipe) return <EmptyState emoji="🤷" title={t("rec.notFound")} action={<Link href="/recipes"><Button>{t("nav.recipes")}</Button></Link>} />;
  const info = catalog.info[id];
  const targets = calcTargets(profile);
  const { avg, count, list } = ratingOf(reviews, id);
  const myPending = reviews.filter((r) => r.recipeId === id && r.status === "pending" && r.id.startsWith("u-"));
  const subs = catalog.substitutions[id] ?? [];
  const store = basket?.storeIds.length === 1 ? catalog.storeMap[basket.storeIds[0]] : null;

  const addToPlan = () => {
    const today = isoDate(new Date());
    const slot = slotsFor(profile.mealsPerDay).find((s) => slotToMealType(s.slot) === recipe.mealTypes[0])?.slot ?? "lunch";
    const meal = { uid: uid(), slot, recipeId: id, portions: 1 };
    const days = plan?.days ?? [];
    const next = days.some((d) => d.date === today) ? days.map((d) => (d.date === today ? { ...d, meals: [...d.meals, meal] } : d)) : [...days, { date: today, meals: [meal] }].sort((a, b) => a.date.localeCompare(b.date));
    set({ plan: { createdAt: plan?.createdAt ?? new Date().toISOString(), mealPrep: plan?.mealPrep ?? false, days: next } });
    setAddedPlan(true);
  };

  const addToList = () => {
    set({ shoppingExtras: [...extras.filter((e) => e.recipeId !== id), { uid: uid(), recipeId: id, servings: n, items: needed.map((i) => ({ id: i.ingredientId, amount: +i.amount.toFixed(1) })) }] });
  };

  const submitReview = () => {
    if (!rv.text.trim()) return;
    set({ userReviews: [{ id: `u-${uid()}`, recipeId: id, author: profile.name || "Anonim", rating: rv.rating, text: rv.text.trim(), date: new Date().toISOString(), status: "pending" }, ...useApp.getState().userReviews] });
    setRv({ rating: 5, text: "" });
    setSent(true);
  };

  const nut: { key: TKey; v: number; unit: string; target?: number }[] = [
    { key: "macro.kcal", v: info.nutrition.kcal, unit: "kcal", target: targets.kcal },
    { key: "macro.protein", v: info.nutrition.protein, unit: "g", target: targets.protein },
    { key: "macro.carbs", v: info.nutrition.carbs, unit: "g", target: targets.carbs },
    { key: "macro.fat", v: info.nutrition.fat, unit: "g", target: targets.fat },
    { key: "macro.fiber", v: info.nutrition.fiber, unit: "g", target: targets.fiber },
    { key: "macro.sugar", v: info.nutrition.sugar, unit: "g" },
    { key: "macro.salt", v: info.nutrition.salt, unit: "g" },
  ];

  return (
    <article className="mx-auto max-w-2xl pb-8">
      <div className="relative -mx-4 -mt-3 aspect-[4/3] overflow-hidden md:mx-0 md:mt-0 md:rounded-3xl">
        <RecipeImage recipe={recipe} big />
        <div className="absolute inset-x-0 top-0 flex justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <IconButton label={t("common.back")} onClick={() => (history.length > 1 ? router.back() : router.push("/recipes"))} className="bg-white/80 backdrop-blur dark:bg-black/50"><IconBack width={20} height={20} /></IconButton>
          <IconButton label={t("rec.favorites")} onClick={() => toggleFav(id)} className={cx("bg-white/80 backdrop-blur dark:bg-black/50", fav && "text-red-500")}><IconHeart filled={fav} width={20} height={20} /></IconButton>
        </div>
      </div>

      <h1 className="mt-5 text-[28px] font-bold leading-tight tracking-tight">{l(recipe.title)}</h1>
      <p className="mt-1 text-[15px] text-ink-2 dark:text-[#98989d]">
        {info.totalMin} {t("common.min")} · {info.nutrition.kcal} kcal · {mdl(info.costPerServing, lang)}{t("rec.perServingShort")}
        {count > 0 && <> · <button onClick={() => setShowReviews(true)} className="text-amber-600">★ {avg.toFixed(1)}</button></>}
      </p>
      {info.allergens.length > 0 && <p className="mt-1 text-[15px] text-red-600 dark:text-red-400">{t("rec.allergens")}: {info.allergens.map((a) => t(`al.${a}` as TKey).toLowerCase()).join(", ")}</p>}
      {subs.length > 0 && <p className="mt-1 text-[15px] text-sky-700 dark:text-sky-400">{t("rec.substituted")}: {subs.map(([a, b]) => `${l(catalog.ingMap[a].name)} → ${l(catalog.ingMap[b].name)}`).join("; ")}</p>}

      <div className="mt-5 flex gap-2">
        <Link href={cookHref(id)} className="flex-1"><Button size="lg" className="w-full">{t("rec.cookNow")}</Button></Link>
        <Button size="lg" variant="secondary" onClick={addToPlan} disabled={addedPlan}>{addedPlan ? <IconCheck width={20} height={20} /> : t("rec.addToPlan")}</Button>
      </div>

      <Segmented className="mt-6" value={tab} onChange={setTab} options={[
        { value: "ingredients", label: t("rec.ingredients") },
        { value: "steps", label: t("rec.tabSteps") },
        { value: "nutrition", label: t("rec.tabNutrition") },
      ]} />

      {tab === "ingredients" && (
        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="text-[17px] font-semibold">{n} {t("common.servings")}</span>
            <div className="flex items-center gap-2" role="group" aria-label={t("common.servings")}>
              <IconButton label="-" onClick={() => setServings(Math.max(1, n - 1))}>−</IconButton>
              <IconButton label="+" onClick={() => setServings(Math.min(20, n + 1))}>+</IconButton>
            </div>
          </div>
          <ListGroup>
            {recipe.ingredients.map((ri) => {
              const ing = catalog.ingMap[ri.id];
              return ing && <ListRow key={ri.id} left={<ProductPhoto id={ing.id} size={40} />} title={l(ing.name)} right={<span className="tabular-nums text-ink dark:text-white">{formatAmount(ri.amount * k, ing.unit, lang)}</span>} />;
            })}
          </ListGroup>

          {/* De cumpărat: produse reale din magazin, cu preț */}
          <ListGroup title={t("rec.toBuy")} footer={t("rec.haveAtHome")}>
            {buyItems.map((it) => {
              const ing = catalog.ingMap[it.ingredientId];
              const home = atHome.includes(it.ingredientId);
              const pick = basket?.picks[it.ingredientId];
              const p = pick?.product;
              return (
                <ListRow key={it.ingredientId} onClick={() => setAtHome(home ? atHome.filter((x) => x !== it.ingredientId) : [...atHome, it.ingredientId])}
                  className={cx(home && "opacity-40")}
                  left={<ProductPhoto id={ing.id} size={44} />}
                  title={<span className={cx(home && "line-through")}>{p ? p.name : l(ing.name)}</span>}
                  subtitle={home ? t("rec.atHome") : p ? `${catalog.storeMap[p.storeId]?.name} · ${p.byWeight ? formatAmount(pick!.packs * p.packSize, ing.unit, lang) : `${p.packLabel}${pick!.packs > 1 ? ` × ${pick!.packs}` : ""}`}` : t("shop.outOfStock")}
                  right={!home && pick ? <span className="tabular-nums text-ink dark:text-white">{mdl(pick.cost, lang)}</span> : undefined} />
              );
            })}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[15px] text-ink-2 dark:text-[#98989d]">{store ? store.name : t("shop.total")}</span>
              <span className="text-[17px] font-semibold tabular-nums">{mdl(basket?.total ?? 0, lang)}</span>
            </div>
          </ListGroup>
          <Button size="lg" className="w-full" variant={alreadyAdded ? "secondary" : "primary"} onClick={addToList} disabled={!needed.length}>
            {alreadyAdded ? <><IconCheck width={20} height={20} /> {t("rec.addedToList")}</> : t("rec.addToList")}
          </Button>
          {alreadyAdded && <Link href="/shopping" className="mt-3 block text-center text-[15px] text-brand-700 dark:text-brand-400">{t("shop.title")} →</Link>}
        </div>
      )}

      {tab === "steps" && (
        <div className="mt-5">
          {recipe.video && <div className="mb-5"><VideoPlayer video={recipe.video} steps={recipe.steps} activeStep={activeStep} onChapter={setActiveStep} /></div>}
          <ol className="space-y-6">
            {recipe.steps.map((s, i) => (
              <li key={i} className={cx("flex gap-4", activeStep === i && "rounded-2xl bg-brand-500/10 p-3")}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-white dark:bg-white dark:text-black">{i + 1}</span>
                <div className="min-w-0 flex-1 pt-0.5">
                  {s.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.image} alt="" loading="lazy" className="mb-3 aspect-video w-full rounded-xl object-cover" />
                  )}
                  <p className="text-[17px] leading-relaxed">{l(s.text)}</p>
                  {s.timerMin ? <div className="mt-2"><StepTimer minutes={s.timerMin} /></div> : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {tab === "nutrition" && (
        <ListGroup className="mt-5" footer={`${t("common.perServing")} · % ${lang === "ro" ? "din ținta ta zilnică" : "от суточной нормы"}`}>
          {nut.map((r) => (
            <ListRow key={r.key} title={t(r.key)} right={<span className="tabular-nums"><span className="text-ink dark:text-white">{r.v} {r.unit}</span>{r.target ? <span className="ml-3 inline-block w-10 text-right">{Math.round((r.v / r.target) * 100)}%</span> : <span className="ml-3 inline-block w-10" />}</span>} />
          ))}
        </ListGroup>
      )}

      {/* Recenzii — ascunse implicit */}
      <div className="mt-8">
        {!showReviews ? (
          <Button variant="ghost" className="w-full" onClick={() => setShowReviews(true)}>{t("rec.showReviews")} ({count})</Button>
        ) : (
          <section>
            <h2 className="mb-3 px-1 text-[22px] font-bold">{t("rec.reviews")}</h2>
            <div className="mb-4 rounded-2xl bg-white p-4 shadow-card dark:bg-[#1c1c1e]">
              {sent ? <p className="text-brand-700 dark:text-brand-400" role="status">{t("rec.reviewSent")}</p> : (
                <form onSubmit={(e) => { e.preventDefault(); submitReview(); }} className="space-y-2">
                  <Stars value={rv.rating} onChange={(v) => setRv({ ...rv, rating: v })} />
                  <textarea value={rv.text} onChange={(e) => setRv({ ...rv, text: e.target.value })} rows={3} maxLength={600} placeholder={t("rec.writeReview")} className="w-full rounded-xl bg-black/[0.05] p-3 text-[17px] focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:bg-white/10" aria-label={t("rec.writeReview")} />
                  <Button type="submit" size="sm" disabled={!rv.text.trim()}>{t("common.save")}</Button>
                </form>
              )}
            </div>
            <ul className="space-y-4 px-1">
              {[...myPending, ...list].map((r) => (
                <li key={r.id}>
                  <div className="flex items-center gap-2 text-[15px]"><b className="font-semibold">{r.author}</b><span className="text-[13px] text-amber-500">{"★".repeat(r.rating)}</span><span className="text-[13px] text-ink-3">{dateShort(r.date, lang)}</span></div>
                  <p className="text-[15px] text-ink-2 dark:text-[#98989d]">{r.text}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}

export default function RecipePage() {
  return <Suspense><RecipeDetail /></Suspense>;
}
