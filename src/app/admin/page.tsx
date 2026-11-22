"use client";
import { useMemo, useState } from "react";
import { buildCatalog, effectivePrice, useCatalog } from "@/lib/catalog";
import { DEFAULT_ADMIN, useApp } from "@/lib/store";
import { useT, type TKey } from "@/lib/i18n";
import { dateShort, mdl } from "@/lib/format";
import { applyImport, CSV_TEMPLATE, parseCsv, parseXml, type ImportResult } from "@/lib/importer";
import { useAllReviews } from "@/lib/reviews";
import { RECIPES } from "@/data/recipes";
import { CITIES } from "@/data/stores";
import type { Product, Recipe, Store } from "@/lib/types";
import { RecipeEditor, emptyRecipe } from "@/components/admin/RecipeEditor";
import { Button, Card, Chip, EmptyState, Field, Input, Select, Tag, cx } from "@/components/ui";
import { Columns } from "@/components/viz";

type Tab = "stats" | "recipes" | "products" | "stores" | "import" | "mapping" | "reviews";
const TABS: { id: Tab; key: TKey; icon: string }[] = [
  { id: "stats", key: "adm.stats", icon: "📊" }, { id: "recipes", key: "adm.recipes", icon: "🍲" },
  { id: "products", key: "adm.products", icon: "🏷" }, { id: "stores", key: "adm.stores", icon: "🏪" },
  { id: "import", key: "adm.import", icon: "⬆️" }, { id: "mapping", key: "adm.mapping", icon: "🔗" },
  { id: "reviews", key: "adm.reviews", icon: "💬" },
];

export default function AdminPage() {
  const { t } = useT();
  const isAdmin = useApp((s) => s.isAdmin);
  const [tab, setTab] = useState<Tab>("stats");
  if (!isAdmin) return <EmptyState emoji="🔒" title={t("adm.title")} text={t("adm.denied")} />;
  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">{t("adm.title")}</h1>
      <div className="scrollbar-none -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
        {TABS.map((x) => <Chip key={x.id} active={tab === x.id} onClick={() => setTab(x.id)}>{x.icon} {t(x.key)}</Chip>)}
      </div>
      {tab === "stats" && <Stats />}
      {tab === "recipes" && <Recipes />}
      {tab === "products" && <Products />}
      {tab === "stores" && <Stores />}
      {tab === "import" && <Import />}
      {tab === "mapping" && <Mapping />}
      {tab === "reviews" && <Reviews />}
    </div>
  );
}

// ---------------------------------------------------------------- Statistici
function Stats() {
  const { l, lang } = useT();
  const s = useApp();
  // Catalog neutru (fără substituții de profil) pentru indici de preț.
  const catalog = useMemo(() => buildCatalog(s.admin), [s.admin]);
  const reviews = useAllReviews();
  const planUses = (s.plan?.days ?? []).flatMap((d) => d.meals.map((m) => m.recipeId)).reduce<Record<string, number>>((a, id) => ((a[id] = (a[id] ?? 0) + 1), a), {});
  const top = Object.entries(planUses).sort((a, b) => b[1] - a[1]).slice(0, 5);
  // Indice de preț: coș standard de 15 ingrediente comune, 1 pachet minim din fiecare.
  const basketIds = ["potato", "onion", "carrot", "tomato", "cabbage", "eggs", "milk", "cottage_cheese", "chicken_breast", "rice", "buckwheat", "oats", "sunflower_oil", "apple", "wholegrain_bread"];
  const index = catalog.stores.map((st) => ({
    x: st.name.split(" ")[0],
    y: basketIds.reduce((sum, id) => {
      const ps = catalog.productsByIngredient[id]?.filter((p) => p.storeId === st.id && p.inStock) ?? [];
      return sum + (ps.length ? Math.min(...ps.map((p) => (effectivePrice(p) / p.packSize) * (catalog.ingMap[id].unit === "pcs" ? 10 : 1000))) : 0);
    }, 0),
  }));
  const kpis = [
    ["Rețete / Рецепты", catalog.recipes.length], ["Produse / Товары", catalog.products.length], ["Magazine", catalog.stores.length],
    ["Ingrediente", catalog.ingredients.length], ["Recenzii în așteptare", reviews.filter((r) => r.status === "pending").length],
    ["Promoții active", catalog.products.filter((p) => effectivePrice(p) < p.price).length], ["Intrări jurnal", s.journal.length], ["Favorite", s.favorites.length],
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map(([k, v]) => <Card key={k as string}><div className="text-xs text-slate-500">{k}</div><div className="text-2xl font-extrabold tabular-nums">{v}</div></Card>)}
      </div>
      <Card>
        <h2 className="font-bold">Indice coș standard (15 produse, 1 kg/l/10 buc) — MDL</h2>
        <Columns data={index.map((i) => ({ ...i, y: Math.round(i.y) }))} unit="lei" />
        <p className="text-xs text-slate-500">{index.map((i) => `${i.x}: ${mdl(i.y, lang, 0)}`).join(" · ")}</p>
      </Card>
      <Card>
        <h2 className="mb-2 font-bold">Top rețete în planuri</h2>
        {top.length ? <ol className="list-decimal pl-5 text-sm">{top.map(([id, n]) => <li key={id}>{l(catalog.recipeMap[id]?.title)} — {n}×</li>)}</ol> : <p className="text-sm text-slate-500">—</p>}
        <p className="mt-3 text-xs text-slate-500">În modul demo statisticile sunt locale. Cu Supabase, se calculează din tabelele plans / journal_entries (vezi supabase/schema.sql → view admin_stats).</p>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- Rețete
function Recipes() {
  const { t, l } = useT();
  const catalog = useCatalog();
  const setAdmin = useApp((s) => s.setAdmin);
  const adminRecipes = useApp((s) => s.admin.recipes);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [q, setQ] = useState("");
  if (editing) return (
    <Card><RecipeEditor initial={editing} onCancel={() => setEditing(null)} onSave={(r) => { setAdmin((a) => ({ recipes: { ...a.recipes, [r.id]: r } })); setEditing(null); }} /></Card>
  );
  const list = catalog.recipes.filter((r) => `${r.title.ro} ${r.title.ru}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div className="mb-3 flex gap-2">
        <Input placeholder={t("common.search")} value={q} onChange={(e) => setQ(e.target.value)} />
        <Button onClick={() => setEditing(emptyRecipe())}>＋ {t("adm.newRecipe")}</Button>
      </div>
      <ul className="divide-y divide-slate-100 rounded-2xl bg-white dark:divide-slate-800 dark:bg-slate-900">
        {list.map((r) => (
          <li key={r.id} className="flex items-center gap-3 p-3">
            <span className="text-2xl" aria-hidden>{r.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{l(r.title)}</div>
              <div className="text-xs text-slate-500">{catalog.info[r.id].nutrition.kcal} kcal · {r.steps.length} pași {r.video ? "· 🎬" : ""} {r.image ? "· 📷" : ""} {adminRecipes[r.id] ? (r.custom ? "· nouă" : "· editată") : ""}</div>
            </div>
            {/* Edităm versiunea originală (fără substituțiile profilului adminului) */}
            <Button size="sm" variant="secondary" onClick={() => setEditing(adminRecipes[r.id] ?? RECIPES.find((x) => x.id === r.id) ?? r)}>{t("common.edit")}</Button>
            <Button size="sm" variant="ghost" onClick={() => confirm(`${t("common.delete")}?`) && setAdmin((a) => ({ deletedRecipes: [...a.deletedRecipes, r.id] }))}>🗑</Button>
          </li>
        ))}
      </ul>
      <Button variant="ghost" size="sm" className="mt-3" onClick={() => setAdmin(() => ({ deletedRecipes: [], recipes: {} }))}>↺ Reset rețete demo</Button>
    </div>
  );
}

// ---------------------------------------------------------------- Produse și prețuri
function Products() {
  const { t, l, lang } = useT();
  const admin = useApp((s) => s.admin);
  const setAdmin = useApp((s) => s.setAdmin);
  const catalog = useMemo(() => buildCatalog(admin), [admin]);
  const [store, setStore] = useState(catalog.stores[0]?.id ?? "");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const list = catalog.products.filter((p) => p.storeId === store && `${p.name} ${p.brand} ${p.ean} ${catalog.ingMap[p.ingredientId]?.name.ru}`.toLowerCase().includes(q.toLowerCase()));
  const PAGE = 30;
  const patch = (id: string, p: Partial<Product>) => setAdmin((a) => ({ productOverrides: { ...a.productOverrides, [id]: { ...a.productOverrides[id], ...p, updatedAt: new Date().toISOString() } } }));
  const addProduct = () => {
    const ing = catalog.ingredients[0];
    const p: Product = { id: `adm-${Date.now()}`, storeId: store, ingredientId: ing.id, name: l(ing.name), brand: "", packSize: 1000, packLabel: "1 kg", price: 10, inStock: true, ean: `484${Date.now().toString().slice(-10)}`, emoji: ing.emoji, updatedAt: new Date().toISOString() };
    setAdmin((a) => ({ customProducts: [p, ...a.customProducts] }));
    setQ(p.ean);
  };
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Select className="!w-auto" value={store} onChange={(e) => { setStore(e.target.value); setPage(0); }}>{catalog.stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        <Input className="!w-auto flex-1" placeholder={`${t("common.search")} (nume, EAN)`} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        <Button onClick={addProduct}>＋ {t("common.add")}</Button>
      </div>
      <p className="mb-2 text-sm text-slate-500">{list.length} produse</p>
      <div className="overflow-x-auto rounded-2xl bg-white dark:bg-slate-900">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="p-2">Produs</th><th className="p-2">Ambalaj</th><th className="p-2">Preț</th><th className="p-2">Promo</th><th className="p-2">Stoc</th><th className="p-2">Actualizat</th><th /></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {list.slice(page * PAGE, page * PAGE + PAGE).map((p) => (
              <tr key={p.id}>
                <td className="p-2"><div className="font-semibold">{p.emoji} <input className="w-40 bg-transparent" value={p.name} onChange={(e) => patch(p.id, { name: e.target.value })} aria-label="name" /></div><div className="text-xs text-slate-500">{p.brand} · {p.ean}</div></td>
                <td className="p-2"><input className="w-24 rounded border border-slate-200 bg-transparent px-1 dark:border-slate-700" value={p.packLabel} onChange={(e) => patch(p.id, { packLabel: e.target.value })} aria-label="pack" /></td>
                <td className="p-2"><input type="number" step="0.01" className="w-20 rounded border border-slate-200 bg-transparent px-1 dark:border-slate-700" value={p.price} onChange={(e) => patch(p.id, { price: Number(e.target.value) })} aria-label="price" /></td>
                <td className="p-2"><input type="number" step="0.01" className="w-20 rounded border border-slate-200 bg-transparent px-1 dark:border-slate-700" value={p.promoPrice ?? ""} onChange={(e) => patch(p.id, { promoPrice: e.target.value ? Number(e.target.value) : undefined, promoUntil: e.target.value ? new Date(Date.now() + 7 * 864e5).toISOString() : undefined })} aria-label="promo" /></td>
                <td className="p-2"><input type="checkbox" className="h-5 w-5 accent-brand-600" checked={p.inStock} onChange={(e) => patch(p.id, { inStock: e.target.checked })} aria-label="stock" /></td>
                <td className="p-2 text-xs text-slate-500">{dateShort(p.updatedAt, lang)}<br />{mdl(effectivePrice(p), lang)}</td>
                <td className="p-2"><button onClick={() => setAdmin((a) => ({ deletedProducts: [...a.deletedProducts, p.id] }))} aria-label={t("common.delete")}>🗑</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>←</Button>
        <span className="text-sm">{page + 1} / {Math.max(1, Math.ceil(list.length / PAGE))}</span>
        <Button size="sm" variant="ghost" disabled={(page + 1) * PAGE >= list.length} onClick={() => setPage(page + 1)}>→</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Magazine
function Stores() {
  const { t } = useT();
  const admin = useApp((s) => s.admin);
  const setAdmin = useApp((s) => s.setAdmin);
  const catalog = useMemo(() => buildCatalog({ ...admin, disabledStores: [] }), [admin]);
  const [form, setForm] = useState<Store>({ id: "", name: "", color: "#0ea5e9", onlineUrl: "", cities: ["Chișinău"], priceFactor: 1, source: "admin" });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h2 className="mb-3 font-bold">{t("adm.stores")}</h2>
        <ul className="space-y-2">
          {catalog.stores.map((s) => {
            const disabled = admin.disabledStores.includes(s.id);
            return (
              <li key={s.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                <span className="h-4 w-4 rounded-full" style={{ background: s.color }} />
                <div className="flex-1"><div className="font-semibold">{s.name}</div><div className="text-xs text-slate-500">{s.cities.join(", ")} · sursă: {s.source} · {catalog.products.filter((p) => p.storeId === s.id).length} produse</div></div>
                <Button size="sm" variant={disabled ? "secondary" : "ghost"} onClick={() => setAdmin((a) => ({ disabledStores: disabled ? a.disabledStores.filter((x) => x !== s.id) : [...a.disabledStores, s.id] }))}>{disabled ? "Activează" : "Dezactivează"}</Button>
              </li>
            );
          })}
        </ul>
      </Card>
      <Card>
        <h2 className="mb-3 font-bold">＋ Magazin nou / Новый магазин</h2>
        <form className="space-y-3" onSubmit={(e) => {
          e.preventDefault();
          const id = form.id || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          if (!id || catalog.storeMap[id]) return;
          setAdmin((a) => ({ customStores: [...a.customStores, { ...form, id }] }));
          setForm({ ...form, id: "", name: "", onlineUrl: "" });
        }}>
          <Field label="Nume"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="ID (slug)"><Input value={form.id} placeholder="auto" onChange={(e) => setForm({ ...form, id: e.target.value })} /></Field>
          <Field label="Site / livrare"><Input type="url" value={form.onlineUrl} onChange={(e) => setForm({ ...form, onlineUrl: e.target.value })} /></Field>
          <Field label="Culoare"><Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></Field>
          <div className="flex flex-wrap gap-2">{CITIES.map((c) => <Chip key={c.name} active={form.cities.includes(c.name)} onClick={() => setForm({ ...form, cities: form.cities.includes(c.name) ? form.cities.filter((x) => x !== c.name) : [...form.cities, c.name] })}>{c.name}</Chip>)}</div>
          <p className="text-xs text-slate-500">După creare, adaugă produse din „Produse” sau importă un feed CSV/XML.</p>
          <Button type="submit">{t("common.add")}</Button>
        </form>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- Import
function Import() {
  const { lang } = useT();
  const admin = useApp((s) => s.admin);
  const setAdmin = useApp((s) => s.setAdmin);
  const catalog = useMemo(() => buildCatalog(admin), [admin]);
  const [store, setStore] = useState(catalog.stores[0]?.id ?? "");
  const [format, setFormat] = useState<"csv" | "xml">("csv");
  const [text, setText] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const parse = () => { setDone(null); setResult(format === "csv" ? parseCsv(text, store) : parseXml(text, store)); };
  const apply = () => {
    if (!result) return;
    const { overrides, created, skipped } = applyImport(result.rows, catalog.products, (id) => catalog.ingMap[id]?.emoji ?? "🛒");
    setAdmin((a) => ({
      productOverrides: { ...a.productOverrides, ...Object.fromEntries(Object.entries(overrides).map(([id, p]) => [id, { ...a.productOverrides[id], ...p }])) },
      customProducts: [...a.customProducts.filter((p) => !created.some((c) => c.id === p.id)), ...created],
      importLog: [{ date: new Date().toISOString(), source: format, storeId: store, rows: result.rows.length, updated: Object.keys(overrides).length, created: created.length, errors: result.errors.length + skipped }, ...a.importLog].slice(0, 50),
    }));
    setDone(`✓ ${Object.keys(overrides).length} actualizate, ${created.length} create, ${skipped} ignorate`);
    setResult(null);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Card className="space-y-3">
        <h2 className="font-bold">Import feed de prețuri</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">Surse: (1) API oficial al rețelei — conector în <code>/api/import</code>; (2) feed CSV/XML de la parteneri (URL sau fișier); (3) editare manuală în „Produse”. Potrivirea se face după magazin + EAN.</p>
        <div className="flex flex-wrap gap-2">
          <Select className="!w-auto" value={store} onChange={(e) => setStore(e.target.value)}>{catalog.stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
          <Select className="!w-auto" value={format} onChange={(e) => setFormat(e.target.value as "csv" | "xml")}><option value="csv">CSV</option><option value="xml">XML</option></Select>
          <input type="file" accept=".csv,.xml,.txt" className="text-sm" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setText(await f.text()); setFormat(f.name.endsWith(".xml") ? "xml" : "csv"); } }} />
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} className="w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-950" placeholder={CSV_TEMPLATE} aria-label="feed" />
        <div className="flex flex-wrap gap-2">
          <Button onClick={parse} disabled={!text.trim()}>Validează / Проверить</Button>
          <Button variant="ghost" onClick={() => { setText(CSV_TEMPLATE); setFormat("csv"); }}>Exemplu CSV</Button>
          <Button variant="ghost" onClick={() => {
            // Export prețuri curente ca CSV (util pentru partenerii care completează feed-ul)
            const rows = catalog.products.filter((p) => p.storeId === store).map((p) => [p.storeId, p.ean, p.ingredientId, `"${p.name}"`, `"${p.brand}"`, p.packSize, `"${p.packLabel}"`, p.price, p.promoPrice ?? "", p.promoUntil?.slice(0, 10) ?? "", p.inStock ? 1 : 0, ""].join(","));
            const blob = new Blob([[CSV_TEMPLATE.split("\n")[0], ...rows].join("\n")], { type: "text/csv" });
            const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `preturi-${store}.csv`; a.click();
          }}>⬇️ Export CSV</Button>
        </div>
        {result && (
          <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
            <p><b>{result.rows.length}</b> rânduri valide · <b className={cx(result.errors.length > 0 && "text-red-600")}>{result.errors.length}</b> erori</p>
            {result.errors.slice(0, 10).map((e) => <p key={e.line} className="text-xs text-red-600">{e.message}</p>)}
            <table className="mt-2 w-full text-xs"><tbody>{result.rows.slice(0, 8).map((r) => <tr key={r.ean}><td>{r.ean}</td><td>{r.name ?? catalog.products.find((p) => p.ean === r.ean)?.name ?? "?"}</td><td className="text-right">{mdl(r.price, lang)}</td></tr>)}</tbody></table>
            <Button className="mt-3" onClick={apply} disabled={!result.rows.length}>Aplică importul</Button>
          </div>
        )}
        {done && <p className="font-semibold text-brand-700 dark:text-brand-300" role="status">{done}</p>}
      </Card>
      <Card>
        <h2 className="mb-2 font-bold">Jurnal importuri</h2>
        {admin.importLog.length === 0 ? <p className="text-sm text-slate-500">—</p> : (
          <ul className="space-y-2 text-sm">{admin.importLog.map((l, i) => <li key={i} className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">{dateShort(l.date, lang)} · {catalog.storeMap[l.storeId]?.name ?? l.storeId} · {l.source.toUpperCase()}<br /><span className="text-xs text-slate-500">{l.rows} rânduri · {l.updated} act. · {l.created} noi · {l.errors} erori</span></li>)}</ul>
        )}
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => confirm("Reset prețuri la datele demo?") && setAdmin(() => ({ productOverrides: DEFAULT_ADMIN.productOverrides, customProducts: [], deletedProducts: [] }))}>↺ Reset prețuri demo</Button>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- Asociere ingredient–produs
function Mapping() {
  const { l, lang } = useT();
  const admin = useApp((s) => s.admin);
  const setAdmin = useApp((s) => s.setAdmin);
  const catalog = useMemo(() => buildCatalog(admin), [admin]);
  const [store, setStore] = useState(catalog.stores[0]?.id ?? "");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const rows = catalog.ingredients.map((ing) => ({ ing, prods: (catalog.productsByIngredient[ing.id] ?? []).filter((p) => p.storeId === store) })).filter((r) => !onlyMissing || r.prods.length === 0);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select className="!w-auto" value={store} onChange={(e) => setStore(e.target.value)}>{catalog.stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        <Chip active={onlyMissing} onClick={() => setOnlyMissing(!onlyMissing)}>⚠️ Fără produs asociat</Chip>
      </div>
      <p className="mb-3 text-sm text-slate-500">Produsul ales este folosit în lista de cumpărături pentru acest magazin. „Auto” = cel mai ieftin produs în stoc.</p>
      <ul className="divide-y divide-slate-100 rounded-2xl bg-white dark:divide-slate-800 dark:bg-slate-900">
        {rows.map(({ ing, prods }) => (
          <li key={ing.id} className="flex flex-wrap items-center gap-3 p-3">
            <span className="w-48 font-semibold">{ing.emoji} {l(ing.name)}</span>
            {prods.length ? (
              <Select className="!w-auto flex-1" value={admin.mapping[`${store}:${ing.id}`] ?? ""} onChange={(e) => setAdmin((a) => ({ mapping: { ...a.mapping, [`${store}:${ing.id}`]: e.target.value } }))}>
                <option value="">Auto</option>
                {prods.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.brand} · {p.packLabel} · {mdl(effectivePrice(p), lang)}{p.inStock ? "" : " (stoc 0)"}</option>)}
              </Select>
            ) : <Tag tone="warm">nu există produs în acest magazin</Tag>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- Moderare recenzii
function Reviews() {
  const { t, l, lang } = useT();
  const catalog = useCatalog();
  const reviews = useAllReviews();
  const setAdmin = useApp((s) => s.setAdmin);
  const [filter, setFilter] = useState<"pending" | "approved" | "hidden">("pending");
  const list = reviews.filter((r) => r.status === filter);
  const setStatus = (id: string, status: "approved" | "hidden") => setAdmin((a) => ({ reviewStatus: { ...a.reviewStatus, [id]: status } }));
  return (
    <div>
      <div className="mb-3 flex gap-2">
        {(["pending", "approved", "hidden"] as const).map((f) => <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{t(`adm.${f}` as TKey)} ({reviews.filter((r) => r.status === f).length})</Chip>)}
      </div>
      {list.length === 0 ? <EmptyState emoji="💬" title="—" /> : (
        <ul className="space-y-2">
          {list.map((r) => (
            <li key={r.id} className="rounded-2xl bg-white p-3 dark:bg-slate-900">
              <div className="text-sm"><b>{r.author}</b> · {"★".repeat(r.rating)} · {dateShort(r.date, lang)} · <span className="text-slate-500">{l(catalog.recipeMap[r.recipeId]?.title)}</span></div>
              <p className="my-1 text-sm">{r.text}</p>
              <div className="flex gap-2">
                {r.status !== "approved" && <Button size="sm" onClick={() => setStatus(r.id, "approved")}>✓ {t("adm.approve")}</Button>}
                {r.status !== "hidden" && <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "hidden")}>🚫 {t("adm.hide")}</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
