"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { useT, type TKey } from "@/lib/i18n";
import { useCatalog } from "@/lib/catalog";
import { calcTargets } from "@/lib/nutrition";
import { generatePlan, isoDate } from "@/lib/planner";
import { Button, Card } from "@/components/ui";
import { LangSwitch } from "@/components/AppShell";
import { DietSection, GoalSection, KitchenSection, MealsBudgetSection, PersonalSection, TargetsSection } from "@/components/ProfileSections";

const STEPS: { key: TKey; C: () => React.ReactNode }[] = [
  { key: "ob.personal", C: PersonalSection },
  { key: "ob.goal", C: GoalSection },
  { key: "ob.targets", C: TargetsSection },
  { key: "ob.meals", C: MealsBudgetSection },
  { key: "ob.diet", C: DietSection },
  { key: "ob.kitchen", C: KitchenSection },
];

/** Wizard de onboarding în 7 pași; ultimul cere consimțământul GDPR și generează primul plan. */
export default function Onboarding() {
  const { t } = useT();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [consent, setConsent] = useState(false);
  const profile = useApp((s) => s.profile);
  const setProfile = useApp((s) => s.setProfile);
  const set = useApp((s) => s.set);
  const catalog = useCatalog();
  const total = STEPS.length + 1;
  const last = step === STEPS.length;
  const valid = step !== 0 || (profile.age >= 14 && profile.heightCm >= 120 && profile.weightKg >= 35);

  const finish = () => {
    const done = { ...profile, onboarded: true, consentAt: new Date().toISOString() };
    setProfile({ onboarded: true, consentAt: done.consentAt });
    const plan = generatePlan(catalog, done, calcTargets(done), isoDate(new Date()), 7, false);
    const sh = useApp.getState().sheets;
    set({ plan, weights: [{ date: isoDate(new Date()), kg: profile.weightKg }], ...(sh && (!sh.who || sh.who === "?") ? { sheets: { ...sh, who: profile.name || "?" } } : {}) });
    router.push("/plan");
  };

  const Current = STEPS[step]?.C;
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 pb-32 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <span className="text-lg font-extrabold text-brand-700 dark:text-brand-300">🥗 NutriMD</span>
        <LangSwitch />
      </div>
      <div className="mb-2 text-sm font-semibold text-ink-2">{t("ob.step", { n: step + 1, total })}</div>
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/10" role="progressbar" aria-valuenow={step + 1} aria-valuemax={total}>
        <div className="h-full rounded-full bg-brand-500/100 transition-all" style={{ width: `${((step + 1) / total) * 100}%` }} />
      </div>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">{last ? t("ob.consent") : t(STEPS[step].key)}</h1>
      {step === 0 && <p className="mb-6 text-ink-2 dark:text-[#98989d]">{t("ob.title")}</p>}
      <Card className="mt-4">
        {Current ? <Current /> : (
          <div className="space-y-4">
            <label className="flex cursor-pointer gap-3 rounded-xl bg-slate-50 p-4 dark:bg-white/10">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-brand-600" />
              <span className="text-sm">{t("ob.consentText")} <Link href="/privacy" className="font-semibold text-brand-700 underline dark:text-brand-300">{t("prof.privacy")}</Link></span>
            </label>
            <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">⚕️ {t("disclaimer")}</p>
          </div>
        )}
      </Card>
      <div className="fixed inset-x-0 bottom-0 border-t border-black/[0.06] bg-white/95 p-4 backdrop-blur dark:border-white/10 dark:bg-[#1c1c1e]/95">
        <div className="mx-auto flex max-w-2xl gap-3">
          {step > 0 && <Button variant="ghost" size="lg" onClick={() => setStep(step - 1)}>{t("common.back")}</Button>}
          {last
            ? <Button size="lg" className="flex-1" disabled={!consent} onClick={finish}>{t("ob.start")} →</Button>
            : <Button size="lg" className="flex-1" disabled={!valid} onClick={() => setStep(step + 1)}>{t("common.next")} →</Button>}
        </div>
      </div>
    </div>
  );
}
