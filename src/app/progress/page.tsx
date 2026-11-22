"use client";
import { useMemo, useState } from "react";
import { useCatalog } from "@/lib/catalog";
import { useApp } from "@/lib/store";
import { useT, type TKey } from "@/lib/i18n";
import { burnedKcal, calcTargets, dailyBudget } from "@/lib/nutrition";
import { addDays, isoDate } from "@/lib/planner";
import { addN, roundN, ZERO } from "@/lib/recipeInfo";
import { dateLong, dateShort, mdl } from "@/lib/format";
import { uid } from "@/lib/random";
import type { Ingredient, JournalEntry, MealSlot } from "@/lib/types";
import { WORKOUTS } from "@/data/workouts";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { Bar, Columns, LineChart, Ring } from "@/components/viz";
import { Button, Card, Chip, Field, Input, Modal, Select, Toggle, cx } from "@/components/ui";
import type { Catalog } from "@/lib/catalog";

const SLOTS: (MealSlot | "extra")[] = ["breakfast", "snack1", "lunch", "snack2", "dinner", "snack3", "extra"];

export default function ProgressPage() {
  const { t, l, lang } = useT();
  const catalog = useCatalog();
  const st = useApp();
  const { profile, journal, weights, water, workouts, spending, plan, reminders, set } = st;
  const targets = calcTargets(profile);
  const today = isoDate(new Date());
  const [date, setDate] = useState(today);
  const [adding, setAdding] = useState(false);
  const [weightIn, setWeightIn] = useState(String(profile.weightKg));
  const [range, setRange] = useState<"week" | "month">("week");

  const dayEntries = journal.filter((j) => j.date === date);
  const dayTotal = dayEntries.reduce((s, j) => addN(s, j.nutrition), { ...ZERO });
  const burnedToday = workouts.filter((w) => w.date === date).reduce((s, w) => s + w.kcal, 0);

  const n = range === "week" ? 7 : 30;
  const daysBack = Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
  const calSeries = daysBack.map((d) => ({ x: d.slice(8, 10), y: journal.filter((j) => j.date === d).reduce((s, j) => s + j.nutrition.kcal, 0) }));
  const loggedDays = daysBack.filter((d) => journal.some((j) => j.date === d));
  const avg = loggedDays.length ? roundN(addN(ZERO, journal.filter((j) => loggedDays.includes(j.date)).reduce((s, j) => addN(s, j.nutrition), { ...ZERO }), 1 / loggedDays.length)) : null;

  // Cheltuieli pe săptămâni (ultimele 6) sau pe luni (ultimele 6)
  const spendSeries = useMemo(() => {
    if (range === "week") {
      return Array.from({ length: 6 }, (_, i) => {
        const end = addDays(today, -7 * (5 - i));
        const start = addDays(end, -6);
        return { x: dateShort(start, lang).slice(0, 5), y: spending.filter((s) => s.date >= start && s.date <= end).reduce((a, s) => a + s.amount, 0) };
      });
    }
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
      const key = isoDate(d).slice(0, 7);
      return { x: key.slice(5) + "." + key.slice(2, 4), y: spending.filter((s) => s.date.startsWith(key)).reduce((a, s) => a + s.amount, 0) };
    });
  }, [range, spending, today, lang]);
  const budgetPer = range === "week" ? dailyBudget(profile) * 7 : dailyBudget(profile) * 30;

  const addEntry = (e: Omit<JournalEntry, "id" | "date">) => {
    set({ journal: [...useApp.getState().journal, { ...e, id: uid(), date }] });
    setAdding(false);
  };
  const removeEntry = (id: string) => set({ journal: journal.filter((j) => j.id !== id) });
  const addWater = (ml: number) => set({ water: { ...water, [date]: Math.max(0, (water[date] ?? 0) + ml) } });
  const logWeight = () => {
    const kg = Number(weightIn.replace(",", "."));
    if (!kg) return;
    set({ weights: [...weights.filter((w) => w.date !== today), { date: today, kg }].sort((a, b) => a.date.localeCompare(b.date)) });
    st.setProfile({ weightKg: kg });
  };

  const enableNotif = async () => {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    set({ reminders: { ...reminders, enabled: p === "granted" } });
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">{t("prog.title")}</h1>

      {/* ---------- Jurnal ---------- */}
      <div className="mb-3 flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => setDate(addDays(date, -1))} aria-label="prev">←</Button>
        <h2 className="flex-1 text-center text-lg font-bold capitalize">{date === today ? t("common.today") : dateLong(date, lang)}</h2>
        <Button size="sm" variant="ghost" onClick={() => setDate(addDays(date, 1))} disabled={date >= today} aria-label="next">→</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap justify-around gap-3">
              <Ring value={dayTotal.kcal} max={targets.kcal + burnedToday} label={t("macro.kcal")} sub={burnedToday ? t("prog.burned", { x: burnedToday }) : t("prog.remaining", { x: Math.max(0, Math.round(targets.kcal + burnedToday - dayTotal.kcal)) })} warnOver />
              <Ring value={dayTotal.protein} max={targets.protein} label={t("macro.protein")} color="#2e90fa" />
              <Ring value={dayTotal.carbs} max={targets.carbs} label={t("macro.carbs")} color="#f79009" />
              <Ring value={dayTotal.fat} max={targets.fat} label={t("macro.fat")} color="#d444f1" warnOver />
            </div>
            <div className="mt-4"><Bar value={dayTotal.fiber} max={targets.fiber} label={t("macro.fiber")} unit="g" color="bg-lime-500" /></div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">📓 {t("prog.journal")}</h2>
              <Button size="sm" onClick={() => setAdding(true)}>＋ {t("prog.addFood")}</Button>
            </div>
            {dayEntries.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">{t("prog.empty")}</p> : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {SLOTS.map((slot) => dayEntries.filter((j) => j.slot === slot).map((j) => (
                  <li key={j.id} className="flex items-center gap-3 py-2">
                    <span className="w-20 shrink-0 text-xs font-semibold uppercase text-brand-700 dark:text-brand-300">{t(`slot.${slot}` as TKey)}</span>
                    <span className="flex-1 text-sm">{j.name}{j.grams ? ` · ${j.grams} g` : ""} {j.source === "barcode" && "📷"}</span>
                    <span className="text-sm font-semibold tabular-nums">{Math.round(j.nutrition.kcal)} kcal</span>
                    <button onClick={() => removeEntry(j.id)} className="h-9 w-9 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={t("common.delete")}>✕</button>
                  </li>
                )))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-bold">📊 {t("prog.calories")}</h2>
              <div className="flex gap-1">{(["week", "month"] as const).map((r) => <Chip key={r} active={range === r} onClick={() => setRange(r)}>{t(r === "week" ? "prog.week" : "prog.month")}</Chip>)}</div>
            </div>
            {calSeries.some((c) => c.y > 0) ? <Columns data={calSeries.map((c) => ({ ...c, tone: c.y > targets.kcal * 1.05 ? "fill-coral-500" : "fill-brand-500" }))} target={targets.kcal} unit="kcal" /> : <p className="py-6 text-center text-sm text-slate-500">{t("prog.noData")}</p>}
            {avg && (
              <div className="mt-3 space-y-2">
                <div className="text-sm font-semibold">{t("prog.macros")}</div>
                <Bar value={avg.protein} max={targets.protein} label={t("macro.protein")} unit="g" color="bg-sky-500" />
                <Bar value={avg.carbs} max={targets.carbs} label={t("macro.carbs")} unit="g" color="bg-amber-500" />
                <Bar value={avg.fat} max={targets.fat} label={t("macro.fat")} unit="g" color="bg-fuchsia-500" />
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-2 text-lg font-bold">⚖️ {t("prog.weight")}</h2>
            {weights.length >= 2 ? <LineChart points={weights.slice(-30).map((w) => ({ x: dateShort(w.date, lang).slice(0, 5), y: w.kg }))} unit="kg" target={profile.targetWeightKg} /> : <p className="py-4 text-center text-sm text-slate-500">{t("prog.noData")}</p>}
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); logWeight(); }}>
              <Input type="number" step="0.1" inputMode="decimal" value={weightIn} onChange={(e) => setWeightIn(e.target.value)} aria-label={t("p.weight")} />
              <Button type="submit">{t("prog.logWeight")}</Button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-2 text-lg font-bold">💰 {t("prog.spending")}</h2>
            {spendSeries.some((s) => s.y > 0) ? <Columns data={spendSeries.map((s) => ({ ...s, tone: s.y > budgetPer ? "fill-coral-500" : "fill-amber-500" }))} target={budgetPer} unit="lei" /> : <p className="py-4 text-center text-sm text-slate-500">{t("prog.noData")}</p>}
            <p className="text-xs text-slate-500">{t("p.budget")}: {mdl(budgetPer, lang)} {t(range === "week" ? "period.week" : "period.month")}</p>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <h2 className="mb-2 text-lg font-bold">💧 {t("prog.water")}</h2>
            <div className="text-3xl font-extrabold tabular-nums">{water[date] ?? 0} <span className="text-base font-semibold text-slate-500">/ {targets.waterMl} ml</span></div>
            <div className="my-3 flex flex-wrap gap-1" aria-hidden>
              {Array.from({ length: Math.ceil(targets.waterMl / 250) }, (_, i) => <span key={i} className={cx("text-2xl", i < (water[date] ?? 0) / 250 ? "" : "opacity-20 grayscale")}>🥛</span>)}
            </div>
            <div className="flex gap-2"><Button variant="secondary" onClick={() => addWater(250)}>+250 ml</Button><Button variant="secondary" onClick={() => addWater(500)}>+500 ml</Button><Button variant="ghost" onClick={() => addWater(-250)}>−250</Button></div>
          </Card>

          <Card>
            <h2 className="mb-2 text-lg font-bold">🏃 {t("prog.fitness")}</h2>
            <ul className="space-y-2">
              {WORKOUTS.map((w) => {
                const kcal = burnedKcal(w.met, profile.weightKg, w.minutes);
                const done = workouts.some((x) => x.date === date && x.workoutId === w.id);
                return (
                  <li key={w.id}>
                    <details className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                      <summary className="flex cursor-pointer items-center gap-2 font-semibold"><span aria-hidden>{w.emoji}</span><span className="flex-1">{l(w.name)}</span><span className="text-xs text-slate-500">{w.minutes} min · ~{kcal} kcal</span></summary>
                      <ol className="ml-5 mt-2 list-decimal space-y-1 text-sm">{w.steps.map((s, i) => <li key={i}>{l(s)}</li>)}</ol>
                      <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(l(w.name))}`} target="_blank" rel="noreferrer" className="mt-2 block text-sm text-brand-700 underline dark:text-brand-300">🎬 Video</a>
                      <Button size="sm" className="mt-2" disabled={done} onClick={() => set({ workouts: [...workouts, { id: uid(), date, workoutId: w.id, minutes: w.minutes, kcal }] })}>{done ? "✓" : t("prog.doWorkout")}</Button>
                    </details>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <h2 className="mb-2 text-lg font-bold">🔔 {t("prog.reminders")}</h2>
            {!reminders.enabled ? <Button variant="secondary" onClick={enableNotif}>{t("prog.enableNotif")}</Button> : <Toggle checked label={t("prog.enableNotif")} onChange={() => set({ reminders: { ...reminders, enabled: false } })} />}
            {typeof Notification !== "undefined" && Notification.permission === "denied" && <p className="mt-2 text-xs text-red-600">{t("prog.notifDenied")}</p>}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["breakfast", "lunch", "dinner"] as const).map((s) => (
                <Field key={s} label={t(`slot.${s}`)}><Input type="time" value={reminders.times[s] ?? ""} onChange={(e) => set({ reminders: { ...reminders, times: { ...reminders.times, [s]: e.target.value } } })} /></Field>
              ))}
            </div>
            <Toggle checked={reminders.water} onChange={(v) => set({ reminders: { ...reminders, water: v } })} label={t("prog.waterReminder")} />
            <Field label={t("prog.shoppingReminder")}>
              <Select value={reminders.shoppingDay ?? ""} onChange={(e) => set({ reminders: { ...reminders, shoppingDay: e.target.value === "" ? null : Number(e.target.value) } })}>
                <option value="">—</option>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => <option key={d} value={d}>{new Intl.DateTimeFormat(lang === "ro" ? "ro-MD" : "ru-MD", { weekday: "long" }).format(new Date(2026, 10, 1 + d))} 10:00</option>)}
              </Select>
            </Field>
          </Card>
        </aside>
      </div>

      <AddFoodModal catalog={catalog} open={adding} onClose={() => setAdding(false)} onAdd={addEntry} date={date} planDay={plan?.days.find((d) => d.date === date)} />
    </div>
  );

}

function AddFoodModal({ open, onClose, onAdd, planDay, catalog }: { catalog: Catalog; open: boolean; onClose: () => void; onAdd: (e: Omit<JournalEntry, "id" | "date">) => void; date: string; planDay?: { meals: { uid: string; slot: MealSlot; recipeId: string; portions: number }[] } }) {
  const { t, l } = useT();
  const [tab, setTab] = useState<"plan" | "search" | "barcode">(planDay?.meals.length ? "plan" : "search");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Ingredient | null>(null);
  const [grams, setGrams] = useState("100");
  const [slot, setSlot] = useState<MealSlot | "extra">("extra");
  const [msg, setMsg] = useState<string | null>(null);
  const [source, setSource] = useState<"search" | "barcode">("search");
  const ingResults = q.length >= 2 ? catalog.ingredients.filter((i) => `${i.name.ro} ${i.name.ru}`.toLowerCase().includes(q.toLowerCase())).slice(0, 8) : [];
  const recipeResults = q.length >= 2 ? catalog.recipes.filter((r) => `${r.title.ro} ${r.title.ru}`.toLowerCase().includes(q.toLowerCase())).slice(0, 5) : [];

  return (
    <Modal open={open} onClose={onClose} title={t("prog.addFood")}>
      <div className="mb-4 flex gap-2">
        {planDay?.meals.length ? <Chip active={tab === "plan"} onClick={() => setTab("plan")}>📅 {t("prog.fromPlan")}</Chip> : null}
        <Chip active={tab === "search"} onClick={() => setTab("search")}>🔍 {t("prog.searchProduct")}</Chip>
        <Chip active={tab === "barcode"} onClick={() => setTab("barcode")}>📷 EAN</Chip>
      </div>
      <Field label={t("slot.extra")}>
        <Select value={slot} onChange={(e) => setSlot(e.target.value as MealSlot)}>{SLOTS.map((s) => <option key={s} value={s}>{t(`slot.${s}` as TKey)}</option>)}</Select>
      </Field>
      <div className="mt-4">
        {tab === "plan" && planDay && (
          <ul className="space-y-2">
            {planDay.meals.map((m) => {
              const r = catalog.recipeMap[m.recipeId]; const info = catalog.info[m.recipeId];
              return r && (
                <li key={m.uid}><button className="flex min-h-[48px] w-full items-center gap-2 rounded-xl bg-slate-50 px-3 text-left dark:bg-slate-800" onClick={() => onAdd({ slot: m.slot, name: l(r.title), source: "plan", refId: m.uid, nutrition: roundN(addN(ZERO, info.nutrition, m.portions)) })}>
                  <span>{r.emoji}</span><span className="flex-1 text-sm font-semibold">{l(r.title)}</span><span className="text-xs">{Math.round(info.nutrition.kcal * m.portions)} kcal</span>
                </button></li>
              );
            })}
          </ul>
        )}
        {tab === "search" && !sel && (
          <>
            <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("rec.search")} />
            <ul className="mt-2 space-y-1">
              {recipeResults.map((r) => (
                <li key={r.id}><button className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => onAdd({ slot, name: l(r.title), source: "search", refId: r.id, nutrition: catalog.info[r.id].nutrition })}>
                  {r.emoji} <span className="flex-1">{l(r.title)} <span className="text-xs text-slate-500">(1 {t("common.servings")})</span></span><span className="text-xs">{catalog.info[r.id].nutrition.kcal} kcal</span>
                </button></li>
              ))}
              {ingResults.map((i) => (
                <li key={i.id}><button className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { setSel(i); setSource("search"); setGrams(String(i.unit === "pcs" ? i.gramsPerUnit ?? 100 : 100)); }}>
                  {i.emoji} <span className="flex-1">{l(i.name)}</span><span className="text-xs">{i.per100.kcal} kcal/100 g</span>
                </button></li>
              ))}
            </ul>
          </>
        )}
        {tab === "barcode" && !sel && (
          <BarcodeScanner onCode={(code) => {
            const p = catalog.productByEan[code];
            if (!p) { setMsg(t("prog.notFound")); return; }
            setMsg(`${p.name} · ${p.brand} · ${catalog.storeMap[p.storeId]?.name}`);
            const ing = catalog.ingMap[p.ingredientId];
            setSel(ing); setSource("barcode"); setGrams(String(ing.unit === "pcs" ? ing.gramsPerUnit ?? 100 : 100));
          }} />
        )}
        {msg && <p className="mt-2 text-sm font-semibold">{msg}</p>}
        {sel && (
          <div className="mt-2 space-y-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
            <div className="font-semibold">{sel.emoji} {l(sel.name)}</div>
            <Field label={t("prog.grams")}><Input type="number" inputMode="numeric" value={grams} onChange={(e) => setGrams(e.target.value)} /></Field>
            <p className="text-sm">{Math.round((sel.per100.kcal * Number(grams)) / 100)} kcal · P {((sel.per100.protein * Number(grams)) / 100).toFixed(1)} g</p>
            <div className="flex gap-2">
              <Button onClick={() => onAdd({ slot, name: l(sel.name), grams: Number(grams), source, refId: sel.id, nutrition: roundN(addN(ZERO, sel.per100, Number(grams) / 100)) })}>{t("common.add")}</Button>
              <Button variant="ghost" onClick={() => { setSel(null); setMsg(null); }}>{t("common.back")}</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
