"use client";

// ============================================================================
// SchoolOS — demo sessiya (zustand + localStorage).
// Supabase Auth ulanganda: replaceSession() real JWT profil bilan ishlaydi.
// ============================================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@/types/demo";

export interface DemoAccount {
  id: string;
  name: string;
  role: Role;
  email: string;
  teacherId?: string; // o'qituvchi uchun
  homeroomClassId?: string; // sinf rahbari uchun
  studentId?: string; // o'quvchi uchun
  childStudentIds?: string[]; // ota-ona uchun
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: "director",
    name: "Abdullayev Rustam Ismoilovich",
    role: "DIRECTOR",
    email: "director@demo.school.uz",
  },
  {
    id: "admin",
    name: "Xolmatova Nodira Islomovna",
    role: "ADMIN",
    email: "admin@demo.school.uz",
  },
  {
    id: "hakimov",
    name: "Hakimov Hushnudbek Alisherovich",
    role: "CLASS_TEACHER",
    email: "hakimov@demo.school.uz",
    teacherId: "t1",
    homeroomClassId: "c10a",
  },
  {
    id: "karimova",
    name: "Karimova Dilnoza Anvarovna",
    role: "TEACHER",
    email: "karimova@demo.school.uz",
    teacherId: "t2",
  },
  {
    id: "parent1",
    name: "Olimova Nilufar Anvarovna",
    role: "PARENT",
    email: "parent1@demo.school.uz",
    childStudentIds: ["s01", "s25"],
  },
  {
    id: "student1",
    name: "Olimov Jasur Alisherovich",
    role: "STUDENT",
    email: "student1@demo.school.uz",
    studentId: "s01",
  },
];

interface SessionState {
  account: DemoAccount | null;
  login: (account: DemoAccount) => void;
  logout: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      account: null,
      login: (account) => set({ account }),
      logout: () => set({ account: null }),
    }),
    { name: "schoolos-demo-session" },
  ),
);

export const isStaff = (role: Role): boolean =>
  role === "DIRECTOR" || role === "ADMIN" || role === "CLASS_TEACHER" || role === "TEACHER";

export const isAdmin = (role: Role): boolean =>
  role === "DIRECTOR" || role === "ADMIN";
