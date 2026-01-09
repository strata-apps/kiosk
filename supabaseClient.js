// supabaseClient.js
import { SUPABASE_URL, SUPABASE_ANON_KEY, KIOSK_AUTH } from "./config.js";

export async function initSupabase() {
  if (!window.supabase) throw new Error("Supabase UMD not loaded");

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.supabase = client;

  // ---- Kiosk auto-auth (prevents RLS from hiding everything) ----
  if (KIOSK_AUTH?.enabled) {
    const { data: sessionData } = await client.auth.getSession();

    if (!sessionData?.session) {
      const { error } = await client.auth.signInWithPassword({
        email: KIOSK_AUTH.email,
        password: KIOSK_AUTH.password,
      });
      if (error) {
        console.error("[kiosk] auth failed:", error);
        // Don’t throw—let screens show a helpful message
      } else {
        console.log("[kiosk] signed in as kiosk user");
      }
    } else {
      console.log("[kiosk] existing session found");
    }
  }

  return client;
}

export function sup() {
  return window.supabase;
}
