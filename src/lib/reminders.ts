"use client";
/**
 * Remindere locale (mese, apă, cumpărături) cât timp aplicația e deschisă / instalată ca PWA.
 * Notificările push reale, cu aplicația închisă, necesită Web Push pe server
 * (ex. Supabase Edge Function + VAPID) — vezi README.
 */
import { asset } from "./paths";
import { useEffect } from "react";
import { useApp } from "./store";
import { translate } from "./i18n";

async function notify(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg) reg.showNotification(title, { body, icon: asset("/icon.svg"), badge: asset("/icon.svg") });
  else new Notification(title, { body, icon: asset("/icon.svg") });
}

export function useReminders() {
  useEffect(() => {
    const fired = new Set<string>();
    const tick = () => {
      const { reminders, lang } = useApp.getState();
      if (!reminders.enabled) return;
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const day = now.toDateString();
      for (const [slot, time] of Object.entries(reminders.times)) {
        const key = `${day}-${slot}`;
        if (time === hhmm && !fired.has(key)) {
          fired.add(key);
          notify("NutriMD 🍽", translate(lang, `slot.${slot}` as Parameters<typeof translate>[1]));
        }
      }
      if (reminders.water && now.getMinutes() === 0 && now.getHours() % 2 === 0 && now.getHours() >= 8 && now.getHours() <= 22 && !fired.has(`${day}-w${now.getHours()}`)) {
        fired.add(`${day}-w${now.getHours()}`);
        notify("NutriMD 💧", translate(lang, "home.addWater"));
      }
      if (reminders.shoppingDay !== null && now.getDay() === reminders.shoppingDay && hhmm === "10:00" && !fired.has(`${day}-shop`)) {
        fired.add(`${day}-shop`);
        notify("NutriMD 🛒", translate(lang, "shop.title"));
      }
    };
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, []);
}
