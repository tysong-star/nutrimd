"use client";
import { recipeHref, cookHref } from "@/lib/paths";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useCatalog } from "@/lib/catalog";
import { useApp } from "@/lib/store";
import { useT, type TKey } from "@/lib/i18n";
import { calcTargets, dailyBudget } from "@/lib/nutrition";
import { addDays, isoDate, planCost } from "@/lib/planner";
import { fastInfo } from "@/lib/fasting";
import { recipeAllowed, addN, ZERO } from "@/lib/recipeInfo";
import { dateLong, mdl } from "@/lib/format";
import { RecipeCard, RecipeImage } from "@/components/RecipeCard";
import { Bar, Ring } from "@/components/viz";
import { Button, Card, SectionTitle } from "@/components/ui";

const SLOT_HOURS: Record<string, number> = { breakfast: 9, snack1: 11, lunch: 14, snack2: 16, dinner: 20, snack3: 22 };

export default function Home() {
  const { t, l, lang } = useT();
  const router = useRouter();
  const catalog = useCatalog();
  const { profile, plan, journal, water, spending, set } = useApp();
  const targets = calcTargets(profile);
  const today = isoDate(new Date());

  // Utilizatorii noi trec prin onboarding.
  useEffect(() => { if (!profile.onboarded) router.replace("/onboarding"); }, [profile.onboarded, router]);

  const eaten = journal.filter((j) => j.date === today).reduce((s, j) => addN(s, j.nutrition), { ...ZERO });
  const todayPlan = plan?.days.find((d) => d.date === today);
  const hour = new Date().getHours();
  const next = todayPlan?.meals.find((m) => !m.eaten && (SLOT_HOURS[m.slot] ?? 12) >= hour) ?? todayPlan?.meals.find((m) => !m.eaten);
  const nextRecipe = next && catalog.recipeMap[next.recipeId];
  const f = fastInfo(today);

  const weekStart = addDays(today, -6);
  const spentWeek = spending.filter((s) => s.date >= weekStart).reduce((a, s) => a + s.amount, 0);
  const plannedWeek = plan ? planCost({ ...plan, days: plan.days.filter((d) => d.date >= today && d.date <= addDays(today, 6)) }, catalog, profile.householdSize) : 0;
  const weekBudget = dailyBudget(profile) * 7;

  const featured = useMemo(() => catalog.recipes
    .filter((r) => recipeAllowed(r, catalog.info[r.id], catalog.ingMap, profile, { date: today }))
    .sort((a, b) => Number(profile.cuisines.includes(b.cuisine)) - Number(profile.cuisines.includes(a.cuisine)) || catalog.info[a.id].costPerServing - catalog.info[b.id].costPerServing)
    .slice(0, 8), [catalog, profile, today]);

  if (!profile.onboarded) return null;

  return (
    <div>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-lg">
        <div className="relative z-10">
          <p className="text-sm capitalize opacity-90">{dateLong(today, lang)}</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{profile.name ? t("home.hello", { name: profile.name }) : t("home.helloAnon")}</h1>
          <p className="mt-1 opacity-90">{t("app.tagline")}</p>
          {f.fasting && (
            <p className="mt-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">☦️ {t("home.fastDay", { name: f.name ? l(f.name) : "" })}{f.fishAllowed ? ` · 🐟 ${t("home.fishAllowed")}` : ""}</p>
          )}
        </div>
        <span aria-hidden className="absolute -right-6 -top-4 text-[9rem] opacity-20">🥗</span>
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold">{t("home.today")}</h2>
          <div className="flex justify-around">
            <Ring value={eaten.kcal} max={targets.kcal} label={t("macro.kcal")} warnOver />
            <Ring value={eaten.protein} max={targets.protein} label={t("macro.protein")} color="#2e90fa" />
            <Ring value={eaten.carbs} max={targets.carbs} label={t("macro.carbs")} color="#f79009" />
            <Ring value={eaten.fat} max={targets.fat} label={t("macro.fat")} color="#d444f1" warnOver />
          </div>
          <div className="mt-4 space-y-2">
            <Bar value={eaten.fiber} max={targets.fiber} label={t("macro.fiber")} unit="g" color="bg-lime-500" />
            <Bar value={water[today] ?? 0} max={targets.waterMl} label={`💧 ${t("macro.water")}`} unit="ml" color="bg-sky-500" />
          </div>
        </Card>

        {nextRecipe && next ? (
          <Card className="flex flex-col">
            <h2 className="mb-3 font-bold">{t("home.nextMeal")} · <span className="text-brand-700 dark:text-brand-300">{t(`slot.${next.slot}` as TKey)}</span></h2>
            <Link href={recipeHref(nextRecipe.id)} className="flex flex-1 gap-3">
              <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl"><RecipeImage recipe={nextRecipe} /></div>
              <div>
                <div className="text-lg font-bold leading-snug">{l(nextRecipe.title)}</div>
                <div className="mt-1 text-sm text-slate-500">{Math.round(catalog.info[nextRecipe.id].nutrition.kcal * next.portions)} kcal · {catalog.info[nextRecipe.id].totalMin} min</div>
              </div>
            </Link>
            <div className="mt-3 flex gap-2">
              <Link href={cookHref(nextRecipe.id)}><Button size="sm">👩‍🍳 {t("rec.cookMode")}</Button></Link>
              <Link href="/plan"><Button size="sm" variant="secondary">📅 {t("nav.plan")}</Button></Link>
            </div>
          </Card>
        ) : (
          <Card className="flex flex-col items-start justify-center">
            <h2 className="font-bold">{t("home.noPlan")}</h2>
            <p className="mb-3 text-sm text-slate-500">{t("home.noPlanText")}</p>
            <Link href="/plan"><Button>✨ {t("plan.generate")}</Button></Link>
          </Card>
        )}
      </div>

      <SectionTitle>{t("home.quick")}</SectionTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/progress", icon: "📓", label: t("home.logFood") },
          { href: "/recipes?mode=fridge", icon: "🧊", label: t("home.fridge") },
          { href: "/shopping", icon: "🛒", label: t("shop.title") },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-2xl bg-white p-3 text-center text-sm font-semibold shadow-sm hover:shadow-md dark:bg-slate-900">
            <span className="text-2xl" aria-hidden>{a.icon}</span>{a.label}
          </Link>
        ))}
        <button onClick={() => set({ water: { ...water, [today]: (water[today] ?? 0) + 250 } })} className="flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-2xl bg-sky-50 p-3 text-sm font-semibold text-sky-900 shadow-sm hover:shadow-md dark:bg-sky-950/50 dark:text-sky-100">
          <span className="text-2xl" aria-hidden>💧</span>{t("home.addWater")}
        </button>
      </div>

      <Card className="mt-4">
        <h2 className="mb-2 font-bold">💰 {t("home.budgetWeek")}</h2>
        <Bar value={Math.max(spentWeek, plannedWeek)} max={weekBudget} label={spentWeek ? t("prog.spending") : t("plan.cost")} unit="lei" color="bg-amber-500" warnOver />
        <p className="mt-1 text-xs text-slate-500">{mdl(spentWeek || plannedWeek, lang)} / {mdl(weekBudget, lang)}</p>
      </Card>

      <SectionTitle action={<Link href="/recipes" className="text-sm font-semibold text-brand-700 dark:text-brand-300">{t("nav.recipes")} →</Link>}>{t("home.featured")}</SectionTitle>
      <div className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
        {featured.map((r) => <div key={r.id} className="w-64 shrink-0 snap-start"><RecipeCard recipe={r} info={catalog.info[r.id]} /></div>)}
      </div>

      <p className="mt-8 rounded-2xl bg-amber-50 p-4 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">⚕️ {t("disclaimer")} <Link href="/privacy" className="underline">{t("prof.privacy")}</Link></p>
    </div>
  );
}
