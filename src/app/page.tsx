"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  GraduationCap,
  Megaphone,
  MessageSquareHeart,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { t } from "@/lib/i18n";

const FEATURES = [
  {
    icon: BookOpenCheck,
    title: "Bir teginish bilan davomat",
    text: "30 o'quvchini 10 soniyada belgilang — «HAMMASI KELDI» tugmasi bilan. Jurnal oflaynda ham ishlaydi.",
  },
  {
    icon: Search,
    title: "3 soniyada topish",
    text: "Ctrl+K global qidiruv: o'quvchi, o'qituvchi, sinf — bir joyda. Boshqaruv harakati 3 bosishdan oshmaydi.",
  },
  {
    icon: CalendarDays,
    title: "Aqlli dars jadvali",
    text: "Konfliktlarni o'zi topadigan jadval generatori. Har bir muvaffaqiyatsizlik sababi bilan izohlanadi.",
  },
  {
    icon: Megaphone,
    title: "Telegram birinchi",
    text: "Ota-onalarga xabarlar Telegram va push orqali, yetkazilganlik holati va qayta urinish bilan.",
  },
  {
    icon: ShieldCheck,
    title: "Xavfsizlik birinchi",
    text: "Har bir jadval RLS bilan himoyalangan. O'qituvchi faqat o'z sinflarini, ota-ona faqat farzandini ko'radi.",
  },
  {
    icon: MessageSquareHeart,
    title: "Ogohlantirishlar sabab bilan",
    text: "Risk dvigateli har bir ogohlantirishni izohlaydi: nechta sababsiz qoldirildi, baho qanday tushdi.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold text-slate-900">SchoolOS</span>
          </div>
          <Link
            href="/login"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition-colors hover:bg-indigo-700"
          >
            {t("login.enter")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,#eef2ff,transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            <Sparkles className="h-3.5 w-3.5" />
            O'zbekiston maktablari uchun
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-6xl">
            Maktab boshqaruvining{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              yangi davri
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-500 sm:text-lg">
            Jurnal, davomat, baholar, dars jadvali va ota-onalar bilan aloqa — barchasi bir
            tizimda. Tez, tushunarli va xavfsiz. eMaktab'dagi barcha kerakli funksiyalar —
            lekin oddiylashtirilgan va avtomatlashtirilgan.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 text-base font-semibold text-white shadow-lg shadow-indigo-600/25 transition-colors hover:bg-indigo-700 sm:w-auto"
            >
              Demoni ko'rish
              <ArrowRight className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-5 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-500" /> 34 o'quvchi
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-sky-500" /> 6 rol
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-100 bg-slate-50/60 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Nega SchoolOS?
            </h2>
            <p className="mt-3 text-slate-500">
              Har bir funksiya real maktab ehtiyojidan chiqqan — ortiqcha murakkablik yo'q.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 px-6 py-14 text-center shadow-xl shadow-indigo-600/20 sm:px-12">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Maktabingizni bugun sinab ko'ring
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-indigo-100 sm:text-base">
              Demo rejimda barcha rollarni ko'rishingiz mumkin: direktor, o'qituvchi, sinf
              rahbari, ota-ona va o'quvchi.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-8 text-base font-semibold text-indigo-700 shadow-lg transition-transform hover:scale-[1.02]"
            >
              Demo hisoblar
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8">
        <p className="text-center text-xs text-slate-400">
          SchoolOS — O'zbekiston maktablari uchun boshqaruv platformasi · Demo rejim
        </p>
      </footer>
    </div>
  );
}
