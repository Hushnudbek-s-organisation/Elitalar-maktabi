import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...values: ClassValue[]) {
  return twMerge(clsx(values));
}

export const WEEKDAY_NAMES_UZ = [
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
] as const;

export const WEEKDAY_SHORT_UZ = ["Du", "Se", "Ch", "Pa", "Ju"] as const;

export const LESSON_TIMES = [
  "08:00–08:45",
  "08:50–09:35",
  "09:45–10:30",
  "10:40–11:25",
  "11:35–12:20",
  "12:30–13:15",
] as const;

/** Bugungi hafta kuni (1 = dushanba ... 5 = juma, 6/7 = dam olish). */
export function todayDay(): number {
  const d = new Date().getDay(); // 0 = yakshanba
  return d === 0 ? 7 : d;
}

export function isSchoolDay(day: number): boolean {
  return day >= 1 && day <= 5;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-teal-500",
  "bg-orange-500",
];

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
}

export function formatDateUz(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "numeric",
    month: "long",
  }).format(d);
}

export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function pct(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}
