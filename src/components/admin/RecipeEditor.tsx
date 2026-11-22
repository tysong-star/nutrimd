"use client";
/**
 * Editor de rețete pentru admin: texte ro/ru, ingrediente, pași cu imagine și cronometru,
 * poză principală, video (link YouTube/Vimeo sau fișier) cu capitole și subtitrări.
 * Imaginile sunt redimensionate în browser (max 1200 px, JPEG) înainte de salvare.
 * În producție, fișierele se urcă în Supabase Storage (bucket „recipe-media”).
 */
import { useState } from "react";
import type { Cuisine, Equipment, MealType, Recipe } from "@/lib/types";
import { useT, type TKey } from "@/lib/i18n";
import { INGREDIENTS } from "@/data/ingredients";
import { CUISINES, EQUIPMENT } from "@/components/ProfileSections";
import { Button, Chip, Field, Input, Select } from "@/components/ui";
import { RecipeImage } from "@/components/RecipeCard";

export async function resizeImage(file: File, max = 1200): Promise<string> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c.toDataURL("image/jpeg", 0.82);
}

const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export function emptyRecipe(): Recipe {
  return {
    id: `custom-${Date.now().toString(36)}`, custom: true,
    title: { ro: "", ru: "" }, description: { ro: "", ru: "" }, emoji: "🍽️", gradient: ["#d1fadf", "#6ce9a6"],
    cuisine: "moldovan", mealTypes: ["lunch"], servings: 2, prepMin: 10, cookMin: 20, difficulty: 1, equipment: ["stove"],
    ingredients: [{ id: "potato", amount: 200 }], steps: [{ text: { ro: "", ru: "" } }],
  };
}

export function RecipeEditor({ initial, onSave, onCancel }: { initial: Recipe; onSave: (r: Recipe) => void; onCancel: () => void }) {
  const { t, l } = useT();
  const [r, setR] = useState<Recipe>(initial);
  const up = (p: Partial<Recipe>) => setR((x) => ({ ...x, ...p }));
  const valid = r.title.ro.trim() && r.title.ru.trim() && r.ingredients.length && r.steps.every((s) => s.text.ro.trim());

  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (valid) onSave(r); }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Titlu (RO) *"><Input value={r.title.ro} onChange={(e) => up({ title: { ...r.title, ro: e.target.value } })} required /></Field>
        <Field label="Название (RU) *"><Input value={r.title.ru} onChange={(e) => up({ title: { ...r.title, ru: e.target.value } })} required /></Field>
        <Field label="Descriere (RO)"><Input value={r.description.ro} onChange={(e) => up({ description: { ...r.description, ro: e.target.value } })} /></Field>
        <Field label="Описание (RU)"><Input value={r.description.ru} onChange={(e) => up({ description: { ...r.description, ru: e.target.value } })} /></Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
        <div className="h-32 overflow-hidden rounded-2xl"><RecipeImage recipe={r} /></div>
        <div className="space-y-2">
          <Field label="Poză principală / Главное фото">
            <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) up({ image: await resizeImage(f) }); }} className="block w-full text-sm" />
          </Field>
          <div className="flex gap-2">
            <Field label="Emoji"><Input value={r.emoji} onChange={(e) => up({ emoji: e.target.value })} className="!w-20" /></Field>
            {r.image && <Button type="button" variant="ghost" size="sm" className="self-end" onClick={() => up({ image: undefined })}>✕ foto</Button>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Field label={t("common.servings")}><Input type="number" min={1} value={r.servings} onChange={(e) => up({ servings: Math.max(1, Number(e.target.value)) })} /></Field>
        <Field label={`${t("rec.prep")} (min)`}><Input type="number" min={0} value={r.prepMin} onChange={(e) => up({ prepMin: Number(e.target.value) })} /></Field>
        <Field label={`${t("rec.cook")} (min)`}><Input type="number" min={0} value={r.cookMin} onChange={(e) => up({ cookMin: Number(e.target.value) })} /></Field>
        <Field label={t("p.difficulty")}><Select value={r.difficulty} onChange={(e) => up({ difficulty: Number(e.target.value) as 1 | 2 | 3 })}>{[1, 2, 3].map((d) => <option key={d} value={d}>{t(`diff.${d}` as TKey)}</option>)}</Select></Field>
        <Field label={t("p.cuisines")}><Select value={r.cuisine} onChange={(e) => up({ cuisine: e.target.value as Cuisine })}>{CUISINES.map((c) => <option key={c} value={c}>{t(`cu.${c}` as TKey)}</option>)}</Select></Field>
      </div>
      <div className="flex flex-wrap gap-2">
        {MEALS.map((m) => <Chip key={m} active={r.mealTypes.includes(m)} onClick={() => up({ mealTypes: r.mealTypes.includes(m) ? r.mealTypes.filter((x) => x !== m) : [...r.mealTypes, m] })}>{t(m === "snack" ? "slot.snack1" : (`slot.${m}` as TKey))}</Chip>)}
        <Chip active={!!r.mealPrepFriendly} onClick={() => up({ mealPrepFriendly: !r.mealPrepFriendly })}>🍱 meal prep</Chip>
      </div>
      <div className="flex flex-wrap gap-2">
        {EQUIPMENT.map((e) => <Chip key={e} active={r.equipment.includes(e)} onClick={() => up({ equipment: r.equipment.includes(e) ? r.equipment.filter((x) => x !== e) : [...r.equipment, e as Equipment] })}>{t(`eq.${e}` as TKey)}</Chip>)}
      </div>

      <fieldset>
        <legend className="mb-2 font-bold">{t("rec.ingredients")}</legend>
        <div className="space-y-2">
          {r.ingredients.map((ri, i) => {
            const ing = INGREDIENTS.find((x) => x.id === ri.id);
            return (
              <div key={i} className="flex gap-2">
                <Select value={ri.id} onChange={(e) => up({ ingredients: r.ingredients.map((x, j) => (j === i ? { ...x, id: e.target.value } : x)) })}>
                  {INGREDIENTS.map((x) => <option key={x.id} value={x.id}>{x.emoji} {l(x.name)}</option>)}
                </Select>
                <Input type="number" step="any" min={0} className="!w-28" value={ri.amount} onChange={(e) => up({ ingredients: r.ingredients.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) } : x)) })} aria-label="amount" />
                <span className="self-center text-sm text-slate-500 w-8">{ing?.unit === "pcs" ? "buc" : ing?.unit}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => up({ ingredients: r.ingredients.filter((_, j) => j !== i) })} aria-label={t("common.delete")}>✕</Button>
              </div>
            );
          })}
        </div>
        <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => up({ ingredients: [...r.ingredients, { id: "onion", amount: 100 }] })}>＋ {t("common.add")}</Button>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-bold">{t("rec.steps")}</legend>
        <ol className="space-y-3">
          {r.steps.map((s, i) => (
            <li key={i} className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <div className="font-semibold">#{i + 1}</div>
              <textarea placeholder="RO *" rows={2} className="w-full rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-950" value={s.text.ro} onChange={(e) => up({ steps: r.steps.map((x, j) => (j === i ? { ...x, text: { ...x.text, ro: e.target.value } } : x)) })} />
              <textarea placeholder="RU" rows={2} className="w-full rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-950" value={s.text.ru} onChange={(e) => up({ steps: r.steps.map((x, j) => (j === i ? { ...x, text: { ...x.text, ru: e.target.value } } : x)) })} />
              <div className="flex flex-wrap items-end gap-3">
                <Field label="⏱ min"><Input type="number" min={0} className="!w-24" value={s.timerMin ?? ""} onChange={(e) => up({ steps: r.steps.map((x, j) => (j === i ? { ...x, timerMin: e.target.value ? Number(e.target.value) : undefined } : x)) })} /></Field>
                <Field label="📷"><input type="file" accept="image/*" className="text-sm" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const img = await resizeImage(f, 900); up({ steps: r.steps.map((x, j) => (j === i ? { ...x, image: img } : x)) }); } }} /></Field>
                {s.image && <span className="text-xs text-brand-700">✓ foto</span>}
                <Button type="button" variant="ghost" size="sm" onClick={() => up({ steps: r.steps.filter((_, j) => j !== i) })}>✕</Button>
              </div>
            </li>
          ))}
        </ol>
        <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => up({ steps: [...r.steps, { text: { ro: "", ru: "" } }] })}>＋ {t("common.add")}</Button>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-2 font-bold">🎬 {t("rec.video")}</legend>
        <Field label="URL (YouTube / Vimeo / MP4)"><Input value={r.video?.url ?? ""} placeholder="https://www.youtube.com/watch?v=…" onChange={(e) => up({ video: e.target.value ? { chapters: r.video?.chapters ?? [], ...r.video, url: e.target.value } : undefined })} /></Field>
        <Field label="Încarcă video / Загрузить видео" hint="Demo: fișierul e disponibil doar în sesiunea curentă. În producție se urcă în Supabase Storage.">
          <input type="file" accept="video/*" className="text-sm" onChange={(e) => { const f = e.target.files?.[0]; if (f) up({ video: { chapters: r.video?.chapters ?? [], ...r.video, url: URL.createObjectURL(f) } }); }} />
        </Field>
        <Field label="Subtitrări WebVTT (URL)"><Input value={r.video?.captionsUrl ?? ""} disabled={!r.video} onChange={(e) => r.video && up({ video: { ...r.video, captionsUrl: e.target.value || undefined } })} /></Field>
        {r.video && (
          <div>
            <div className="mb-1 text-sm font-semibold">{t("rec.chapters")} (sec)</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {r.steps.map((_, i) => {
                const ch = r.video!.chapters.find((c) => c.stepIndex === i);
                return (
                  <label key={i} className="flex items-center gap-2 text-sm">#{i + 1}
                    <Input type="number" min={0} className="!w-28" value={ch?.startSec ?? ""} onChange={(e) => {
                      const rest = r.video!.chapters.filter((c) => c.stepIndex !== i);
                      const chapters = e.target.value === "" ? rest : [...rest, { stepIndex: i, startSec: Number(e.target.value) }].sort((a, b) => a.stepIndex - b.stepIndex);
                      up({ video: { ...r.video!, chapters } });
                    }} />
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </fieldset>

      <div className="sticky bottom-0 flex gap-2 border-t border-slate-200 bg-white py-3 dark:border-slate-800 dark:bg-slate-900">
        <Button type="submit" disabled={!valid}>{t("common.save")}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>{t("common.cancel")}</Button>
      </div>
    </form>
  );
}
