"use client";
import Link from "next/link";
import { useState } from "react";
import type { Recipe, RecipeInfo } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { useApp } from "@/lib/store";
import { recipeHref } from "@/lib/paths";
import { INGREDIENT_MAP } from "@/data/ingredients";
import { photoUrl } from "@/data/photos";
import { cx } from "./ui";
import { IconHeart } from "./icons";

/** Fotografia reală a unui produs; dacă nu există sau nu se încarcă, emoji-ul ingredientului. */
export function ProductPhoto({ id, size = 44, className, medium, src }: { id: string; size?: number; className?: string; medium?: boolean; src?: string }) {
  const ing = INGREDIENT_MAP[id];
  // Poza din catalogul magazinului (Croco) are prioritate; dacă nu se încarcă → fotografia
  // generică a ingredientului; dacă nici aceea → emoji.
  const generic = photoUrl(id, medium || size > 100 ? "medium" : "small");
  const sources = [src, generic].filter(Boolean) as string[];
  const [idx, setIdx] = useState(0);
  const url = sources[idx];
  const failed = !url;
  const setFailed = () => setIdx((i) => i + 1);
  const lang = useApp((s) => s.lang);
  const alt = ing ? ing.name[lang] : id;
  return (
    <span className={cx("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f5f5f7] dark:bg-[#2c2c2e]", className)} style={{ width: size, height: size }}>
      {url && !failed
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt={alt} loading="lazy" decoding="async" onError={setFailed} referrerPolicy="no-referrer" className="h-[86%] w-[86%] object-contain" />
        : <span aria-label={alt} role="img" style={{ fontSize: size * 0.5 }}>{ing?.emoji ?? "🛒"}</span>}
    </span>
  );
}

/** Ingredientele „vizibile” ale unei rețete: cele mai mari cantități, fără condimente/uleiuri. */
export function heroIngredients(recipe: Pick<Recipe, "ingredients">, n = 3): string[] {
  return [...recipe.ingredients]
    .map((ri) => ({ id: ri.id, ing: INGREDIENT_MAP[ri.id], g: INGREDIENT_MAP[ri.id]?.unit === "pcs" ? ri.amount * (INGREDIENT_MAP[ri.id]?.gramsPerUnit ?? 100) : ri.amount }))
    .filter((x) => x.ing && !x.ing.pantry && x.ing.aisle !== "spices" && x.ing.aisle !== "oils" && photoUrl(x.id))
    .sort((a, b) => b.g - a.g)
    .slice(0, n)
    .map((x) => x.id);
}

/**
 * Imaginea rețetei: poza încărcată din Admin, dacă există; altfel o compoziție curată
 * din fotografiile reale ale ingredientelor principale, pe fundal neutru.
 */
export function RecipeImage({ recipe, className, big, alt }: { recipe: Pick<Recipe, "image" | "emoji" | "gradient" | "title" | "ingredients">; className?: string; big?: boolean; alt?: string }) {
  const lang = useApp((s) => s.lang);
  const label = alt ?? recipe.title[lang];
  if (recipe.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={recipe.image} alt={label} loading="lazy" decoding="async" className={cx("h-full w-full object-cover", className)} />;
  }
  const ids = heroIngredients(recipe, big ? 3 : 3);
  const size = (k: number) => (big ? [55, 34, 30][k] : [62, 38, 34][k]);
  return (
    <div role="img" aria-label={label} className={cx("relative h-full w-full overflow-hidden bg-[#f5f5f7] dark:bg-[#2c2c2e]", className)}>
      {ids.length === 0 ? (
        <span className="absolute inset-0 flex items-center justify-center text-5xl" aria-hidden>{recipe.emoji}</span>
      ) : ids.map((id, k) => {
        const pos = [
          { left: "50%", top: "46%", transform: "translate(-50%,-50%)" },
          { left: "6%", bottom: "6%" },
          { right: "6%", bottom: "8%" },
        ][k] as React.CSSProperties;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={id} src={photoUrl(id, big || k === 0 ? "medium" : "small")!} alt="" aria-hidden loading="lazy" decoding="async"
            className="absolute object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)]"
            style={{ ...pos, width: `${size(k)}%`, height: `${size(k)}%`, zIndex: k === 0 ? 1 : 2 }} />
        );
      })}
    </div>
  );
}

/** Card minimalist: imagine, titlu, o singură linie de informații. */
export function RecipeCard({ recipe, info, extra }: { recipe: Recipe; info: RecipeInfo; extra?: React.ReactNode; compact?: boolean }) {
  const { t, l } = useT();
  const fav = useApp((s) => s.favorites.includes(recipe.id));
  const toggle = useApp((s) => s.toggleFavorite);
  return (
    <article className="group relative">
      <Link href={recipeHref(recipe.id)} className="block">
        <div className="aspect-[4/3] overflow-hidden rounded-2xl">
          <RecipeImage recipe={recipe} className="transition duration-300 group-hover:scale-[1.03]" />
        </div>
        <h3 className="mt-2 line-clamp-2 px-0.5 text-[15px] font-semibold leading-snug">{l(recipe.title)}</h3>
        <p className="px-0.5 text-[13px] text-ink-2 dark:text-[#98989d]">{info.totalMin} {t("common.min")} · {info.nutrition.kcal} {t("common.kcal")}</p>
        {extra}
      </Link>
      <button onClick={() => toggle(recipe.id)} aria-pressed={fav} aria-label={t("rec.favorites")}
        className={cx("absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur transition dark:bg-black/50", fav ? "text-red-500" : "text-ink-2")}>
        <IconHeart filled={fav} width={18} height={18} />
      </button>
    </article>
  );
}
