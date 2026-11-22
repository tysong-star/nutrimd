"use client";
/**
 * „Mod gătit”: un pas pe ecran, text mare, butoane mari, swipe stânga/dreapta,
 * săgeți de la tastatură și Screen Wake Lock (ecranul nu se stinge).
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { recipeHref } from "@/lib/paths";
import { useEffect, useRef, useState } from "react";
import { useCatalog } from "@/lib/catalog";
import { useT } from "@/lib/i18n";
import { formatAmount } from "@/lib/shopping";
import { RecipeImage } from "@/components/RecipeCard";
import { StepTimer } from "@/components/Timer";
import { cx } from "@/components/ui";

function CookMode() {
  const id = useSearchParams().get("id") ?? "";
  const { t, l, lang } = useT();
  const catalog = useCatalog();
  const recipe = catalog.recipeMap[id];
  const [i, setI] = useState(-1); // -1 = lista de ingrediente
  const [wake, setWake] = useState(false);
  const touch = useRef<number | null>(null);
  const total = recipe?.steps.length ?? 0;

  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock?.request("screen");
        setWake(!!lock);
      } catch { setWake(false); }
    };
    acquire();
    const onVis = () => document.visibilityState === "visible" && acquire();
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); lock?.release().catch(() => {}); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setI((x) => Math.min(total - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(-1, x - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  if (!recipe) return <p className="p-6">{t("rec.notFound")}</p>;
  const step = i >= 0 ? recipe.steps[i] : null;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-white dark:bg-[#1c1c1e]"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (dx < -60) setI((x) => Math.min(total - 1, x + 1));
        if (dx > 60) setI((x) => Math.max(-1, x - 1));
        touch.current = null;
      }}>
      <header className="flex items-center gap-3 border-b border-black/[0.06] px-4 py-3 dark:border-white/10">
        <Link href={recipeHref(id)} className="flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.05] text-xl dark:bg-white/10" aria-label={t("common.close")}>✕</Link>
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">{l(recipe.title)}</div>
          <div className="text-xs text-ink-2">{i >= 0 ? t("rec.stepOf", { n: i + 1, total }) : t("rec.ingredients")}{wake && ` · 💡 ${t("rec.wakeLock")}`}</div>
        </div>
      </header>
      <div className="h-1.5 bg-black/[0.05] dark:bg-white/10"><div className="h-full bg-brand-500/100 transition-all" style={{ width: `${((i + 1) / total) * 100}%` }} /></div>

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 py-6" aria-live="polite">
        {step ? (
          <>
            <div className="mb-6 h-44 overflow-hidden rounded-3xl sm:h-64">
              {step.image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={step.image} alt="" className="h-full w-full object-cover" />
                : <RecipeImage recipe={{ ...recipe, image: undefined }} big />}
            </div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-2xl font-extrabold text-white">{i + 1}</div>
            <p className="text-2xl font-medium leading-relaxed sm:text-3xl">{l(step.text)}</p>
            {step.timerMin ? <div className="mt-6"><StepTimer minutes={step.timerMin} big /></div> : null}
          </>
        ) : (
          <ul className="space-y-3 text-xl">
            {recipe.ingredients.map((ri) => {
              const ing = catalog.ingMap[ri.id];
              return ing && (
                <li key={ri.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-[#1c1c1e]">
                  <span className="text-3xl" aria-hidden>{ing.emoji}</span>
                  <span className="flex-1">{l(ing.name)}</span>
                  <b className="tabular-nums">{formatAmount(ri.amount, ing.unit, lang)}</b>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <nav className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-black/[0.06] bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-white/10 dark:bg-[#1c1c1e]">
        <button onClick={() => setI(Math.max(-1, i - 1))} disabled={i === -1}
          className="min-h-[72px] rounded-2xl bg-black/[0.05] text-xl font-bold disabled:opacity-40 dark:bg-white/10">← {t("common.back")}</button>
        {i < total - 1 ? (
          <button onClick={() => setI(i + 1)} className="min-h-[72px] rounded-2xl bg-brand-600 text-xl font-bold text-white">{t("common.next")} →</button>
        ) : (
          <Link href={recipeHref(id)} className={cx("flex min-h-[72px] items-center justify-center rounded-2xl bg-brand-600 text-xl font-bold text-white")}>✓ {t("common.finish")}</Link>
        )}
      </nav>
    </div>
  );
}

export default function CookPage() {
  return <Suspense><CookMode /></Suspense>;
}
