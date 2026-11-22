import type { Review, Workout } from "@/lib/types";
import { RECIPES } from "./recipes";
import { rng } from "@/lib/random";

/** Antrenamente simple. Calorii arse ≈ MET × greutate(kg) × ore. */
export const WORKOUTS: Workout[] = [
  { id: "walk", emoji: "🚶", met: 3.8, minutes: 30, name: { ro: "Mers alert", ru: "Быстрая ходьба" },
    steps: [{ ro: "5 min încălzire în ritm lejer", ru: "5 мин разминка в лёгком темпе" }, { ro: "20 min mers alert, brațele active", ru: "20 мин быстрой ходьбы, активные руки" }, { ro: "5 min revenire și stretching", ru: "5 мин заминка и растяжка" }] },
  { id: "hiit", emoji: "🔥", met: 8, minutes: 20, name: { ro: "HIIT acasă (fără echipament)", ru: "HIIT дома (без инвентаря)" },
    steps: [{ ro: "Jumping jacks 40 s / pauză 20 s", ru: "Джампинг-джек 40 с / отдых 20 с" }, { ro: "Genuflexiuni 40 s / pauză 20 s", ru: "Приседания 40 с / отдых 20 с" }, { ro: "Flotări 40 s / pauză 20 s", ru: "Отжимания 40 с / отдых 20 с" }, { ro: "Mountain climbers 40 s / pauză 20 s", ru: "Скалолаз 40 с / отдых 20 с" }, { ro: "Repetă 5 runde", ru: "Повторите 5 раундов" }] },
  { id: "strength", emoji: "🏋️", met: 5, minutes: 40, name: { ro: "Forță full-body", ru: "Силовая на всё тело" },
    steps: [{ ro: "Genuflexiuni 4×12", ru: "Приседания 4×12" }, { ro: "Fandări 3×10/picior", ru: "Выпады 3×10 на ногу" }, { ro: "Flotări 4×10", ru: "Отжимания 4×10" }, { ro: "Ramat cu gantere 4×12", ru: "Тяга гантелей 4×12" }, { ro: "Plank 3×45 s", ru: "Планка 3×45 с" }] },
  { id: "yoga", emoji: "🧘", met: 2.5, minutes: 30, name: { ro: "Yoga și mobilitate", ru: "Йога и мобильность" },
    steps: [{ ro: "Salutul soarelui ×5", ru: "Приветствие солнцу ×5" }, { ro: "Poziții de echilibru", ru: "Позы на равновесие" }, { ro: "Stretching și respirație", ru: "Растяжка и дыхание" }] },
  { id: "bike", emoji: "🚴", met: 7, minutes: 45, name: { ro: "Bicicletă", ru: "Велосипед" },
    steps: [{ ro: "Ritm moderat constant", ru: "Постоянный умеренный темп" }] },
];

const NAMES = ["Ana", "Ion", "Maria", "Vasile", "Elena", "Andrei", "Olga", "Dmitri", "Natalia", "Sergiu", "Irina", "Victor"];
const TEXTS = [
  "Foarte gustos și simplu de făcut!", "Am redus puțin sarea, a ieșit perfect.", "Copiilor le-a plăcut mult.",
  "Очень вкусно, буду готовить ещё!", "Bun pentru meal prep, ține 3 zile.", "Рецепт простой и понятный.",
  "Aș mai adăuga puțin usturoi.", "Отличный вариант на ужин.",
];

/** Recenzii demo (aprobate) generate determinist. */
export const DEMO_REVIEWS: Review[] = RECIPES.flatMap((rec) => {
  const rand = rng("rev-" + rec.id);
  const n = 1 + Math.floor(rand() * 4);
  return Array.from({ length: n }, (_, i) => ({
    id: `demo-${rec.id}-${i}`,
    recipeId: rec.id,
    author: NAMES[Math.floor(rand() * NAMES.length)],
    rating: 3 + Math.round(rand() * 2),
    text: TEXTS[Math.floor(rand() * TEXTS.length)],
    date: new Date(Date.UTC(2026, 9, 1 + Math.floor(rand() * 50))).toISOString(),
    status: "approved" as const,
  }));
});
