"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck, CalendarDays, ClipboardList, Loader2, Search } from "lucide-react";
import { getStoredSession } from "@/lib/session";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { formatDateUz } from "@/lib/utils";
import type { Homework, Profile } from "@/types";

export default function EducationPage() {
  const router = useRouter();
  const [student, setStudent] = useState<Profile | null>(null);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getStoredSession();
    if (!session.id || session.role !== "student") {
      router.replace("/");
      return;
    }
    if (!isSupabaseConfigured) {
      setError("Platforma bazasi sozlanmagan.");
      setLoading(false);
      return;
    }

    let active = true;
    const load = async () => {
      const { data: profile, error: profileError } = await supabase.from("profiles").select("id, full_name, role, class_name").eq("id", session.id).maybeSingle();
      if (!active) return;
      if (profileError || !profile || profile.role !== "student") {
        setError("Profilni yuklab bo'lmadi. Qayta kirib ko'ring.");
        setLoading(false);
        return;
      }
      setStudent(profile as Profile);
      const { data, error: homeworkError } = await supabase
        .from("homeworks")
        .select("id, class_name, subject, topic, description, deadline, date")
        .eq("class_name", profile.class_name || "")
        .order("date", { ascending: false })
        .limit(100);
      if (!active) return;
      if (homeworkError) setError("Uy vazifalarini yuklab bo'lmadi.");
      else setHomeworks((data ?? []) as Homework[]);
      setLoading(false);
    };
    void load().catch((loadError) => {
      console.error(loadError);
      if (active) {
        setError("Ta'lim ma'lumotlarini yuklashda xatolik yuz berdi.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [router]);

  const subjects = useMemo(() => [...new Set(homeworks.map((item) => item.subject).filter(Boolean))].sort((a, b) => a.localeCompare(b, "uz")), [homeworks]);
  const visibleHomeworks = useMemo(() => homeworks.filter((item) => {
    const matchesSubject = subject === "all" || item.subject === subject;
    const haystack = `${item.subject} ${item.topic ?? ""} ${item.description ?? ""}`.toLocaleLowerCase("uz-UZ");
    return matchesSubject && haystack.includes(search.trim().toLocaleLowerCase("uz-UZ"));
  }), [homeworks, search, subject]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-blue-600" /></div>;
  if (error || !student) return <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center"><p className="font-bold text-slate-900">Ta'lim ma'lumotlarini ochib bo'lmadi</p><p className="mt-2 text-sm text-slate-500">{error || "Qayta kirib ko'ring."}</p></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-emerald-700"><BookOpenCheck className="h-4 w-4" /> Ta'lim bo'limi</p><h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Uy vazifalari</h1><p className="mt-1 text-sm text-slate-500">{student.class_name || "Sinf"} sinfi uchun berilgan topshiriqlar.</p></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-blue-50 px-4 py-3"><p className="text-xs font-bold text-blue-600">Jami vazifa</p><p className="mt-1 text-xl font-black text-blue-950">{homeworks.length}</p></div>
            <div className="rounded-2xl bg-emerald-50 px-4 py-3"><p className="text-xs font-bold text-emerald-700">Fanlar</p><p className="mt-1 text-xl font-black text-emerald-950">{subjects.length}</p></div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><label className="sr-only" htmlFor="homework-search">Vazifalarni qidirish</label><input id="homework-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Fan yoki mavzu bo'yicha qidirish..." className="w-full rounded-xl bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
        <label className="sr-only" htmlFor="subject-filter">Fan bo'yicha filter</label><select id="subject-filter" value={subject} onChange={(event) => setSubject(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"><option value="all">Barcha fanlar</option>{subjects.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      </section>

      <div className="space-y-3">
        {visibleHomeworks.length ? visibleHomeworks.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="flex min-w-0 gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><ClipboardList className="h-5 w-5" /></span>
                <div className="min-w-0"><p className="text-xs font-black uppercase tracking-wider text-blue-600">{item.subject}</p><h2 className="mt-1 text-lg font-black text-slate-950">{item.topic || "Mavzu belgilanmagan"}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.description || "Qo'shimcha topshiriq kiritilmagan."}</p></div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600"><CalendarDays className="h-3.5 w-3.5" />{formatDateUz(item.date)}</span>
                {item.deadline && <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">Muddat: {item.deadline}</span>}
              </div>
            </div>
          </article>
        )) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><BookOpenCheck className="h-7 w-7" /></div>
            <h2 className="mt-4 text-lg font-black text-slate-900">{homeworks.length ? "Mos vazifa topilmadi" : "Hozircha uy vazifalari yo'q"}</h2>
            <p className="mt-2 text-sm text-slate-500">{homeworks.length ? "Qidiruv so'zini yoki fan filterini o'zgartirib ko'ring." : "O'qituvchi vazifa joylaganda shu sahifada ko'rinadi."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
