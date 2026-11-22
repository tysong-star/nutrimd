"use client";
/** Profil → Google Sheets: conectare, test, sincronizare prețuri, trimiterea produselor de bază în tabel. */
import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { buildCatalog } from "@/lib/catalog";
import { productToRow, sheetsApi, sheetsReady, syncPrices } from "@/lib/sheets";
import { dateShort } from "@/lib/format";
import { Button, Chip, Field, Input, Toggle } from "./ui";

export function SheetsSettings() {
  const { t, lang } = useT();
  const sheets = useApp((s) => s.sheets);
  const admin = useApp((s) => s.admin);
  const profile = useApp((s) => s.profile);
  const set = useApp((s) => s.set);
  const [form, setForm] = useState({ url: sheets?.url ?? "", token: sheets?.token ?? "", who: sheets?.who ?? profile.name ?? "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [seedStores, setSeedStores] = useState<string[]>(profile.preferredStores.slice(0, 2));
  // Catalog fără prețurile din Sheet, ca să trimitem datele de bază curate.
  const base = useMemo(() => buildCatalog({ ...admin, productOverrides: {}, customProducts: [] }), [admin]);

  const run = async (fn: () => Promise<string>) => {
    setBusy(true); setMsg(null);
    try { setMsg({ ok: true, text: await fn() }); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };

  const connect = () => run(async () => {
    const cfg = { ...sheets, url: form.url.trim(), token: form.token.trim(), who: form.who.trim() || "?" };
    if (!sheetsReady(cfg)) throw new Error(t("sh.invalid"));
    const r = await sheetsApi.ping(cfg);
    set({ sheets: cfg });
    return t("sh.connected", { name: r.sheet });
  });

  const seed = () => run(async () => {
    if (!sheetsReady(sheets)) throw new Error(t("sh.invalid"));
    // Un singur produs (ambalajul standard, în stoc) per ingredient și magazin — tabel ușor de întreținut.
    const rows = seedStores.flatMap((sid) => base.ingredients.map((ing) => {
      const ps = (base.productsByIngredient[ing.id] ?? []).filter((p) => p.storeId === sid && p.inStock);
      // Varianta obișnuită (ambalajul standard), nu cea mai mare: e ce cumpărați de fapt.
      return ps.find((p) => p.id.endsWith("-0")) ?? ps.sort((a, b) => a.packSize - b.packSize)[0];
    }).filter(Boolean).map((p) => productToRow(p!)));
    const r = await sheetsApi.seedPrices(sheets, rows);
    return t("sh.seeded", { n: r.added });
  });

  const sync = () => run(async () => {
    const r = await syncPrices(base.products, (id) => base.ingMap[id]?.emoji ?? "🛒");
    return t("sh.synced", { n: r.count }) + (r.errors.length ? ` · ${r.errors.length} ${t("sh.errors")}: ${r.errors.slice(0, 3).map((e) => e.message).join("; ")}` : "");
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t("sh.intro")}</p>
      <Field label={t("sh.url")} hint="https://script.google.com/macros/s/…/exec">
        <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} inputMode="url" autoCapitalize="off" autoCorrect="off" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("sh.token")}><Input value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} autoCapitalize="off" autoCorrect="off" /></Field>
        <Field label={t("sh.who")}><Input value={form.who} onChange={(e) => setForm({ ...form, who: e.target.value })} /></Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={connect} disabled={busy}>🔗 {t("sh.connect")}</Button>
        {sheets && <Button variant="ghost" onClick={() => { set({ sheets: null }); setMsg(null); }}>{t("sh.disconnect")}</Button>}
      </div>

      {sheetsReady(sheets) && (
        <div className="space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div>
            <div className="mb-1 text-sm font-semibold">💰 {t("sh.prices")}</div>
            <p className="mb-2 text-xs text-slate-500">
              {sheets.lastPriceSync ? t("sh.lastSync", { d: dateShort(sheets.lastPriceSync, lang), n: sheets.lastPriceCount ?? 0 }) : t("sh.never")}
            </p>
            <Button variant="secondary" onClick={sync} disabled={busy}>⬇️ {t("sh.syncNow")}</Button>
            <div className="mt-3">
              <Toggle checked={!!sheets.onlyMine} onChange={(v) => set({ sheets: { ...sheets, onlyMine: v } })} label={t("sh.onlyMine")} />
              <p className="text-xs text-slate-500">{t("sh.onlyMineHint")}</p>
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm font-semibold">📋 {t("sh.seedTitle")}</div>
            <p className="mb-2 text-xs text-slate-500">{t("sh.seedHint")}</p>
            <div className="mb-2 flex flex-wrap gap-2">
              {base.stores.map((s) => <Chip key={s.id} active={seedStores.includes(s.id)} onClick={() => setSeedStores(seedStores.includes(s.id) ? seedStores.filter((x) => x !== s.id) : [...seedStores, s.id])}>{s.name}</Chip>)}
            </div>
            <Button variant="secondary" onClick={seed} disabled={busy || !seedStores.length}>⬆️ {t("sh.seed")}</Button>
          </div>
        </div>
      )}
      {busy && <p className="text-sm text-slate-500">{t("common.loading")}</p>}
      {msg && <p role="status" className={msg.ok ? "text-sm font-semibold text-brand-700 dark:text-brand-300" : "text-sm font-semibold text-red-600"}>{msg.ok ? "✓ " : "⚠️ "}{msg.text}</p>}
    </div>
  );
}
