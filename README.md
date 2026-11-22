# NutriMD 🥗

Aplicație web (PWA) de nutriție și mâncare sănătoasă pentru Republica Moldova: planuri de mese personalizate, rețete cu mod de gătit, liste de cumpărături cu prețuri din magazinele locale, jurnal alimentar și progres. Interfață în **română și rusă**, temă luminoasă/întunecată, mobile-first.

> ⚕️ Aplicația oferă informații generale și **nu înlocuiește** sfatul unui medic sau nutriționist.

## Pornire rapidă

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # site static în out/ (se poate pune pe GitHub Pages, Netlify etc.)
```

Fără configurare suplimentară aplicația rulează în **mod demo**: toate datele (profil, plan, jurnal, modificări admin) se salvează local, în browser.

Pentru conturi reale copiază `.env.example` în `.env.local`, completează cheile Supabase și rulează `supabase/schema.sql`.

## Stack

| Strat | Tehnologie |
|---|---|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS |
| Stare | Zustand cu persistență (localStorage) |
| Backend | Supabase (PostgreSQL + Auth + Storage), rute API Next.js |
| Autentificare | Email (magic link), Google OAuth, telefon (OTP SMS, format +373) |
| PWA | `app/manifest.ts` + `public/sw.js` (offline pentru rețetele favorite) |

Fără biblioteci de grafice sau hărți: inelele, barele și graficele sunt SVG proprii; harta folosește embed OpenStreetMap (fără cheie API).

## Structură

```
src/
  app/                    # ecrane (rute)
    page.tsx              # Acasă: progresul zilei, următoarea masă, buget, recomandări
    onboarding/           # wizard în 7 pași + consimțământ GDPR
    profile/              # toate setările, aspect, export/ștergere date
    recipes/              # listă, căutare, filtre, „din frigider”
    recipe/               # detaliu rețetă (?id=…): porții, substituții, video, pași, recenzii
    recipe/cook/          # mod gătit (wake lock, swipe, cronometre)
    plan/                 # planificator zi/săptămână, drag & drop, meal prep, buget
    shopping/             # listă pe raioane, comparator magazine, coș mixt, hartă, partajare, PDF
    shopping/shared/      # listă deschisă dintr-un link partajat
    progress/             # jurnal, scanare cod de bare, grafice, apă, fitness, remindere
    admin/                # rețete, produse, magazine, import, asociere, recenzii, statistici
    privacy/              # politica de confidențialitate (șablon)
  components/             # UI reutilizabil (ui.tsx, viz.tsx, RecipeCard, Timer, VideoPlayer…)
  data/                   # date demo: 100+ ingrediente, 40 de rețete, 5 magazine, ~800 de produse
  lib/
    nutrition.ts          # Mifflin-St Jeor, PAL, ținte pe obiectiv, repartizare pe mese
    recipeInfo.ts         # nutriție/cost/alergeni/diete calculate automat din ingrediente; substituții
    planner.ts            # generator de plan (scor: kcal, proteine, grăsimi, buget, varietate)
    shopping.ts           # agregare, potrivire produse, comparator, coș mixt, link de partajare
    fasting.ts            # calendarul posturilor ortodoxe (Pascalia pe stil vechi)
    importer.ts           # parsare CSV/XML și upsert după (magazin, EAN)
    catalog.ts            # îmbină datele de bază + modificările admin + profilul utilizatorului
    i18n.ts               # dicționar ro/ru
    store.ts              # starea aplicației
supabase/schema.sql       # tabele, RLS, istoric prețuri, view statistici
```

## Cum funcționează

- **Necesar caloric**: BMR Mifflin-St Jeor × factor de activitate, ajustat pe obiectiv (deficit 20% la slăbire, +12% la masă musculară, +340/+450 kcal la sarcină/alăptare). Proteine în g/kg corp, grăsimi ca procent din calorii, iar carbohidrații din rest. Keto și low-carb redistribuie macronutrienții. Orice valoare poate fi suprascrisă manual.
- **Rețete**: nutriția, costul per porție, alergenii, dietele compatibile și etichetele („de post”, „rapid”, „ieftin”…) **nu sunt scrise de mână**, ci se calculează din ingrediente. Când adminul editează o rețetă, totul rămâne consecvent.
- **Substituții inteligente**: dacă un ingredient e alergen pentru utilizator, e exclus sau lipsește din stoc în toate magazinele, se înlocuiește automat cu o alternativă compatibilă (ex. lapte → băutură de ovăz, făină → făină fără gluten). Pe pagina rețetei poți marca „nu am” la orice ingredient ca să vezi alternativa.
- **Post ortodox**: zilele de post (miercuri/vineri, Postul Mare, al Apostolilor, al Adormirii, al Crăciunului și zilele unice) sunt marcate în calendar. Dacă dieta e „post ortodox”, în aceste zile planul folosește doar rețete de post, iar în zilele cu dezlegare acceptă și pește.
- **Coș de cumpărături**: produsele la cântar se plătesc la cantitatea exactă, cele ambalate pe pachete întregi. Comparatorul evaluează produsele lipsă dintr-un magazin la cel mai bun preț din alt magazin (+ costul unui drum suplimentar), ca să nu recomande un magazin „ieftin” doar pentru că îi lipsesc produse.

## Publicare (GitHub Pages)

Aplicația se compilează ca site static (`output: "export"`). Workflow-ul `.github/workflows/deploy.yml` o publică automat pe GitHub Pages la fiecare push pe `main`, la adresa `https://<utilizator>.github.io/<repository>/`. În repository: Settings → Pages → Source: **GitHub Actions**.

Linkul de conectare la Google Sheets are forma `https://…/#connect=<base64(JSON {u, t})>`: deschis o dată pe telefon, salvează URL-ul scriptului și codul secret. Partea după `#` nu ajunge la server și e ștearsă din bara de adrese imediat.

## Google Sheets (uz personal)

Pentru folosire în doi, fără server: un Google Sheet + Apps Script (`google-apps-script/Code.gs`) ține **prețurile reale** (editate în tabel), **lista de cumpărături comună** și **cheltuielile**. Configurare pas cu pas: [GHID-GOOGLE-SHEETS.md](GHID-GOOGLE-SHEETS.md). În aplicație: Profil → Google Sheets.

## Integrarea magazinelor

Prețurile actuale sunt **date demo generate** (marcate „date demo” în interfață), la fel și locațiile magazinelor de pe hartă. Linkurile către magazinele online (linella.md, nr1.md, metro.md, fidesco.md, greenhills.md) trebuie verificate înainte de lansare.

Toate sursele produc același format normalizat (`ImportRow`) și se potrivesc după **magazin + EAN**:

1. **API oficial** (dacă rețeaua oferă unul): implementezi un `PriceSource` care întoarce `ImportRow[]` și îl apelezi din `/api/import` sau dintr-un cron.
2. **Feed CSV/XML de la parteneri**: `POST /api/import` (fișierul `server-optional/import-route.ts`; se mută înapoi în `src/app/api/import/route.ts` doar dacă renunțați la build-ul static și rulați un server Node) cu `{ storeId, format, url }`. Cu `SUPABASE_SERVICE_ROLE_KEY` setată, face upsert în `store_products`; altfel face doar validare (dry run). Endpoint-ul se protejează cu headerul `x-import-token` (`IMPORT_TOKEN`).
3. **Panoul Admin**: Admin → Import (lipire sau încărcare fișier, validare, previzualizare, aplicare, jurnal), Admin → Produse (editare preț, promoție, stoc), Admin → Asociere ingredient–produs.

Format CSV: `store_id,ean,ingredient_id,name,brand,pack_size,pack_label,price,promo_price,promo_until,in_stock,image[,by_weight]`

Pentru un magazin nou: Admin → Magazine → „Magazin nou”, apoi importă feed-ul acestuia.

## Ce mai trebuie făcut până la producție

- **Sincronizarea datelor cu Supabase**: schema și autentificarea sunt gata, dar profilul, planul și jurnalul se salvează încă doar local. Trebuie scris stratul care le copiază în tabelele `profiles`, `meal_plans`, `journal_entries` etc. Admin-ul scrie tot local; în producție, rolul vine din `profiles.role`, nu din comutatorul demo din Profil.
- **Media**: pozele încărcate din admin se salvează redimensionate în browser. Videoclipurile încărcate ca fișier sunt disponibile doar în sesiunea curentă, deci pentru producție trebuie urcate în Supabase Storage (bucket `recipe-media`). Rețetele demo folosesc ilustrații (gradient + emoji), nu fotografii, și nu au video atașat.
- **Notificări push** cu aplicația închisă: necesită Web Push (VAPID) pe server. Acum reminderele funcționează doar cât timp aplicația/PWA e deschisă.
- **Autentificare prin SMS**: necesită un furnizor SMS configurat în Supabase.
- **Revizuiri**: textul politicii de confidențialitate este un șablon și trebuie verificat de un jurist (Legea nr. 133/2011 și actele care o modifică). Valorile nutriționale și regulile pentru sarcină/alăptare ar trebui validate de un nutriționist.
