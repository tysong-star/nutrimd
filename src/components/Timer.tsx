"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { cx } from "./ui";

function beep() {
  try {
    const ctx = new AudioContext();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.25, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.3);
    });
  } catch { /* fără sunet */ }
  navigator.vibrate?.([300, 150, 300]);
}

/** Cronometru integrat pentru un pas de rețetă. */
export function StepTimer({ minutes, big }: { minutes: number; big?: boolean }) {
  const { t } = useT();
  const [left, setLeft] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const endRef = useRef(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const l = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) { setRunning(false); beep(); }
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  const start = () => { endRef.current = Date.now() + (left && left > 0 ? left : minutes * 60) * 1000; setRunning(true); };
  const mm = left !== null ? `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}` : null;
  const done = left === 0;
  return (
    <div className={cx("inline-flex items-center gap-2 rounded-2xl", big ? "text-2xl" : "text-sm")} aria-live="polite">
      {mm && <span className={cx("font-mono font-bold tabular-nums", done && "text-coral-600")}>{done ? `⏰ ${t("rec.timerDone")}` : `⏱ ${mm}`}</span>}
      {!running ? (
        <button onClick={start} className={cx("rounded-xl bg-amber-100 font-semibold text-amber-900 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-100", big ? "min-h-[64px] px-6" : "min-h-[40px] px-3")}>
          ▶ {left && left > 0 ? "" : t("rec.startTimer", { n: minutes })}
        </button>
      ) : (
        <button onClick={() => setRunning(false)} className={cx("rounded-xl bg-slate-200 font-semibold dark:bg-slate-700", big ? "min-h-[64px] px-6" : "min-h-[40px] px-3")}>⏸</button>
      )}
      {left !== null && !running && <button onClick={() => setLeft(null)} className={cx("rounded-xl px-3 font-semibold text-slate-500", big ? "min-h-[64px]" : "min-h-[40px]")} aria-label="reset">↺</button>}
    </div>
  );
}
