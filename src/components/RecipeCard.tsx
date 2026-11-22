"use client";
import { recipeHref } from "@/lib/paths";
import Link from "next/link";
import type { Recipe, RecipeInfo } from "@/lib/types";
import { useT, type TKey } from "@/lib/i18n";
import { useApp } from "@/lib/store";
import { mdl } from "@/lib/format";
import { cx, Tag } from "./ui";

/**
 * Imaginea rețetei: poză reală dacă există (încărcată din Admin, cu lazy loading),
 * altfel o ilustrație generată (gradient + emoji) — ușoară și disponibilă offline.
 */
export function RecipeImage({ recipe, className, big, alt }: { recipe: Pick<Recipe, "image" | "emoji" | "gradient" | "title">; className?: string; big?: boolean; alt?: string }) {
  const lang = useApp((s) => s.lang);
  const label = alt ?? recipe.title[lang];
  if (recipe.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={recipe.image} alt={label} loading="lazy" decoding="async" className={cx("h-full w-full object-cover", className)} />;
  }
  return (
    <div role="img" aria-label={label} className={cx("relative flex h-full w-full items-center justify-center overflow-hidden", className)}
      style={{ background: `radial-gradient(circle at 30% 20%, ${recipe.gradient[0]}, ${recipe.gradient[1]})` }}>
      <span aria-hidden className={cx("drop-shadow-lg", big ? "text-[7rem] md:text-[9rem]" : "text-6xl")}>{recipe.emoji}</span>
      <span aria-hidden className="absolute -bottom-6 -right-6 text-8xl opacity-20">{recipe.emoji}</span>
    </div>
  );
}

export function RecipeCard({ recipe, info, extra, compact }: { recipe: Recipe; info: RecipeInfo; extra?: React.ReactNode; compact?: boolean }) {
  const { t, l, lang } = useT();
  const fav = useApp((s) => s.favorites.includes(recipe.id));
  const toggle = useApp((s) => s.toggleFavorite);
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <Link href={recipeHref(recipe.id)} className="block focus-visible:outline-none">
        <div className={cx("overflow-hidden", compact ? "h-28" : "h-40")}>
          <RecipeImage recipe={recipe} className="transition duration-300 group-hover:scale-105" />
        </div>
        <div className="p-3">
          <h3 className="line-clamp-2 font-bold leading-snug">{l(recipe.title)}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
            <span>⏱ {info.totalMin} {t("common.min")}</span>
            <span>🔥 {info.nutrition.kcal} {t("common.kcal")}</span>
            <span>💪 {Math.round(info.nutrition.protein)} {t("common.g")}</span>
            <span>💰 {mdl(info.costPerServing, lang, 0)}</span>
          </div>
          {!compact && (
            <div className="mt-2 flex flex-wrap gap-1">
              {info.tags.slice(0, 3).map((tag) => <Tag key={tag} tone={tag === "fast" ? "warm" : "green"}>{t(`tag.${tag}` as TKey)}</Tag>)}
            </div>
          )}
          {extra}
        </div>
      </Link>
      <button onClick={() => toggle(recipe.id)} aria-pressed={fav} aria-label={t("rec.favorites")}
        className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-lg shadow dark:bg-slate-900/90">
        {fav ? "❤️" : "🤍"}
      </button>
    </article>
  );
}
