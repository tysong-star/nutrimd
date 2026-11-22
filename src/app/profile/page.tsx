"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useApp } from "@/lib/store";
import { useT, type TKey } from "@/lib/i18n";
import { Button, ListGroup, ListRow, Modal, PageHeader, Segmented, Toggle } from "@/components/ui";
import { calcTargets } from "@/lib/nutrition";
import { LangSwitch } from "@/components/AppShell";
import { DietSection, GoalSection, KitchenSection, MealsBudgetSection, PersonalSection, TargetsSection } from "@/components/ProfileSections";
import { isSupabaseConfigured, signOut } from "@/lib/supabase";
import { SheetsSettings } from "@/components/SheetsSettings";

type SectionId = "personal" | "goal" | "targets" | "meals" | "diet" | "kitchen" | "sheets" | "appearance" | "account" | "data";

function RowIcon({ bg, children }: { bg: string; children: ReactNode }) {
  return <span className="flex h-8 w-8 items-center justify-center rounded-lg text-[16px] text-white" style={{ background: bg }} aria-hidden>{children}</span>;
}

export default function ProfilePage() {
  const { t, lang } = useT();
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

  const [open, setOpen] = useState<SectionId | null>(null);
  const p = state.profile;
  const titles: Record<SectionId, string> = {
    personal: t("ob.personal"), goal: t("ob.goal"), targets: t("prof.targets"), meals: t("ob.meals"), diet: t("ob.diet"),
    kitchen: t("ob.kitchen"), sheets: "Google Sheets", appearance: t("prof.appearance"), account: t("prof.account"), data: t("prof.data"),
  };
  const row = (id: SectionId, bg: string, icon: string, subtitle?: string) => (
    <ListRow key={id} onClick={() => setOpen(id)} chevron left={<RowIcon bg={bg}>{icon}</RowIcon>} title={titles[id]} right={subtitle} />
  );

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("nav.profile")} />
      <ListGroup>
        <ListRow onClick={() => setOpen("personal")} chevron
          left={<span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-[#a1a1a6] to-[#8e8e93] text-[22px] font-semibold text-white">{(p.name || "?").slice(0, 1).toUpperCase()}</span>}
          title={<span className="text-[20px] font-semibold">{p.name || t("home.helloAnon")}</span>}
          subtitle={`${p.age} · ${p.heightCm} cm · ${p.weightKg} kg`} />
      </ListGroup>
      <ListGroup>
        {row("goal", "#34c759", "◎", t(`goal.${p.goal}` as TKey))}
        {row("targets", "#ff9f0a", "∑", `${calcTargets(p).kcal} kcal`)}
        {row("meals", "#0a84ff", "₤", `${p.mealsPerDay} · ${p.budget.amount} lei`)}
        {row("diet", "#30d158", "✿", t(`diet.${p.diet}` as TKey))}
        {row("kitchen", "#ff6961", "♨")}
      </ListGroup>
      <ListGroup>
        {row("sheets", "#0f9d58", "▦", state.sheets?.url ? "✓" : undefined)}
        {row("appearance", "#5e5ce6", "Aa", lang.toUpperCase())}
        {row("account", "#8e8e93", "⚙︎")}
        {row("data", "#636366", "⛉")}
      </ListGroup>
      {isAdmin && <ListGroup><ListRow href="/admin" title={t("nav.admin")} left={<RowIcon bg="#ff9f0a">★</RowIcon>} /></ListGroup>}
      <p className="px-4 pb-6 text-[13px] leading-relaxed text-ink-2 dark:text-[#98989d]">{t("disclaimer")} <Link href="/privacy" className="text-brand-700 dark:text-brand-400">{t("prof.privacy")}</Link></p>

      <Modal open={open !== null} onClose={() => setOpen(null)} title={open ? titles[open] : ""}>
        <div className="rounded-2xl bg-white p-4 dark:bg-[#2c2c2e]">
          {open === "personal" && <PersonalSection />}
          {open === "goal" && <GoalSection />}
          {open === "targets" && <TargetsSection />}
          {open === "meals" && <MealsBudgetSection />}
          {open === "diet" && <DietSection />}
          {open === "kitchen" && <KitchenSection />}
          {open === "sheets" && <SheetsSettings />}
          {open === "appearance" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between"><span className="text-[17px]">{t("prof.language")}</span><LangSwitch /></div>
              <Segmented value={theme} onChange={(v) => set({ theme: v })} options={(["light", "dark", "system"] as const).map((th) => ({ value: th, label: t(`theme.${th}` as TKey) }))} />
              <div>
                <div className="mb-2 text-[13px] text-ink-2">{t("prof.textSize")}</div>
                <Segmented value={String(fontScale)} onChange={(v) => set({ fontScale: Number(v) })} options={[1, 1.12, 1.25, 1.4].map((f) => ({ value: String(f), label: <span style={{ fontSize: `${0.8 + (f - 1) * 1.2}em` }}>A</span> }))} />
              </div>
            </div>
          )}
          {open === "account" && (
            <div className="space-y-4">
              {auth.mode === "guest" ? (
                <>
                  <p className="text-[15px] text-ink-2">{t("prof.guest")}</p>
                  <Link href="/login"><Button variant="secondary">{t("prof.login")}</Button></Link>
                </>
              ) : (
                <>
                  <p className="text-[15px]">{auth.email ?? auth.phone}</p>
                  <Button variant="secondary" onClick={async () => { await signOut(); set({ auth: { mode: "guest" } }); }}>{t("auth.logout")}</Button>
                </>
              )}
              <Toggle checked={isAdmin} onChange={(v) => set({ isAdmin: v })} label={t("prof.adminMode")} />
              {!isSupabaseConfigured && <p className="text-[13px] text-ink-2">Demo: în producție rolul de admin se atribuie în baza de date.</p>}
            </div>
          )}
          {open === "data" && (
            <div className="space-y-3">
              <Button variant="secondary" className="w-full" onClick={exportData}>{t("prof.export")}</Button>
              <Button variant="danger" className="w-full" onClick={deleteAll}>{t("prof.delete")}</Button>
              <Link href="/privacy" className="block text-center text-[15px] text-brand-700 dark:text-brand-400">{t("prof.privacy")}</Link>
              {p.consentAt && <p className="text-center text-[13px] text-ink-2">Consimțământ / Согласие: {new Date(p.consentAt).toLocaleString()}</p>}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
