import { create } from "zustand";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Profile, UserRole } from "@/types";

interface AuthStore {
  user: Profile | null;
  loading: boolean;
  error: string | null;
  login: (id: string, password: string) => Promise<{ success: boolean; role?: UserRole }>;
  logout: () => void;
  setUser: (user: Profile | null) => void;
}

const allowedRoles = new Set<UserRole>(["student", "teacher", "director", "admin"]);

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  loading: false,
  error: null,

  login: async (id, password) => {
    if (!id.trim() || !password) {
      const error = "ID va parolni kiriting.";
      set({ error, loading: false });
      return { success: false };
    }
    if (!isSupabaseConfigured) {
      const error = "Supabase sozlanmagan. .env.local fayliga loyiha URL va anon key kiriting.";
      set({ error, loading: false });
      return { success: false };
    }

    set({ loading: true, error: null });
    try {
      // Legacy ID/password sign-in is retained until the school migrates to Supabase Auth.
      // Only the fields needed for sign-in are requested; profile pages never fetch passwords.
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, password")
        .eq("id", id.trim().toUpperCase())
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        const message = "Kiritilgan ID tizimda topilmadi.";
        set({ loading: false, error: message });
        return { success: false };
      }
      if (typeof data.password !== "string" || data.password !== password) {
        const message = "Parol noto'g'ri. Qaytadan urinib ko'ring.";
        set({ loading: false, error: message });
        return { success: false };
      }

      const role = String(data.role ?? "").trim().toLowerCase() as UserRole;
      if (!allowedRoles.has(role)) {
        const message = "Ushbu akkaunt uchun saytga kirish huquqi yoqilmagan.";
        set({ loading: false, error: message });
        return { success: false };
      }

      const user: Profile = {
        id: data.id,
        full_name: data.full_name || "Foydalanuvchi",
        role,
      };
      set({ user, loading: false, error: null });
      return { success: true, role };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bazaga ulanib bo'lmadi. Internet yoki Supabase sozlamalarini tekshiring.";
      set({ loading: false, error: message });
      return { success: false };
    }
  },

  logout: () => set({ user: null, error: null, loading: false }),
  setUser: (user) => set({ user }),
}));
