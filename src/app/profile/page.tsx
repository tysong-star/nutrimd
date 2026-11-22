"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useApp } from "@/lib/store";
import { useT, type TKey } from "@/lib/i18n";
import { Button, Card, Chip, Toggle } from "@/components/ui";
import { LangSwitch } from "@/components/AppShell";
import { DietSection, GoalSection, KitchenSection, MealsBudgetSection, PersonalSection, TargetsSection } from "@/components/ProfileSections";
import { isSupabaseConfigured, signOut } from "@/lib/supabase";
import { SheetsSettings } from "@/components/SheetsSettings";

function Section({ title, icon, children, open: defaultOpen = false }: { title: string; icon: string; children: ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="p-0">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-[60px] w-full items-center gap-3 px-4 text-left text-lg font-bold">
        <span aria-hidden>{icon}</span>{title}
        <span className={`ml-auto transition ${open ? "rotate-180" : ""}`} aria-hidden>⌄</span>
      </button>
      {open && <div className="border-t border-slate-100 p-4 dark:border-slate-800">{children}</div>}
    </Card>
  );
}

export default function ProfilePage() {
  const { t } = useT();
  const router = useRouter();
  const state = useApp();
  const { theme, fontScale, set, isAdmin, auth, resetAll } = state;

  const exportData = () => {
    // Exportul tuturor datelor personale (dreptul de acces / portabilitate).
    const { profile, plan, favorites, journal, weights, water, workouts, spending, userReviews, reminders, lang } = useApp.getState();
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), profile, plan, favorites, journal, weights, water, workouts, spending, userReviews, reminders, lang }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nutrimd-date-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const deleteAll = async () => {
    if (!confirm(t("prof.deleteConfirm"))) return;
    if (auth.mode === "supabase") await signOut();
    resetAll();
    localStorage.removeItem("nutrimd-v1");
    router.push("/onboarding");
  };

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-extrabold tracking-tight">{t("prof.title")}</h1>
      <Section title={t("ob.personal")} icon="👤" open><PersonalSection /></Section>
      <Section title={t("ob.goal")} icon="🎯"><GoalSection /></Section>
      <Section title={t("prof.targets")} icon="📊"><TargetsSection /></Section>
      <Section title={t("ob.meals")} icon="💰"><MealsBudgetSection /></Section>
      <Section title={t("ob.diet")} icon="🥦"><DietSection /></Section>
      <Section title={t("ob.kitchen")} icon="🍳"><KitchenSection /></Section>

      <Section title={t("sh.title")} icon="📗"><SheetsSettings /></Section>

      <Section title={t("prof.appearance")} icon="🎨">
        <div className="space-y-4">
          <div className="flex items-center justify-between"><span className="text-sm font-semibold">{t("prof.language")}</span><LangSwitch /></div>
          <div className="flex flex-wrap gap-2">
            {(["light", "dark", "system"] as const).map((th) => <Chip key={th} active={theme === th} onClick={() => set({ theme: th })}>{t(`theme.${th}` as TKey)}</Chip>)}
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold">{t("prof.textSize")}</div>
            <div className="flex gap-2">
              {[1, 1.12, 1.25, 1.4].map((f) => <Chip key={f} active={fontScale === f} onClick={() => set({ fontScale: f })}><span style={{ fontSize: `${f}em` }}>A</span></Chip>)}
            </div>
          </div>
        </div>
      </Section>

      <Section title={t("prof.account")} icon="🔐">
        {auth.mode === "guest" ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">{t("prof.guest")}</p>
            <Link href="/login"><Button>{t("prof.login")}</Button></Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">{auth.email ?? auth.phone}</p>
            <Button variant="secondary" onClick={async () => { await signOut(); set({ auth: { mode: "guest" } }); }}>{t("auth.logout")}</Button>
          </div>
        )}
        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Toggle checked={isAdmin} onChange={(v) => set({ isAdmin: v })} label={t("prof.adminMode")} />
          {!isSupabaseConfigured && <p className="text-xs text-slate-500">Demo: în producție rolul de admin se atribuie în baza de date (tabelul profiles.role).</p>}
        </div>
      </Section>

      <Section title={t("prof.data")} icon="🛡️">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={exportData}>⬇️ {t("prof.export")}</Button>
          <Button variant="danger" onClick={deleteAll}>🗑 {t("prof.delete")}</Button>
          <Link href="/privacy"><Button variant="ghost">{t("prof.privacy")}</Button></Link>
        </div>
        {state.profile.consentAt && <p className="mt-3 text-xs text-slate-500">Consimțământ / Согласие: {new Date(state.profile.consentAt).toLocaleString()}</p>}
      </Section>

      <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">⚕️ {t("disclaimer")}</p>
    </div>
  );
}
