import type { Cuisine, Equipment, MealType, Recipe, RecipeStep } from "@/lib/types";

/**
 * 36 de rețete demo (ro/ru). Valorile nutriționale, alergenii, dietele compatibile și costul
 * NU sunt scrise manual: se calculează automat din ingrediente (vezi lib/recipeInfo.ts),
 * astfel încât rămân consecvente când adminul editează o rețetă.
 * Cantitățile sunt pentru întreaga rețetă (câmpul `servings`).
 */

const s = (ro: string, ru: string, timerMin?: number): RecipeStep => ({ text: { ro, ru }, timerMin });
type I = [string, number];

function r(
  id: string,
  title: [string, string],
  description: [string, string],
  emoji: string,
  gradient: [string, string],
  cuisine: Cuisine,
  mealTypes: MealType[],
  servings: number,
  prepMin: number,
  cookMin: number,
  difficulty: 1 | 2 | 3,
  equipment: Equipment[],
  ingredients: I[],
  steps: RecipeStep[],
  extra: Partial<Recipe> = {},
): Recipe {
  return {
    id, title: { ro: title[0], ru: title[1] }, description: { ro: description[0], ru: description[1] },
    emoji, gradient, cuisine, mealTypes, servings, prepMin, cookMin, difficulty, equipment,
    ingredients: ingredients.map(([iid, amount]) => ({ id: iid, amount })), steps, ...extra,
  };
}

const G = {
  green: ["#d1fadf", "#6ce9a6"] as [string, string],
  warm: ["#fef0c7", "#fdb022"] as [string, string],
  coral: ["#fee4e2", "#fd853a"] as [string, string],
  beet: ["#fbe8ff", "#d444f1"] as [string, string],
  blue: ["#e0f2fe", "#36bffa"] as [string, string],
  earth: ["#f4ebd0", "#c4a46b"] as [string, string],
};

export const RECIPES: Recipe[] = [
  // ---------------- Moldovenești ----------------
  r("mamaliga-branza", ["Mămăligă cu brânză și smântână", "Мамалыга с брынзой и сметаной"],
    ["Clasicul moldovenesc, într-o porție echilibrată.", "Молдавская классика в сбалансированной порции."],
    "🌽", G.warm, "moldovan", ["lunch", "dinner"], 4, 5, 30, 2, ["stove"],
    [["cornmeal", 300], ["sheep_cheese", 200], ["sour_cream", 150], ["butter", 20], ["salt", 5]],
    [
      s("Fierbe 1,2 l de apă cu sarea într-un ceaun.", "Доведите 1,2 л воды с солью до кипения в казанке.", 8),
      s("Presară mălaiul treptat, amestecând continuu ca să nu facă cocoloașe.", "Постепенно всыпайте крупу, постоянно помешивая, чтобы не было комков."),
      s("Fierbe la foc mic, amestecând cu făcălețul, până se desprinde de pereți.", "Варите на слабом огне, помешивая, пока масса не начнёт отходить от стенок.", 20),
      s("Adaugă untul, răstoarnă pe un fund de lemn și servește cu brânză și smântână.", "Добавьте масло, выложите на доску и подавайте с брынзой и сметаной."),
    ], { extraTags: ["traditional"] }),

  r("zeama-gaina", ["Zeamă de găină cu tăiței", "Зама с курицей и лапшой"],
    ["Supa acrișoară de casă, cu borș și leuștean.", "Кисловатый домашний суп с курицей."],
    "🍲", G.warm, "moldovan", ["lunch"], 6, 15, 70, 2, ["stove"],
    [["chicken_whole", 800], ["carrot", 150], ["onion", 100], ["bell_pepper", 100], ["pasta_wholegrain", 150], ["lemon", 1], ["dill", 20], ["parsley", 20], ["salt", 8]],
    [
      s("Pune puiul în 3 l de apă rece, fierbe și ia spuma.", "Залейте курицу 3 л холодной воды, доведите до кипения, снимите пену.", 10),
      s("Fierbe la foc mic, cu capacul întredeschis.", "Варите на слабом огне под приоткрытой крышкой.", 45),
      s("Adaugă morcovul, ceapa și ardeiul tăiate mărunt.", "Добавьте мелко нарезанные морковь, лук и перец.", 10),
      s("Pune tăițeii și fierbe până sunt al dente.", "Добавьте лапшу и варите до готовности.", 8),
      s("Acrește cu zeamă de lămâie (sau borș), presară verdeață și servește.", "Подкислите лимонным соком (или боршем), посыпьте зеленью и подавайте."),
    ], { mealPrepFriendly: true }),

  r("sarmale-post", ["Sărmăluțe de post cu orez și ciuperci", "Постные голубцы с рисом и грибами"],
    ["Varianta de post, ușoară și aromată.", "Постный вариант — лёгкий и ароматный."],
    "🥬", G.green, "moldovan", ["lunch", "dinner"], 6, 40, 60, 3, ["stove"],
    [["sauerkraut", 800], ["rice", 250], ["mushrooms", 300], ["onion", 150], ["carrot", 100], ["tomato_paste", 60], ["sunflower_oil", 30], ["dill", 20], ["black_pepper", 2], ["salt", 6]],
    [
      s("Călește ceapa, morcovul și ciupercile tocate în ulei.", "Обжарьте измельчённые лук, морковь и грибы на масле.", 10),
      s("Amestecă cu orezul spălat, mărarul, sare și piper.", "Смешайте с промытым рисом, укропом, солью и перцем."),
      s("Umple foile de varză și rulează strâns sărmăluțele.", "Начините капустные листья и плотно сверните голубцы."),
      s("Așază-le în oală, acoperă cu apă amestecată cu pastă de tomate.", "Уложите в кастрюлю, залейте водой с томатной пастой."),
      s("Fierbe la foc mic, acoperit.", "Тушите на слабом огне под крышкой.", 60),
    ], { mealPrepFriendly: true, extraTags: ["traditional"] }),

  r("placinta-branza", ["Plăcinte la cuptor cu brânză de vaci", "Плацинды в духовке с творогом"],
    ["Plăcinte mai ușoare, coapte, nu prăjite.", "Более лёгкие плацинды — запечённые, не жареные."],
    "🥧", G.warm, "moldovan", ["breakfast", "snack"], 6, 30, 25, 3, ["oven"],
    [["flour", 400], ["kefir", 200], ["cottage_cheese", 400], ["eggs", 2], ["dill", 20], ["sunflower_oil", 30], ["salt", 5], ["baking_powder", 8]],
    [
      s("Frământă făina cu chefirul, uleiul, sarea și praful de copt; lasă aluatul 15 minute.", "Замесите тесто из муки, кефира, масла, соли и разрыхлителя; оставьте на 15 минут.", 15),
      s("Amestecă brânza cu un ou și mărarul tocat.", "Смешайте творог с яйцом и рубленым укропом."),
      s("Întinde aluatul în 6 foi, pune umplutura și închide plăcintele.", "Раскатайте 6 лепёшек, выложите начинку и защипните плацинды."),
      s("Unge cu ou bătut și coace la 200°C până se rumenesc.", "Смажьте яйцом и выпекайте при 200°C до румяности.", 25),
    ], { mealPrepFriendly: true }),

  r("fasole-batuta", ["Fasole bătută cu ceapă călită", "Фасоль бэтутэ с жареным луком"],
    ["Pastă de fasole de post, perfectă cu pâine sau legume.", "Постная фасолевая паста — с хлебом или овощами."],
    "🫘", G.earth, "moldovan", ["lunch", "dinner", "snack"], 6, 10, 90, 1, ["stove", "blender"],
    [["white_beans", 400], ["onion", 200], ["garlic", 15], ["sunflower_oil", 40], ["paprika", 4], ["salt", 6]],
    [
      s("Ține fasolea la înmuiat peste noapte, apoi fierbe-o în apă nouă.", "Замочите фасоль на ночь, затем отварите в свежей воде.", 80),
      s("Pasează fasolea cu usturoi și sare.", "Измельчите фасоль с чесноком и солью в пюре."),
      s("Călește ceapa în ulei cu boia și toarn-o peste pastă.", "Обжарьте лук на масле с паприкой и полейте пюре.", 10),
    ], { mealPrepFriendly: true, extraTags: ["traditional"] }),

  r("tocanita-legume", ["Tocăniță de legume", "Овощное рагу"],
    ["Ghiveci de sezon, gătit lent.", "Сезонное овощное рагу медленного приготовления."],
    "🍆", G.green, "moldovan", ["lunch", "dinner"], 4, 20, 40, 1, ["stove"],
    [["eggplant", 300], ["zucchini", 300], ["bell_pepper", 200], ["tomato", 300], ["onion", 150], ["carrot", 100], ["sunflower_oil", 30], ["parsley", 15], ["salt", 5]],
    [
      s("Taie toate legumele cuburi.", "Нарежьте все овощи кубиками."),
      s("Călește ceapa și morcovul în ulei.", "Обжарьте лук и морковь на масле.", 5),
      s("Adaugă restul legumelor, sare și puțină apă; înăbușă acoperit.", "Добавьте остальные овощи, соль и немного воды; тушите под крышкой.", 35),
      s("Presară pătrunjel și servește cald sau rece.", "Посыпьте петрушкой и подавайте тёплым или холодным."),
    ], { mealPrepFriendly: true }),

  r("salata-vinete", ["Salată de vinete coapte", "Салат из печёных баклажанов"],
    ["Vinete coapte cu ceapă și ulei.", "Печёные баклажаны с луком и маслом."],
    "🍆", G.beet, "moldovan", ["snack", "dinner"], 4, 10, 40, 1, ["oven"],
    [["eggplant", 800], ["onion", 80], ["sunflower_oil", 30], ["tomato", 200], ["salt", 4], ["wholegrain_bread", 160]],
    [
      s("Coace vinetele întregi la 220°C (sau pe grătar) până se înmoaie.", "Запеките баклажаны целиком при 220°C (или на гриле) до мягкости.", 40),
      s("Curăță-le, lasă-le la scurs și toacă-le cu un cuțit de lemn.", "Очистите, дайте стечь и порубите деревянным ножом."),
      s("Amestecă cu ceapa tocată, uleiul și sarea; servește cu roșii și pâine integrală.", "Смешайте с луком, маслом и солью; подавайте с помидорами и хлебом."),
    ]),

  r("parjoale-cuptor", ["Pârjoale de curcan la cuptor", "Котлеты из индейки в духовке"],
    ["Pârjoale moldovenești mai slabe, cu legume.", "Более постные молдавские котлеты с овощами."],
    "🍖", G.coral, "moldovan", ["lunch", "dinner"], 4, 20, 25, 2, ["oven"],
    [["turkey", 600], ["potato", 150], ["onion", 100], ["eggs", 1], ["dill", 15], ["garlic", 10], ["salt", 5], ["black_pepper", 2], ["cucumber", 300], ["tomato", 300]],
    [
      s("Dă prin mașina de tocat curcanul, cartoful crud și ceapa.", "Пропустите через мясорубку индейку, сырой картофель и лук."),
      s("Adaugă oul, usturoiul, mărarul, sarea și piperul; frământă bine.", "Добавьте яйцо, чеснок, укроп, соль и перец; хорошо вымешайте."),
      s("Formează pârjoale ovale și așază-le pe hârtie de copt.", "Сформируйте овальные котлеты и выложите на пергамент."),
      s("Coace la 200°C, întorcându-le la jumătate. Servește cu salată.", "Запекайте при 200°C, перевернув на середине. Подавайте с салатом.", 25),
    ], { mealPrepFriendly: true }),

  r("salata-sfecla", ["Salată de sfeclă cu nuci și usturoi", "Свекольный салат с орехами и чесноком"],
    ["Rapidă, ieftină și bogată în fibre.", "Быстрый, недорогой и богатый клетчаткой."],
    "🥗", G.beet, "moldovan", ["snack", "lunch"], 4, 10, 45, 1, ["stove"],
    [["beet", 600], ["walnuts", 50], ["garlic", 10], ["plums_dried", 60], ["greek_yogurt", 120], ["salt", 3]],
    [
      s("Fierbe sfecla în coajă până e moale.", "Отварите свёклу в кожуре до мягкости.", 45),
      s("Rade-o și amestec-o cu usturoiul pisat, prunele și nucile tocate.", "Натрите и смешайте с давленым чесноком, черносливом и орехами."),
      s("Leagă cu iaurt și sare.", "Заправьте йогуртом и посолите."),
    ]),

  r("supa-crema-dovleac", ["Supă cremă de dovleac cu ghimbir", "Крем-суп из тыквы с имбирём"],
    ["Catifelată, de post, cu semințe prăjite.", "Нежный постный суп с жареными семечками."],
    "🎃", G.warm, "moldovan", ["lunch", "dinner"], 4, 15, 30, 1, ["stove", "blender"],
    [["pumpkin", 800], ["carrot", 150], ["onion", 100], ["ginger", 15], ["vegetable_broth", 800], ["sunflower_oil", 15], ["pumpkin_seeds", 40], ["salt", 4]],
    [
      s("Călește ceapa și ghimbirul în ulei.", "Обжарьте лук и имбирь на масле.", 4),
      s("Adaugă dovleacul și morcovul cuburi, toarnă supa și fierbe.", "Добавьте тыкву и морковь кубиками, залейте бульоном и варите.", 25),
      s("Pasează cu blenderul până devine cremă.", "Пюрируйте блендером до кремовой консистенции."),
      s("Servește cu semințe de dovleac prăjite.", "Подавайте с обжаренными тыквенными семечками."),
    ], { mealPrepFriendly: true }),

  r("ghiveci-pui-multicooker", ["Pui cu legume la multicooker", "Курица с овощами в мультиварке"],
    ["Pui fraged și legume, fără efort.", "Нежная курица с овощами без лишних усилий."],
    "🍗", G.coral, "moldovan", ["lunch", "dinner"], 4, 15, 45, 1, ["multicooker"],
    [["chicken_thigh", 600], ["potato", 500], ["carrot", 150], ["onion", 100], ["bell_pepper", 150], ["tomato_paste", 30], ["paprika", 4], ["salt", 5]],
    [
      s("Taie puiul și legumele bucăți mari.", "Нарежьте курицу и овощи крупными кусками."),
      s("Pune totul în vasul multicookerului cu pasta de tomate, boia, sare și 200 ml apă.", "Сложите всё в чашу мультиварки с томатной пастой, паприкой, солью и 200 мл воды."),
      s("Gătește pe programul „Tocăniță”.", "Готовьте в режиме «Тушение».", 45),
    ], { mealPrepFriendly: true }),

  // ---------------- Ucrainene ----------------
  r("bors-rosu", ["Borș roșu ucrainean", "Украинский борщ"],
    ["Borș cu sfeclă, varză și vită.", "Борщ со свёклой, капустой и говядиной."],
    "🍲", G.beet, "ukrainian", ["lunch"], 6, 20, 90, 2, ["stove"],
    [["beef", 400], ["beet", 300], ["cabbage", 300], ["potato", 300], ["carrot", 120], ["onion", 100], ["tomato_paste", 40], ["garlic", 10], ["sour_cream", 90], ["dill", 15], ["salt", 8], ["bay_leaf", 1]],
    [
      s("Fierbe carnea în 2,5 l apă cu foaia de dafin.", "Отварите мясо в 2,5 л воды с лавровым листом.", 60),
      s("Adaugă cartofii cubulețe și varza tăiată fideluță.", "Добавьте картофель кубиками и нашинкованную капусту.", 10),
      s("Călește ceapa, morcovul și sfecla cu pasta de tomate; pune-le în oală.", "Пассеруйте лук, морковь и свёклу с томатной пастой; добавьте в кастрюлю.", 10),
      s("La final, adaugă usturoiul și mărarul. Servește cu smântână.", "В конце добавьте чеснок и укроп. Подавайте со сметаной.", 5),
    ], { mealPrepFriendly: true }),

  r("syrniki", ["Syrniki (clătite de brânză) la tigaie", "Сырники"],
    ["Mic-dejun proteic, cu fructe de pădure.", "Белковый завтрак с ягодами."],
    "🥞", G.warm, "ukrainian", ["breakfast"], 2, 10, 12, 2, ["stove"],
    [["cottage_cheese", 400], ["eggs", 1], ["flour", 40], ["honey", 15], ["sunflower_oil", 10], ["berries", 100]],
    [
      s("Amestecă brânza cu oul, mierea și făina.", "Смешайте творог с яйцом, мёдом и мукой."),
      s("Formează 8 chifteluțe plate și tăvălește-le prin făină.", "Сформируйте 8 плоских сырников, обваляйте в муке."),
      s("Prăjește în puțin ulei, la foc mediu, câte 3–4 minute pe parte.", "Обжаривайте на небольшом количестве масла по 3–4 минуты с каждой стороны.", 8),
      s("Servește cu fructe de pădure.", "Подавайте с ягодами."),
    ]),

  r("vareniki-cartofi", ["Colțunași (vareniki) cu cartofi", "Вареники с картошкой"],
    ["Colțunași de casă cu ceapă călită.", "Домашние вареники с жареным луком."],
    "🥟", G.earth, "ukrainian", ["lunch", "dinner"], 4, 45, 15, 3, ["stove"],
    [["flour", 350], ["potato", 600], ["onion", 150], ["sunflower_oil", 30], ["salt", 6], ["dill", 10]],
    [
      s("Frământă făina cu 180 ml apă și sare; lasă aluatul 20 de minute.", "Замесите муку со 180 мл воды и солью; дайте тесту отдохнуть 20 минут.", 20),
      s("Fierbe cartofii și fă piure cu jumătate din ceapa călită.", "Отварите картофель и сделайте пюре с половиной жареного лука.", 20),
      s("Întinde aluatul, taie cercuri, umple și lipește marginile.", "Раскатайте тесто, вырежьте кружки, начините и защипните."),
      s("Fierbe colțunașii în apă cu sare până se ridică la suprafață.", "Варите в подсоленной воде до всплытия.", 5),
      s("Servește cu restul de ceapă călită și mărar.", "Подавайте с оставшимся луком и укропом."),
    ], { mealPrepFriendly: true }),

  r("hrisca-ciuperci", ["Hrișcă cu ciuperci și ceapă", "Гречка с грибами и луком"],
    ["Garnitură sățioasă, de post.", "Сытное постное блюдо."],
    "🍄", G.earth, "ukrainian", ["lunch", "dinner"], 4, 10, 25, 1, ["stove"],
    [["buckwheat", 300], ["mushrooms", 400], ["onion", 150], ["carrot", 100], ["sunflower_oil", 25], ["salt", 5], ["parsley", 10]],
    [
      s("Spală hrișca și fierbe-o în 600 ml apă cu sare.", "Промойте гречку и сварите в 600 мл подсоленной воды.", 18),
      s("Călește ceapa, morcovul și ciupercile.", "Обжарьте лук, морковь и грибы.", 12),
      s("Amestecă totul și presară pătrunjel.", "Перемешайте и посыпьте петрушкой."),
    ], { mealPrepFriendly: true }),

  r("salata-varza", ["Salată de varză cu morcov (Vitaminka)", "Салат «Витаминный»"],
    ["Crocantă, ieftină, bogată în vitamina C.", "Хрустящий, недорогой, богат витамином C."],
    "🥗", G.green, "ukrainian", ["snack", "lunch", "dinner"], 4, 10, 0, 1, [],
    [["cabbage", 500], ["carrot", 150], ["apple", 150], ["sunflower_oil", 20], ["vinegar", 15], ["salt", 4], ["dill", 10]],
    [
      s("Taie varza fideluță și freac-o cu sare.", "Нашинкуйте капусту и перетрите с солью."),
      s("Adaugă morcovul și mărul rase, mărarul, uleiul și oțetul.", "Добавьте тёртые морковь и яблоко, укроп, масло и уксус."),
    ]),

  // ---------------- Mic dejun / gustări ----------------
  r("ovaz-overnight", ["Ovăz peste noapte cu fructe de pădure", "Овсянка на ночь с ягодами"],
    ["Mic-dejun gata dimineața, fără gătit.", "Завтрак готов утром — без готовки."],
    "🫐", G.blue, "international", ["breakfast"], 1, 5, 0, 1, [],
    [["oats", 50], ["milk", 150], ["greek_yogurt", 80], ["chia", 10], ["berries", 80], ["honey", 10]],
    [
      s("Amestecă ovăzul, laptele, iaurtul și chia într-un borcan.", "Смешайте овсянку, молоко, йогурт и чиа в банке."),
      s("Ține la frigider peste noapte (minim 4 ore).", "Уберите в холодильник на ночь (минимум 4 часа)."),
      s("Dimineața, pune fructele de pădure și mierea.", "Утром добавьте ягоды и мёд."),
    ], { mealPrepFriendly: true }),

  r("terci-ovaz-mar", ["Terci de ovăz cu măr și scorțișoară", "Овсяная каша с яблоком"],
    ["Cald, ieftin, gata în 10 minute.", "Тёплая, недорогая, готова за 10 минут."],
    "🥣", G.warm, "international", ["breakfast"], 1, 3, 7, 1, ["stove", "microwave"],
    [["oats", 60], ["milk", 200], ["apple", 120], ["walnuts", 15], ["honey", 8]],
    [
      s("Fierbe ovăzul în lapte, amestecând.", "Сварите овсянку на молоке, помешивая.", 5),
      s("Adaugă mărul ras și scorțișoară.", "Добавьте тёртое яблоко и корицу.", 2),
      s("Servește cu nuci și miere.", "Подавайте с орехами и мёдом."),
    ]),

  r("omleta-legume", ["Omletă cu spanac și roșii", "Омлет со шпинатом и помидорами"],
    ["Bogată în proteine, gata în 10 minute.", "Богат белком, готов за 10 минут."],
    "🍳", G.green, "mediterranean", ["breakfast", "dinner"], 1, 5, 7, 1, ["stove"],
    [["eggs", 3], ["spinach", 60], ["tomato", 100], ["feta", 30], ["olive_oil", 5], ["salt", 1], ["wholegrain_bread", 40]],
    [
      s("Bate ouăle cu sare.", "Взбейте яйца с солью."),
      s("Călește ușor spanacul și roșiile în ulei.", "Слегка обжарьте шпинат и помидоры на масле.", 2),
      s("Toarnă ouăle, presară feta și gătește acoperit la foc mic.", "Залейте яйцами, посыпьте фетой и готовьте под крышкой на слабом огне.", 5),
    ]),

  r("pancakes-proteice", ["Clătite proteice cu banană", "Протеиновые панкейки с бананом"],
    ["Pentru sportivi: 30+ g proteine.", "Для спортсменов: более 30 г белка."],
    "🥞", G.warm, "international", ["breakfast", "snack"], 1, 5, 8, 1, ["stove", "blender"],
    [["oats", 40], ["banana", 100], ["eggs", 2], ["protein_powder", 25], ["milk", 60], ["berries", 50]],
    [
      s("Mixează toate ingredientele (fără fructe de pădure) în blender.", "Смешайте все ингредиенты (кроме ягод) в блендере."),
      s("Coace clătite mici într-o tigaie antiaderentă, câte 2 minute pe parte.", "Жарьте небольшие панкейки на антипригарной сковороде по 2 минуты с каждой стороны.", 8),
      s("Servește cu fructe de pădure.", "Подавайте с ягодами."),
    ]),

  r("iaurt-nuci-miere", ["Iaurt grecesc cu nuci și miere", "Греческий йогурт с орехами и мёдом"],
    ["Gustare proteică în 2 minute.", "Белковый перекус за 2 минуты."],
    "🍯", G.warm, "mediterranean", ["snack", "breakfast"], 1, 2, 0, 1, [],
    [["greek_yogurt", 170], ["walnuts", 15], ["honey", 10]],
    [s("Pune iaurtul în bol, adaugă nucile și mierea.", "Выложите йогурт в миску, добавьте орехи и мёд.")]),

  r("smoothie-verde", ["Smoothie verde cu spanac și banană", "Зелёный смузи со шпинатом и бананом"],
    ["Rapid, plin de fibre.", "Быстро и много клетчатки."],
    "🥤", G.green, "international", ["snack", "breakfast"], 1, 5, 0, 1, ["blender"],
    [["spinach", 40], ["banana", 120], ["apple", 100], ["kefir", 200], ["chia", 8]],
    [s("Pune totul în blender și mixează 1 minut.", "Сложите всё в блендер и взбейте 1 минуту.")]),

  r("hummus-legume", ["Hummus cu bastonașe de legume", "Хумус с овощными палочками"],
    ["Gustare de post, bogată în fibre.", "Постный перекус, богатый клетчаткой."],
    "🧆", G.earth, "middle_eastern", ["snack"], 4, 10, 0, 1, ["blender"],
    [["chickpeas", 400], ["tahini", 40], ["lemon", 1], ["garlic", 5], ["olive_oil", 15], ["cumin", 2], ["salt", 3], ["carrot", 200], ["cucumber", 200], ["bell_pepper", 150]],
    [
      s("Pasează năutul cu tahini, zeamă de lămâie, usturoi, chimion și 50 ml apă.", "Измельчите нут с тахини, лимонным соком, чесноком, зирой и 50 мл воды."),
      s("Stropește cu ulei de măsline.", "Полейте оливковым маслом."),
      s("Servește cu bastonașe de morcov, castravete și ardei.", "Подавайте с палочками моркови, огурца и перца."),
    ], { mealPrepFriendly: true }),

  r("oua-avocado-keto", ["Ouă fierte cu avocado (keto)", "Яйца с авокадо (кето)"],
    ["Mic-dejun low-carb, sățios.", "Сытный низкоуглеводный завтрак."],
    "🥑", G.green, "international", ["breakfast", "snack"], 1, 3, 8, 1, ["stove"],
    [["eggs", 2], ["avocado", 1], ["lemon", 0.25], ["salt", 1], ["sesame", 3]],
    [
      s("Fierbe ouăle 8 minute, apoi răcește-le în apă rece.", "Варите яйца 8 минут, затем остудите в холодной воде.", 8),
      s("Taie avocado, stropește-l cu lămâie, sare și susan; servește cu ouăle.", "Нарежьте авокадо, сбрызните лимоном, посолите, посыпьте кунжутом; подавайте с яйцами."),
    ]),

  // ---------------- Mediteraneene / italiene ----------------
  r("salata-greceasca", ["Salată grecească", "Греческий салат"],
    ["Proaspătă, cu feta și măsline.", "Свежий салат с фетой и оливками."],
    "🥗", G.green, "mediterranean", ["lunch", "dinner", "snack"], 2, 10, 0, 1, [],
    [["tomato", 300], ["cucumber", 200], ["bell_pepper", 100], ["onion", 40], ["olives", 40], ["feta", 100], ["olive_oil", 15]],
    [
      s("Taie legumele bucăți mari.", "Нарежьте овощи крупно."),
      s("Adaugă măslinele, feta și uleiul de măsline.", "Добавьте оливки, фету и оливковое масло."),
    ]),

  r("somon-broccoli", ["Somon la cuptor cu broccoli și lămâie", "Лосось в духовке с брокколи"],
    ["Omega-3 și proteine, gata în 25 de minute.", "Омега-3 и белок за 25 минут."],
    "🐟", G.coral, "mediterranean", ["lunch", "dinner"], 2, 5, 20, 1, ["oven"],
    [["salmon", 300], ["broccoli", 400], ["lemon", 1], ["olive_oil", 10], ["garlic", 5], ["salt", 2], ["brown_rice", 120]],
    [
      s("Fierbe orezul brun.", "Отварите бурый рис.", 25),
      s("Așază somonul și broccoli în tavă, stropește cu ulei, lămâie, usturoi și sare.", "Выложите лосось и брокколи на противень, сбрызните маслом, лимоном, добавьте чеснок и соль."),
      s("Coace la 200°C.", "Запекайте при 200°C.", 18),
    ]),

  r("paste-ton", ["Paste integrale cu ton și roșii", "Цельнозерновая паста с тунцом"],
    ["Prânz rapid și proteic.", "Быстрый белковый обед."],
    "🍝", G.coral, "italian", ["lunch", "dinner"], 2, 5, 15, 1, ["stove"],
    [["pasta_wholegrain", 160], ["tuna_can", 160], ["canned_tomato", 400], ["garlic", 5], ["olive_oil", 10], ["parsley", 10], ["salt", 3]],
    [
      s("Fierbe pastele al dente.", "Отварите пасту до состояния al dente.", 10),
      s("Călește usturoiul în ulei, adaugă roșiile și fierbe sosul.", "Обжарьте чеснок, добавьте томаты и уварите соус.", 8),
      s("Adaugă tonul, amestecă cu pastele și presară pătrunjel.", "Добавьте тунец, смешайте с пастой и посыпьте петрушкой."),
    ]),

  r("risotto-ciuperci", ["Risotto cu ciuperci și parmezan", "Ризотто с грибами и пармезаном"],
    ["Cremos, fără smântână.", "Кремовое, без сливок."],
    "🍚", G.earth, "italian", ["lunch", "dinner"], 3, 10, 30, 2, ["stove"],
    [["rice", 240], ["mushrooms", 300], ["onion", 80], ["vegetable_broth", 900], ["parmesan", 40], ["butter", 15], ["olive_oil", 10], ["salt", 2]],
    [
      s("Călește ceapa și ciupercile în ulei.", "Обжарьте лук и грибы на масле.", 6),
      s("Adaugă orezul și prăjește-l 1 minut.", "Добавьте рис и обжарьте 1 минуту.", 1),
      s("Toarnă supa fierbinte câte un polonic, amestecând, până orezul e cremos.", "Подливайте горячий бульон по половнику, помешивая, пока рис не станет кремовым.", 20),
      s("Încorporează untul și parmezanul.", "Вмешайте масло и пармезан."),
    ]),

  r("shakshuka", ["Shakshuka", "Шакшука"],
    ["Ouă coapte în sos de roșii și ardei.", "Яйца, запечённые в соусе из томатов и перца."],
    "🍳", G.coral, "middle_eastern", ["breakfast", "dinner"], 2, 5, 20, 1, ["stove"],
    [["eggs", 4], ["canned_tomato", 400], ["bell_pepper", 150], ["onion", 80], ["garlic", 5], ["paprika", 3], ["cumin", 2], ["olive_oil", 10], ["wholegrain_bread", 80]],
    [
      s("Călește ceapa și ardeiul în ulei.", "Обжарьте лук и перец на масле.", 5),
      s("Adaugă roșiile, usturoiul și condimentele; fierbe sosul.", "Добавьте томаты, чеснок и специи; уварите соус.", 8),
      s("Fă 4 adâncituri, sparge ouăle și gătește acoperit.", "Сделайте 4 углубления, вбейте яйца и готовьте под крышкой.", 6),
    ]),

  r("cod-airfryer", ["Cod la air fryer cu legume", "Треска в аэрогриле с овощами"],
    ["Pește slab, crocant, fără prăjire în ulei.", "Нежирная хрустящая рыба без фритюра."],
    "🐟", G.blue, "mediterranean", ["lunch", "dinner"], 2, 5, 15, 1, ["airfryer"],
    [["cod", 350], ["zucchini", 250], ["bell_pepper", 150], ["olive_oil", 10], ["paprika", 2], ["lemon", 0.5], ["salt", 2]],
    [
      s("Condimentează peștele și legumele cu ulei, boia și sare.", "Приправьте рыбу и овощи маслом, паприкой и солью."),
      s("Gătește la air fryer, 190°C.", "Готовьте в аэрогриле при 190°C.", 14),
      s("Stropește cu lămâie la servire.", "При подаче сбрызните лимоном."),
    ]),

  r("pui-cuptor-legume", ["Piept de pui la cuptor cu legume", "Куриное филе в духовке с овощами"],
    ["Clasic high-protein pentru meal prep.", "Классика high-protein для meal prep."],
    "🍗", G.coral, "international", ["lunch", "dinner"], 4, 10, 30, 1, ["oven"],
    [["chicken_breast", 700], ["sweet_potato", 500], ["broccoli", 400], ["bell_pepper", 200], ["olive_oil", 20], ["paprika", 4], ["garlic", 8], ["salt", 4]],
    [
      s("Taie cartofii dulci și legumele; amestecă cu ulei și condimente.", "Нарежьте батат и овощи; перемешайте с маслом и специями."),
      s("Așază puiul deasupra și coace la 200°C.", "Выложите сверху курицу и запекайте при 200°C.", 30),
      s("Lasă puiul 5 minute să se odihnească, apoi feliază.", "Дайте курице отдохнуть 5 минут и нарежьте.", 5),
    ], { mealPrepFriendly: true }),

  r("caesar-light", ["Salată Caesar light cu pui", "Лёгкий салат «Цезарь» с курицей"],
    ["Dressing de iaurt în loc de maioneză.", "Йогуртовая заправка вместо майонеза."],
    "🥗", G.green, "international", ["lunch", "dinner"], 2, 10, 12, 1, ["stove"],
    [["chicken_breast", 250], ["lettuce", 200], ["parmesan", 20], ["greek_yogurt", 80], ["mustard", 5], ["garlic", 3], ["lemon", 0.5], ["wholegrain_bread", 60], ["olive_oil", 5]],
    [
      s("Gătește puiul la tigaie și feliază-l.", "Обжарьте курицу на сковороде и нарежьте.", 12),
      s("Amestecă iaurtul cu muștar, usturoi și lămâie pentru dressing.", "Смешайте йогурт с горчицей, чесноком и лимоном для заправки."),
      s("Rupe salata, adaugă puiul, crutoanele, parmezanul și dressingul.", "Порвите салат, добавьте курицу, сухарики, пармезан и заправку."),
    ]),

  r("gulas-vita", ["Gulaș de vită", "Гуляш из говядины"],
    ["Tocană densă, ideală pentru meal prep.", "Густое рагу, идеально для meal prep."],
    "🥘", G.coral, "international", ["lunch", "dinner"], 6, 20, 110, 2, ["stove", "multicooker"],
    [["beef", 900], ["onion", 300], ["bell_pepper", 200], ["potato", 600], ["tomato_paste", 60], ["paprika", 10], ["garlic", 10], ["sunflower_oil", 20], ["salt", 8]],
    [
      s("Rumenește carnea cuburi în ulei.", "Обжарьте мясо кубиками на масле.", 8),
      s("Adaugă ceapa, ardeiul, boiaua și pasta de tomate.", "Добавьте лук, перец, паприку и томатную пасту.", 5),
      s("Acoperă cu apă și fierbe la foc mic.", "Залейте водой и тушите на слабом огне.", 80),
      s("Adaugă cartofii și gătește până se înmoaie.", "Добавьте картофель и тушите до мягкости.", 25),
    ], { mealPrepFriendly: true }),

  // ---------------- Asiatice / vegane ----------------
  r("tofu-stirfry", ["Tofu stir-fry cu legume și orez", "Тофу стир-фрай с овощами и рисом"],
    ["Vegan, proteic, gata în 20 de minute.", "Веганское белковое блюдо за 20 минут."],
    "🥢", G.green, "asian", ["lunch", "dinner"], 2, 10, 15, 2, ["stove"],
    [["tofu", 300], ["broccoli", 200], ["bell_pepper", 150], ["carrot", 100], ["soy_sauce", 30], ["ginger", 10], ["garlic", 5], ["sunflower_oil", 15], ["rice", 140], ["sesame", 5]],
    [
      s("Fierbe orezul.", "Отварите рис.", 15),
      s("Prăjește tofu cuburi până devine auriu.", "Обжарьте тофу кубиками до золотистого цвета.", 6),
      s("Adaugă legumele, ghimbirul și usturoiul; sotează la foc mare.", "Добавьте овощи, имбирь и чеснок; жарьте на сильном огне.", 5),
      s("Stinge cu sos de soia și presară susan.", "Влейте соевый соус и посыпьте кунжутом."),
    ]),

  r("curry-linte", ["Curry de linte roșie cu lapte de cocos", "Карри из красной чечевицы"],
    ["Cremos, vegan și foarte ieftin.", "Кремовое, веганское и очень недорогое."],
    "🍛", G.warm, "asian", ["lunch", "dinner"], 4, 10, 25, 1, ["stove"],
    [["red_lentils", 250], ["coconut_milk", 200], ["canned_tomato", 400], ["onion", 120], ["garlic", 10], ["ginger", 10], ["curry", 8], ["sunflower_oil", 10], ["spinach", 100], ["salt", 4]],
    [
      s("Călește ceapa, usturoiul, ghimbirul și curry.", "Обжарьте лук, чеснок, имбирь и карри.", 4),
      s("Adaugă linte, roșiile, laptele de cocos și 500 ml apă; fierbe.", "Добавьте чечевицу, томаты, кокосовое молоко и 500 мл воды; варите.", 20),
      s("Încorporează spanacul la final.", "В конце вмешайте шпинат.", 1),
    ], { mealPrepFriendly: true }),

  r("noodles-creveti", ["Tăiței de orez cu creveți", "Рисовая лапша с креветками"],
    ["Rapid, ușor, în stil asiatic.", "Быстро и легко, в азиатском стиле."],
    "🍜", G.blue, "asian", ["lunch", "dinner"], 2, 10, 10, 2, ["stove"],
    [["rice_noodles", 150], ["shrimp", 250], ["bell_pepper", 100], ["carrot", 80], ["green_onion", 20], ["soy_sauce", 25], ["garlic", 5], ["ginger", 5], ["sunflower_oil", 10]],
    [
      s("Hidratează tăițeii în apă fierbinte.", "Залейте лапшу горячей водой.", 5),
      s("Sotează creveții cu usturoi și ghimbir.", "Обжарьте креветки с чесноком и имбирём.", 3),
      s("Adaugă legumele, tăițeii și sosul de soia; amestecă 2 minute.", "Добавьте овощи, лапшу и соевый соус; жарьте 2 минуты.", 2),
    ]),

  r("quinoa-bowl", ["Bol cu quinoa, năut și legume coapte", "Боул с киноа, нутом и печёными овощами"],
    ["Bol vegan complet, bun și rece.", "Полноценный веганский боул, хорош и холодным."],
    "🥙", G.green, "mediterranean", ["lunch", "dinner"], 2, 10, 25, 1, ["oven", "stove"],
    [["quinoa", 140], ["chickpeas", 240], ["zucchini", 200], ["bell_pepper", 150], ["spinach", 60], ["tahini", 25], ["lemon", 0.5], ["olive_oil", 10], ["cumin", 2], ["salt", 2]],
    [
      s("Fierbe quinoa în 280 ml apă.", "Сварите киноа в 280 мл воды.", 15),
      s("Coace legumele și năutul cu ulei și chimion la 210°C.", "Запеките овощи и нут с маслом и зирой при 210°C.", 22),
      s("Asamblează bolul cu spanac și dressing de tahini cu lămâie.", "Соберите боул со шпинатом и заправкой из тахини с лимоном."),
    ], { mealPrepFriendly: true }),

  r("macrou-cartofi", ["Macrou la cuptor cu cartofi noi", "Скумбрия в духовке с картофелем"],
    ["Pește gras accesibil, bogat în omega-3.", "Доступная жирная рыба, богатая омега-3."],
    "🐟", G.blue, "moldovan", ["lunch", "dinner"], 2, 10, 30, 1, ["oven"],
    [["mackerel", 400], ["potato", 400], ["lemon", 0.5], ["dill", 10], ["sunflower_oil", 10], ["salt", 3], ["cucumber", 200]],
    [
      s("Curăță macroul, sărează-l și pune lămâie și mărar în interior.", "Очистите скумбрию, посолите и вложите лимон и укроп."),
      s("Așază cartofii feliați în tavă și peștele deasupra.", "Выложите на противень нарезанный картофель, сверху рыбу."),
      s("Coace la 200°C.", "Запекайте при 200°C.", 30),
    ]),

  r("chiftele-naut-airfryer", ["Chiftele de năut la air fryer (falafel)", "Фалафель в аэрогриле"],
    ["Falafel vegan, fără prăjire în baie de ulei.", "Веганский фалафель без фритюра."],
    "🧆", G.earth, "middle_eastern", ["lunch", "snack", "dinner"], 3, 15, 15, 2, ["airfryer", "blender"],
    [["chickpeas", 480], ["onion", 60], ["garlic", 8], ["parsley", 20], ["cumin", 3], ["flour", 30], ["olive_oil", 10], ["lavash", 150], ["cucumber", 150], ["greek_yogurt", 100]],
    [
      s("Pasează năutul cu ceapa, usturoiul, pătrunjelul, chimionul și făina.", "Измельчите нут с луком, чесноком, петрушкой, зирой и мукой."),
      s("Formează chiftele și unge-le ușor cu ulei.", "Сформируйте шарики и слегка смажьте маслом."),
      s("Gătește la air fryer la 190°C, întorcându-le o dată.", "Готовьте в аэрогриле при 190°C, перевернув один раз.", 14),
      s("Servește în lavaș cu castraveți și sos de iaurt.", "Подавайте в лаваше с огурцами и йогуртовым соусом."),
    ]),

  r("chec-cacao-fara-zahar", ["Brioșe cu banană și cacao, fără zahăr", "Банановые маффины с какао без сахара"],
    ["Desert fără zahăr adăugat.", "Десерт без добавленного сахара."],
    "🧁", G.earth, "international", ["snack", "breakfast"], 6, 10, 22, 1, ["oven", "blender"],
    [["banana", 300], ["oats", 150], ["eggs", 2], ["cocoa", 20], ["baking_powder", 6], ["walnuts", 30], ["milk", 80]],
    [
      s("Mixează bananele, ouăle, laptele, ovăzul, cacao și praful de copt.", "Смешайте бананы, яйца, молоко, овсянку, какао и разрыхлитель."),
      s("Adaugă nucile tocate și împarte în 6 forme.", "Добавьте рубленые орехи и разложите по 6 формочкам."),
      s("Coace la 180°C.", "Выпекайте при 180°C.", 22),
    ], { mealPrepFriendly: true }),
];

/** Exemplu de video cu capitole sincronizate (URL configurat de admin). */
export const DEMO_VIDEO_NOTE =
  "Rețetele demo nu au video atașat. Din panoul Admin poți adăuga un link YouTube/Vimeo sau încărca un fișier, cu capitole pentru fiecare pas.";
