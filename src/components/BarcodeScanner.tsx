"use client";
/**
 * Scanare cod de bare cu BarcodeDetector API (Chrome/Android, Safari 17+ parțial).
 * Dacă API-ul lipsește, rămâne introducerea manuală a codului EAN.
 */
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { Button, Input } from "./ui";

declare global {
  interface Window { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }
}

export function BarcodeScanner({ onCode }: { onCode: (code: string) => void }) {
  const { t } = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const supported = typeof window !== "undefined" && !!window.BarcodeDetector;

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let stop = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = new window.BarcodeDetector!({ formats: ["ean_13", "ean_8", "upc_a"] });
        const loop = async () => {
          if (stop || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes[0]) { onCode(codes[0].rawValue); setActive(false); return; }
          } catch { /* cadru ignorat */ }
          setTimeout(loop, 300);
        };
        loop();
      } catch (e) {
        setError((e as Error).message);
        setActive(false);
      }
    })();
    return () => { stop = true; stream?.getTracks().forEach((tr) => tr.stop()); };
  }, [active, onCode]);

  return (
    <div className="space-y-3">
      {supported ? (
        active ? (
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} className="h-56 w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 bg-red-500" />
            <Button size="sm" variant="secondary" className="absolute bottom-2 right-2" onClick={() => setActive(false)}>{t("common.close")}</Button>
          </div>
        ) : <Button onClick={() => setActive(true)}>📷 {t("prog.scan")}</Button>
      ) : <p className="text-sm text-slate-500">{t("prog.scanUnsupported")}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (manual.trim()) onCode(manual.trim()); }}>
        <Input inputMode="numeric" placeholder={t("prog.barcode")} value={manual} onChange={(e) => setManual(e.target.value)} aria-label={t("prog.barcode")} />
        <Button type="submit" variant="secondary">OK</Button>
      </form>
    </div>
  );
}
