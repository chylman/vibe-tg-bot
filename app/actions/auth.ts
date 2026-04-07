"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function signIn(prevState: any, formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, message: error.message };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await getSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function sendReset(prevState: any, formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const supabase = await getSupabaseServer();
  const hdrs = await headers();
  const origin = hdrs.get("origin") || "";
  const redirectTo = `${origin}/auth/callback`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true, message: "Письмо для восстановления отправлено" };
}
