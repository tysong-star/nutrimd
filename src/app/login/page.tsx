"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { useApp } from "@/lib/store";
import { Button, Card, Field, Input } from "@/components/ui";
import { isSupabaseConfigured, sendPhoneOtp, signInWithEmail, signInWithGoogle, supabase, verifyPhoneOtp } from "@/lib/supabase";

export default function LoginPage() {
  const { t } = useT();
  const router = useRouter();
  const set = useApp((s) => s.set);
  const onboarded = useApp((s) => s.profile.onboarded);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Sesiunea Supabase -> starea aplicației
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        set({ auth: { mode: "supabase", email: session.user.email ?? undefined, phone: session.user.phone ?? undefined } });
        router.push(onboarded ? "/" : "/onboarding");
      }
    });
    return () => data.subscription.unsubscribe();
  }, [set, router, onboarded]);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true); setMsg(null);
    try { await fn(); if (ok) setMsg(ok); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-md space-y-4 pt-4">
      <h1 className="text-2xl font-extrabold">{t("auth.title")}</h1>
      {!isSupabaseConfigured && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">{t("auth.notConfigured")}</p>}
      <Card className="space-y-4">
        <Button variant="secondary" className="w-full" disabled={!isSupabaseConfigured || busy} onClick={() => run(signInWithGoogle)}>
          <span aria-hidden>🟢</span> {t("auth.google")}
        </Button>
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); run(() => signInWithEmail(email), t("auth.checkEmail")); }}>
          <Field label={t("auth.email")}><Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Button type="submit" className="w-full" disabled={!isSupabaseConfigured || busy}>{t("auth.sendLink")}</Button>
        </form>
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); run(codeSent ? () => verifyPhoneOtp(phone, code) : async () => { await sendPhoneOtp(phone); setCodeSent(true); }); }}>
          <Field label={t("auth.phone")}><Input type="tel" autoComplete="tel" placeholder="+373 69 123 456" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          {codeSent && <Field label={t("auth.code")}><Input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} /></Field>}
          <Button type="submit" variant="secondary" className="w-full" disabled={!isSupabaseConfigured || busy}>{codeSent ? t("auth.verify") : t("auth.sendCode")}</Button>
        </form>
        {msg && <p className="text-sm font-medium text-brand-700 dark:text-brand-300" role="status">{msg}</p>}
      </Card>
      <Button variant="ghost" className="w-full" onClick={() => router.push(onboarded ? "/" : "/onboarding")}>{t("auth.guest")}</Button>
    </div>
  );
}
