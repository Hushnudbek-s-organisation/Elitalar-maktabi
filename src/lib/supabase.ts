import { createClient } from "@supabase/supabase-js";

const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const configuredAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(configuredUrl && configuredAnonKey);

// Keep imports safe in builds and local previews without environment variables. Pages
// check `isSupabaseConfigured` and show a useful setup message before making requests.
export const supabase = createClient(
  configuredUrl || "https://missing-project.supabase.co",
  configuredAnonKey || "missing-anon-key",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);
