"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, GraduationCap, LogIn, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { DEMO_ACCOUNTS, useSession } from "@/lib/session";
import { ROLE_LABELS_UZ } from "@/types/demo";
import { Avatar, Button, Input } from "@/components/ui/core";

const ROLE_HINTS: Record<string, string> = {
  DIRECTOR: "Maktab holati 0 bosishda",
  ADMIN: "Import, sozlamalar, boshqaruv",
  CLASS_TEACHER: "10-A: jurnal, davomat, baholar",
  TEACHER: "Ingliz tili: sinflar va jurnal",
  PARENT: "Jasur (10-A) va Bekzod (7-A)",
  STUDENT: "Baholar, uy vazifalari, jadval",
};

export default function LoginPage() {
  const router = useRouter();
  const login = useSession((s) => s.login);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const enter = (id: string) => {
    const acc = DEMO_ACCOUNTS.find((a) => a.id === id);
    if (!acc) return;
    login(acc);
    toast.success(`${acc.name} sifatida kirdingiz`);
    router.push("/dashboard");
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const acc =
      DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.trim().toLowerCase()) ??
      (email.trim().toLowerCase() === "director@demo.school.uz" ? DEMO_ACCOUNTS[0] : undefined);
    if (!acc) {
      toast.error("Demo email noto'g'ri. Pastdagi hisoblardan birini tanlang.");
      return;
    }
    login(acc);
    toast.success(`${acc.name} sifatida kirdingiz`);
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Bosh sahifa
        </Link>

        <div className="mt-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
            <GraduationCap className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            {t("login.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t("login.subtitle")}</p>
        </div>

        {/* Demo hisoblar */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.id}
              onClick={() => enter(acc.id)}
              className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
            >
              <Avatar name={acc.name} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {acc.name}
                </span>
                <span className="block text-xs font-medium text-indigo-600">
                  {ROLE_LABELS_UZ[acc.role]}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                  {ROLE_HINTS[acc.role]}
                </span>
              </span>
              <LogIn className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-indigo-500" />
            </button>
          ))}
        </div>

        {/* Email forma (demo: parol har qanday) */}
        <div className="mx-auto mt-8 max-w-md">
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="mb-4 text-center text-xs font-medium text-slate-400">
              Yoki email bilan (demo: parol xohlagan narsa bo'lishi mumkin)
            </p>
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="director@demo.school.uz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
              <Input
                type="password"
                placeholder={t("login.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <Button type="submit" className="w-full">
                {t("login.enter")}
              </Button>
            </div>
          </form>
          <p className="mt-4 flex items-start gap-2 text-center text-xs leading-relaxed text-slate-400">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            {t("login.demoNote")}
          </p>
        </div>
      </div>
    </div>
  );
}
