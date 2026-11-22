# Ghid: NutriMD + Google Sheets

Ce obțineți:
- **Prețurile reale** ale produselor pe care le cumpărați, ținute într-un tabel Google pe care îl editați oricând (și din aplicația Google Sheets de pe telefon).
- **O listă de cumpărături comună**: fiecare își adaugă lista din plan, iar bifările apar la amândouă în ~15 secunde.
- **Cheltuielile** apăsate cu „Am cumpărat” se adună într-o foaie comună.

Profilul, planul și jurnalul rămân separate, pe telefonul fiecăreia.

Configurarea durează ~10 minute și se face **o singură dată, de pe calculator** (editorul Apps Script e incomod pe telefon). Doar una dintre voi face pașii 1–3.

---

## 1. Creează tabelul

1. Deschide [sheets.new](https://sheets.new). Se creează un tabel gol.
2. Dă-i un nume, de exemplu **NutriMD**.

## 2. Adaugă scriptul

1. În tabel: **Extensii → Apps Script**.
2. Șterge tot ce e în editor și lipește întregul conținut al fișierului `google-apps-script/Code.gs` din proiect.
3. Apasă 💾 **Salvează**.
4. Sus, în lista de funcții, alege **setup** și apasă **▶ Rulează**.
5. Google cere permisiuni:
   - „Examinează permisiunile” → alege contul tău;
   - apare „Google nu a verificat această aplicație”. E normal, scriptul e al tău. Apasă **Avansat → Accesează NutriMD (nesigur)**;
   - **Permite**.
6. În tabel apar foile **Preturi**, **Lista**, **Cheltuieli** și **Config**. În **Config** găsești **codul secret**.

## 3. Publică scriptul ca aplicație web

1. În editorul Apps Script: **Implementare → Implementare nouă**.
2. La „Selectează tipul” (⚙️) alege **Aplicație web**.
3. Setări:
   - **Execută ca:** Eu (adresa ta)
   - **Cine are acces:** **Oricine**
4. **Implementează** și copiază **URL-ul aplicației web**. Se termină cu `/exec`.

> „Oricine” înseamnă că oricine are linkul poate trimite cereri, dar fără codul secret scriptul refuză orice operație. Nu publicați linkul și codul împreună.

## 4. Conectează aplicația (fiecare, pe telefonul ei)

1. În NutriMD: **Profil → 📗 Google Sheets**.
2. Lipește **URL-ul** și **codul secret**, scrie-ți **numele** (apare lângă produsele din listă).
3. **Conectează și testează**. Trebuie să apară „✓ Conectat la «NutriMD»”.

Ca să nu tastați pe telefon, trimiteți-vă URL-ul și codul pe WhatsApp sau Telegram și faceți copy-paste.

## 5. Umple tabelul de prețuri (o singură dată)

1. În **Profil → Google Sheets → Umple tabelul cu produse de bază**, alege magazinele unde mergeți de obicei (ex. Linella și Nr1) și apasă **Trimite în tabel**.
2. În foaia **Preturi** apare câte un produs pentru fiecare ingredient, **cu prețuri demo**.
3. De acum, **corectați prețurile după bon** direct în tabel: coloana `price`, iar pentru reduceri `promo_price` și `promo_until`.
   - Nu cumpărați un produs? Ștergeți rândul.
   - Puneți `0` în `in_stock` dacă lipsește de obicei din magazin.
4. În aplicație: **Încarcă prețurile acum**. Aplicația reîncarcă oricum prețurile automat, cel mult o dată la 6 ore.
5. Când ați corectat prețurile, activați **„Folosește doar produsele din tabel”**. Prețurile demo dispar și costurile din plan și din coș se calculează doar din datele voastre.

Coloanele din foaia **Preturi**:

| coloană | ce înseamnă |
|---|---|
| `store_id` | `linella`, `nr1`, `metro`, `fidesco`, `greenhills` |
| `ean` | codul de bare (identifică produsul, nu-l modificați) |
| `ingredient_id` | ingredientul din rețete (ex. `potato`, `eggs`) |
| `pack_size` / `pack_label` | cantitatea din ambalaj în g/ml/buc și textul afișat |
| `price` | prețul în lei |
| `promo_price`, `promo_until` | preț redus și data până la care e valabil (opțional) |
| `in_stock` | `1` = există, `0` = lipsește |
| `by_weight` | `1` = la cântar (prețul e pentru `pack_size`, se plătește cantitatea exactă) |

## 6. Lista comună de cumpărături

În **Cumpărături** apare comutatorul **🛒 Lista mea / 👭 Lista comună**:

- **Adaugă lista mea în lista comună**: trimite produsele din planul tău. Dacă cealaltă a trimis deja același produs, cantitățile se adună.
- Adaugi manual orice altceva („hârtie igienică”) din câmpul de text sau direct în foaia **Lista**.
- În magazin bifați produsele. Bifa apare la cealaltă în ~15 secunde. Se poate bifa și direct în Google Sheets.
- La final: **Șterge produsele bifate**.

## Probleme frecvente

| Mesaj | Soluție |
|---|---|
| „cod secret greșit” | Recopiați codul din foaia **Config**, fără spații. |
| „Răspuns invalid — verifică URL-ul” | URL-ul trebuie să fie cel de la **Aplicație web** și să se termine cu `/exec`, nu `/edit` sau `/dev`. |
| „Lipsește foaia …” | Rulați din nou funcția `setup` (nu șterge datele existente). |
| Modificările din script nu se văd | După orice schimbare în cod: **Implementare → Gestionează implementările → ✏️ → Versiune: Versiune nouă → Implementează**. URL-ul rămâne același. |
| Vreți alt cod secret | Apps Script → ⚙️ Setările proiectului → Proprietățile scriptului → ștergeți `TOKEN` → rulați `setup`. Apoi reconectați ambele telefoane. |

Limitele gratuite Google (minute de execuție pe zi) sunt mult peste ce consumă două persoane.
