"use client";
/**
 * Client Supabase (opțional). Dacă variabilele de mediu nu sunt setate, aplicația
 * rulează în „mod demo” cu date locale. Schema bazei de date: supabase/schema.sql.
 *
 * Autentificare suportată: email (magic link), Google OAuth, telefon (OTP prin SMS —
 * necesită un furnizor SMS configurat în Supabase, ex. Twilio/MessageBird).
 */
import { absoluteUrl } from "./paths";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);
export const supabase: SupabaseClient | null = isSupabaseConfigured ? createClient(url!, key!) : null;

export async function signInWithEmail(email: string) {
  if (!supabase) throw new Error("not_configured");
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: absoluteUrl("/") } });
  if (error) throw error;
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error("not_configured");
  const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: absoluteUrl("/") } });
  if (error) throw error;
}

/** Numerele din Moldova: +373 XX XXX XXX */
export function normalizeMdPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("373")) return `+${digits}`;
  if (digits.startsWith("0")) return `+373${digits.slice(1)}`;
  return `+373${digits}`;
}

export async function sendPhoneOtp(phone: string) {
  if (!supabase) throw new Error("not_configured");
  const { error } = await supabase.auth.signInWithOtp({ phone: normalizeMdPhone(phone) });
  if (error) throw error;
}

export async function verifyPhoneOtp(phone: string, token: string) {
  if (!supabase) throw new Error("not_configured");
  const { data, error } = await supabase.auth.verifyOtp({ phone: normalizeMdPhone(phone), token, type: "sms" });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase?.auth.signOut();
}
