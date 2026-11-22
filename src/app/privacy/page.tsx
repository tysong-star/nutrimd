"use client";
import { useT } from "@/lib/i18n";
import { Card } from "@/components/ui";

/**
 * Politica de confidențialitate — șablon. Trebuie revizuit de un jurist înainte de lansare
 * (Legea nr. 133/2011 privind protecția datelor cu caracter personal a Republicii Moldova
 * și actele care o modifică/înlocuiesc, precum și GDPR pentru utilizatorii din UE).
 */
const RO = [
  ["Cine suntem", "Operatorul datelor este [Denumirea companiei, IDNO, adresa, email de contact]. Datele de contact ale responsabilului cu protecția datelor: [email]."],
  ["Ce date colectăm", "Date de cont (email, telefon), date de profil (vârstă, sex, înălțime, greutate, nivel de activitate, obiectiv), preferințe alimentare, alergii și intoleranțe, jurnalul alimentar, buget și cheltuieli, locația aproximativă (doar dacă o permiți, pentru magazinele apropiate)."],
  ["Date privind sănătatea", "Greutatea, alergiile, sarcina/alăptarea sunt date sensibile. Le prelucrăm doar pe baza consimțământului tău explicit, exclusiv pentru a calcula necesarul nutrițional și a genera planul de mese."],
  ["Unde sunt stocate", "În modul demo, datele rămân doar în browserul tău (localStorage). Cu cont, datele sunt stocate într-o bază de date PostgreSQL (Supabase) cu acces restricționat per utilizator (Row Level Security)."],
  ["Cât timp le păstrăm", "Cât timp contul este activ. La ștergerea contului, datele sunt șterse în termen de 30 de zile, cu excepția celor pe care legea ne obligă să le păstrăm."],
  ["Drepturile tale", "Acces, rectificare, ștergere, restricționare, portabilitate, opoziție și retragerea consimțământului oricând. Din Profil → „Datele mele” poți descărca sau șterge toate datele. Poți depune plângere la Centrul Național pentru Protecția Datelor cu Caracter Personal (datepersonale.md)."],
  ["Terți", "Nu vindem datele. Furnizori: găzduire, autentificare (Supabase, Google), SMS (pentru cod de verificare). Partajarea listei de cumpărături se face doar la inițiativa ta."],
  ["Disclaimer medical", "Aplicația oferă informații generale și nu înlocuiește consultul unui medic sau nutriționist."],
];
const RU = [
  ["Кто мы", "Оператор данных — [Название компании, IDNO, адрес, контактный email]. Контакт ответственного за защиту данных: [email]."],
  ["Какие данные мы собираем", "Данные аккаунта (email, телефон), профиль (возраст, пол, рост, вес, активность, цель), пищевые предпочтения, аллергии и непереносимости, дневник питания, бюджет и расходы, приблизительное местоположение (только с вашего разрешения — для поиска ближайших магазинов)."],
  ["Данные о здоровье", "Вес, аллергии, беременность/кормление — чувствительные данные. Мы обрабатываем их только на основании вашего явного согласия и только для расчёта нормы и составления плана питания."],
  ["Где хранятся данные", "В демо-режиме данные остаются только в вашем браузере (localStorage). С аккаунтом — в базе PostgreSQL (Supabase) с доступом только для владельца (Row Level Security)."],
  ["Срок хранения", "Пока аккаунт активен. После удаления аккаунта данные удаляются в течение 30 дней, кроме данных, которые мы обязаны хранить по закону."],
  ["Ваши права", "Доступ, исправление, удаление, ограничение, переносимость, возражение и отзыв согласия в любой момент. В Профиле → «Мои данные» можно скачать или удалить все данные. Жалобу можно подать в Национальный центр по защите персональных данных (datepersonale.md)."],
  ["Третьи лица", "Мы не продаём данные. Поставщики: хостинг, аутентификация (Supabase, Google), SMS (код подтверждения). Список покупок передаётся только по вашей инициативе."],
  ["Медицинский дисклеймер", "Приложение предоставляет общую информацию и не заменяет консультацию врача или диетолога."],
];

export default function Privacy() {
  const { t, lang } = useT();
  const items = lang === "ro" ? RO : RU;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-extrabold">{t("prof.privacy")}</h1>
      <p className="text-sm text-slate-500">{lang === "ro" ? "Șablon — de revizuit juridic înainte de lansare. Ultima actualizare: 22.11.2026" : "Шаблон — требует юридической проверки перед запуском. Обновлено: 22.11.2026"}</p>
      {items.map(([h, p]) => (
        <Card key={h}><h2 className="mb-1 font-bold">{h}</h2><p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{p}</p></Card>
      ))}
    </div>
  );
}
