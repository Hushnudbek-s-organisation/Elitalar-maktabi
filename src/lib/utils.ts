import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh"] as const;
export type WeekdayCode = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<WeekdayCode, string> = {
  Du: "Dushanba",
  Se: "Seshanba",
  Ch: "Chorshanba",
  Pa: "Payshanba",
  Ju: "Juma",
  Sh: "Shanba",
};

export const LESSON_TIMES = [
  "08:00–08:45",
  "08:50–09:35",
  "09:45–10:30",
  "10:40–11:25",
  "11:35–12:20",
  "12:30–13:15",
] as const;

const DAY_ALIASES: Record<string, WeekdayCode> = {
  du: "Du",
  dushanba: "Du",
  monday: "Du",
  se: "Se",
  seshanba: "Se",
  tuesday: "Se",
  ch: "Ch",
  chorshanba: "Ch",
  wednesday: "Ch",
  pa: "Pa",
  payshanba: "Pa",
  thursday: "Pa",
  ju: "Ju",
  juma: "Ju",
  friday: "Ju",
  sh: "Sh",
  shanba: "Sh",
  saturday: "Sh",
};

export function cn(...values: ClassValue[]) {
  return twMerge(clsx(values));
}

/** Accepts both the short codes used by the schedule generator and Uzbek day names. */
export function normalizeDayOfWeek(value?: string | null): WeekdayCode | null {
  if (!value) return null;
  return DAY_ALIASES[value.trim().toLocaleLowerCase("uz-UZ")] ?? null;
}

export function getWeekdayCode(date = new Date()): WeekdayCode | null {
  const day = date.getDay();
  return day === 0 ? null : WEEKDAYS[day - 1] ?? null;
}

export function getNextWeekdayCode(date = new Date()): WeekdayCode {
  const day = date.getDay();
  // Sunday and Saturday both roll forward to Monday for the next school day.
  if (day === 0 || day === 6) return "Du";
  return WEEKDAYS[day] ?? "Du";
}

export function formatPP(value?: number | null): string {
  return new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(value ?? 0);
}

export function formatDateUz(value?: string | null): string {
  if (!value) return "—";
  const date = parseDate(value);
  if (!date) return value;
  return new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  const dotted = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotted) {
    return new Date(Number(dotted[3]), Number(dotted[2]) - 1, Number(dotted[1]));
  }
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toISODate(value: string): string {
  const date = parseDate(value);
  if (!date) return value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDatesInRange(start: string, end: string): string[] {
  const first = parseDate(start);
  const last = parseDate(end);
  if (!first || !last || first > last) return [];

  const dates: string[] = [];
  const cursor = new Date(first.getFullYear(), first.getMonth(), first.getDate());
  const final = new Date(last.getFullYear(), last.getMonth(), last.getDate());
  while (cursor <= final) {
    dates.push(toISODate(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function getErrorMessage(error: unknown, fallback = "Kutilmagan xatolik yuz berdi."): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}
