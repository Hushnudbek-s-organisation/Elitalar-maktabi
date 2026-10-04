import type { UserRole } from "@/types";

export const SESSION_KEYS = ["user_id", "user_role", "student_id", "teacher_id", "user_name"] as const;

export interface StoredSession {
  id: string | null;
  role: UserRole | null;
}

export function getStoredSession(): StoredSession {
  if (typeof window === "undefined") return { id: null, role: null };
  const id = localStorage.getItem("user_id") || localStorage.getItem("student_id") || localStorage.getItem("teacher_id");
  const rawRole = localStorage.getItem("user_role")?.trim().toLowerCase();
  const role = rawRole === "moderator" ? "teacher" : rawRole;
  return { id, role: role as UserRole | null };
}

export function storeSession(id: string, role: UserRole, fullName?: string) {
  localStorage.setItem("user_id", id);
  localStorage.setItem("user_role", role === "admin" ? "director" : role);
  localStorage.setItem("user_name", fullName ?? "");
  if (role === "student") localStorage.setItem("student_id", id);
  else localStorage.removeItem("student_id");
  if (role === "teacher") localStorage.setItem("teacher_id", id);
  else localStorage.removeItem("teacher_id");
}

export function clearSession() {
  SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
}

export function getDashboardPath(role: UserRole): string | null {
  if (role === "student") return "/student/dashboard";
  if (role === "teacher") return "/teacher/dashboard";
  if (role === "director" || role === "admin") return "/director/dashboard";
  return null;
}
