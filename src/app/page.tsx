"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useCatalog } from "@/lib/catalog";
import { useApp } from "@/lib/store";
import { useT, type TKey } from "@/lib/i18n";
import { calcTargets } from "@/lib/nutrition";
import { addDays, isoDate } from "@/lib/planner";
import { fastInfo } from "@/lib/fasting";
import { recipeAllowed, addN, ZERO } from "@/lib/recipeInfo";
import { aggregatePlan, mergeExtras } from "@/lib/shopping";
import { dateLong } from "@/lib/format";
import { cookHref, recipeHref } from "@/lib/paths";
import { RecipeCard, RecipeImage } from "@/components/RecipeCard";
import { Button, Card, ListGroup, ListRow, PageHeader, SectionTitle } from "@/components/ui";
import { IconCart, IconChart } from "@/components/icons";

const SLOT_HOURS: Record<string, number> = { breakfast: 10, snack1: 12, lunch: 15, snack2: 17, dinner: 21, snack3: 23 };

function MacroBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / Math.max(1, max)) * 100);
  return (
    <div>
      <div className="flex justify-between text-[13px]"><span className="text-ink-2 dark:text-[#98989d]">{label}</span><span className="tabular-nums">{Math.round(value)}<span className="text-ink-3"> / {Math.round(max)} g</span></span></div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  );
}

export default function Home() {
  const { t, l, lang } = useT();
  const router = useRouter();
  const catalog = useCatalog();
  const { profile, plan, journal, water, shoppingExtras, set } = useApp();
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
  const toBuy = useMemo(() => {
    const base = plan ? aggregatePlan(plan, catalog, profile.householdSize, today, addDays(today, 6)) : [];
    return mergeExtras(base, shoppingExtras, catalog).filter((i) => !i.pantry).length;
  }, [plan, catalog, profile.householdSize, today, shoppingExtras]);

  const featured = useMemo(() => catalog.recipes
    .filter((r) => recipeAllowed(r, catalog.info[r.id], catalog.ingMap, profile, { date: today }))
    .sort((a, b) => Number(profile.cuisines.includes(b.cuisine)) - Number(profile.cuisines.includes(a.cuisine)) || catalog.info[a.id].costPerServing - catalog.info[b.id].costPerServing)
    .slice(0, 8), [catalog, profile, today]);

  if (!profile.onboarded) return null;
  const pct = Math.min(1, eaten.kcal / Math.max(1, targets.kcal));
  const R = 46, C = 2 * Math.PI * R;

  return (
    <div>
      <PageHeader subtitle={dateLong(today, lang)} title={profile.name ? t("home.hello", { name: profile.name }) : t("home.helloAnon")} />
      {f.fasting && profile.diet === "orthodox_fast" && (
        <p className="-mt-3 mb-4 px-1 text-[15px] text-amber-700 dark:text-amber-400">☦︎ {t("home.fastDay", { name: f.name ? l(f.name) : "" })}{f.fishAllowed ? ` · ${t("home.fishAllowed")}` : ""}</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Azi: un singur inel pentru calorii + 3 bare subțiri */}
        <Card className="flex items-center gap-5">
          <div className="relative h-[112px] w-[112px] shrink-0" role="img" aria-label={t("home.eaten", { a: Math.round(eaten.kcal), b: targets.kcal })}>
            <svg viewBox="0 0 112 112" className="-rotate-90">
              <circle cx="56" cy="56" r={R} fill="none" strokeWidth="11" className="stroke-black/[0.06] dark:stroke-white/10" />
              <circle cx="56" cy="56" r={R} fill="none" strokeWidth="11" stroke="#34c759" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition: "stroke-dashoffset .6s" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[22px] font-bold tabular-nums leading-none">{Math.max(0, Math.round(targets.kcal - eaten.kcal))}</span>
              <span className="mt-0.5 text-[11px] text-ink-2 dark:text-[#98989d]">{lang === "ro" ? "kcal rămase" : "ккал осталось"}</span>
            </div>
          </div>
          <div className="flex-1 space-y-2.5">
            <MacroBar label={t("macro.protein")} value={eaten.protein} max={targets.protein} color="#0a84ff" />
            <MacroBar label={t("macro.carbs")} value={eaten.carbs} max={targets.carbs} color="#ff9f0a" />
            <MacroBar label={t("macro.fat")} value={eaten.fat} max={targets.fat} color="#bf5af2" />
          </div>
        </Card>

        {nextRecipe && next ? (
          <Card className="p-0">
            <Link href={recipeHref(nextRecipe.id)} className="flex gap-4 p-4">
              <div className="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl"><RecipeImage recipe={nextRecipe} /></div>
              <div className="min-w-0 py-0.5">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">{t(`slot.${next.slot}` as TKey)}</p>
                <p className="line-clamp-2 text-[17px] font-semibold leading-snug">{l(nextRecipe.title)}</p>
                <p className="text-[13px] text-ink-2 dark:text-[#98989d]">{catalog.info[nextRecipe.id].totalMin} {t("common.min")} · {Math.round(catalog.info[nextRecipe.id].nutrition.kcal * next.portions)} kcal</p>
              </div>
            </Link>
            <div className="px-4 pb-4"><Link href={cookHref(nextRecipe.id)}><Button className="w-full">{t("rec.cookNow")}</Button></Link></div>
          </Card>
        ) : (
          <Card className="flex flex-col items-start justify-center gap-3">
            <div><p className="text-[17px] font-semibold">{t("home.noPlan")}</p><p className="text-[15px] text-ink-2">{t("home.noPlanText")}</p></div>
            <Link href="/plan"><Button>{t("plan.generate")}</Button></Link>
          </Card>
        )}
      </div>

      <ListGroup className="mt-6">
        <ListRow href="/shopping" left={<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white"><IconCart width={18} height={18} /></span>}
          title={t("nav.shopping")} right={toBuy ? t("home.items", { n: toBuy }) : undefined} />
        <ListRow href="/progress" left={<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0a84ff] text-white"><IconChart width={18} height={18} /></span>}
          title={t("nav.progress")} />
        <ListRow left={<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#64d2ff] text-[16px] text-white">💧</span>}
          title={t("macro.water")} subtitle={`${water[today] ?? 0} / ${targets.waterMl} ml`}
          right={<Button size="sm" variant="secondary" onClick={() => set({ water: { ...water, [today]: (water[today] ?? 0) + 250 } })}>+250 ml</Button>} />
      </ListGroup>

      <SectionTitle action={<Link href="/recipes" className="text-[17px] text-brand-700 dark:text-brand-400">{t("home.seeAll")}</Link>}>{t("home.forYou")}</SectionTitle>
      <div className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
        {featured.map((r) => <div key={r.id} className="w-44 shrink-0 snap-start md:w-52"><RecipeCard recipe={r} info={catalog.info[r.id]} /></div>)}
      </div>
    </div>
  );
}
