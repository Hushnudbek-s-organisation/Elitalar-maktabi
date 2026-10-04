"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Award, BookOpen, CalendarDays, Loader2, MessageCircle, Trophy } from "lucide-react";
import BalanceCard from "@/components/dashboard/BalanceCard";
import NextClassWidget from "@/components/dashboard/NextClassWidget";
import RecentActivity from "@/components/dashboard/RecentActivity";
import { getStoredSession } from "@/lib/session";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getWeekdayCode, normalizeDayOfWeek, WEEKDAYS } from "@/lib/utils";
import type { Homework, Profile, TimetableLesson } from "@/types";

function getLocalISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getNextLessonNumber(now = new Date()): number {
  const starts = ["08:00", "08:50", "09:45", "10:40", "11:35", "12:30"];
  const minutes = now.getHours() * 60 + now.getMinutes();
  const next = starts.findIndex((time) => {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute >= minutes;
  });
  return next < 0 ? 7 : next + 1;
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const [student, setStudent] = useState<Profile | null>(null);
  const [lessons, setLessons] = useState<TimetableLesson[]>([]);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [teachers, setTeachers] = useState<Record<string, string>>({});
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
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role, class_name, pp_balance, cp_score, avatar_url")
        .eq("id", session.id)
        .maybeSingle();
      if (!active) return;
      if (profileError || !profile || profile.role !== "student") {
        setError("O'quvchi profilingizni yuklab bo'lmadi. Qayta kirib ko'ring.");
        setLoading(false);
        return;
      }
      setStudent(profile as Profile);

      const [scheduleResponse, homeworkResponse] = await Promise.all([
        supabase.from("timetable").select("id, class_name, day_of_week, lesson_number, subject, teacher_id, group_type, room, term, start_date, end_date").eq("class_name", profile.class_name || "").order("lesson_number"),
        supabase.from("homeworks").select("id, class_name, subject, topic, description, deadline, date").eq("class_name", profile.class_name || "").order("date", { ascending: false }).limit(6),
      ]);
      if (!active) return;
      if (scheduleResponse.error) console.error("Jadvalni yuklashda xatolik:", scheduleResponse.error.message);
      if (homeworkResponse.error) console.error("Uy vazifalarini yuklashda xatolik:", homeworkResponse.error.message);

      let schedule = (scheduleResponse.data ?? []) as TimetableLesson[];
      const todayIso = getLocalISODate(new Date());
      const activeTerm = schedule.find((lesson) => lesson.start_date && lesson.end_date && lesson.start_date <= todayIso && lesson.end_date >= todayIso)?.term;
      if (activeTerm) schedule = schedule.filter((lesson) => lesson.term === activeTerm);
      setLessons(schedule);
      setHomeworks((homeworkResponse.data ?? []) as Homework[]);

      const teacherIds = [...new Set(schedule.map((lesson) => lesson.teacher_id).filter((id): id is string => Boolean(id)))];
      if (teacherIds.length) {
        const { data: teacherRows } = await supabase.from("profiles").select("id, full_name").in("id", teacherIds);
        if (active && teacherRows) setTeachers(Object.fromEntries(teacherRows.map((teacher) => [teacher.id, teacher.full_name])));
      }
      if (active) setLoading(false);
    };

    void load().catch((loadError) => {
      console.error(loadError);
      if (active) {
        setError("Ma'lumotlarni yuklashda xatolik yuz berdi.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [router]);

  const nextLesson = useMemo(() => {
    if (!lessons.length) return null;
    const today = new Date();
    const todayCode = getWeekdayCode(today);
    const nextPeriod = getNextLessonNumber(today);
    const todayLessons = lessons
      .filter((item) => normalizeDayOfWeek(item.day_of_week) === todayCode && item.lesson_number >= nextPeriod)
      .sort((a, b) => a.lesson_number - b.lesson_number);
    if (todayLessons.length) return { lesson: todayLessons[0], day: todayCode };

    const startIndex = todayCode ? WEEKDAYS.indexOf(todayCode) + 1 : 0;
    for (let offset = 0; offset < WEEKDAYS.length; offset += 1) {
      const day = WEEKDAYS[(startIndex + offset) % WEEKDAYS.length];
      const dayLessons = lessons.filter((item) => normalizeDayOfWeek(item.day_of_week) === day).sort((a, b) => a.lesson_number - b.lesson_number);
      if (dayLessons.length) return { lesson: dayLessons[0], day };
    }
    return null;
  }, [lessons]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-blue-600" /></div>;
  if (error || !student) return <div className="mx-auto max-w-xl rounded-3xl border border-rose-100 bg-white p-8 text-center"><p className="font-bold text-slate-900">Ma'lumotlarni ochib bo'lmadi</p><p className="mt-2 text-sm text-slate-500">{error || "Sessiya tugagan. Qayta kiring."}</p></div>;

  const firstName = student.full_name?.trim().split(/\s+/)[0] || "O'quvchi";
  const classDays = new Set(lessons.map((lesson) => normalizeDayOfWeek(lesson.day_of_week)).filter(Boolean)).size;
  const lessonCount = new Set(lessons.map((lesson) => `${lesson.day_of_week}-${lesson.lesson_number}`)).size;

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 p-6 text-white shadow-xl shadow-blue-900/10 sm:p-9">
        <div className="absolute -right-8 -top-12 hidden h-64 w-64 rounded-full border-[32px] border-white/10 md:block" aria-hidden="true" />
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider"><Award className="h-4 w-4 text-amber-200" /> Shaxsiy kabinet</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Salom, {firstName}!</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">Bugungi maqsadingizni belgilang — har bir qadam katta yutuqqa olib boradi.</p>
            <p className="mt-5 text-sm font-semibold text-blue-100">{student.class_name || "Sinf biriktirilmagan"} sinfi · {new Intl.DateTimeFormat("uz-UZ", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:min-w-64">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"><p className="text-xs font-semibold text-blue-100">Haftalik dars</p><p className="mt-1 text-2xl font-black">{lessonCount}</p></div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"><p className="text-xs font-semibold text-blue-100">Faol kun</p><p className="mt-1 text-2xl font-black">{classDays}</p></div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <BalanceCard balance={student.pp_balance} className={student.class_name} />
        <NextClassWidget lesson={nextLesson?.lesson} day={nextLesson?.day ?? undefined} teacherName={nextLesson?.lesson.teacher_id ? teachers[nextLesson.lesson.teacher_id] : undefined} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <RecentActivity items={homeworks} />
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <p className="text-sm font-bold text-slate-500">Sinf ko'rsatkichi</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Yutuqlaringiz</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-emerald-50 p-4"><Trophy className="h-5 w-5 text-emerald-600" /><p className="mt-3 text-xs font-bold text-emerald-700">Reyting bali</p><p className="mt-1 text-2xl font-black text-emerald-950">{(student.cp_score ?? 0).toLocaleString("uz-UZ")} <span className="text-xs">CP</span></p></div>
            <div className="rounded-2xl bg-blue-50 p-4"><BookOpen className="h-5 w-5 text-blue-600" /><p className="mt-3 text-xs font-bold text-blue-700">Uy vazifalari</p><p className="mt-1 text-2xl font-black text-blue-950">{homeworks.length}</p></div>
          </div>
          <div className="mt-4 space-y-2">
            {[
              { href: "/student/timetable", label: "Dars jadvalini ko'rish", icon: CalendarDays },
              { href: "/student/ranking", label: "Sinf reytingi", icon: Trophy },
              { href: "/student/messenger", label: "Messengerga o'tish", icon: MessageCircle },
            ].map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-blue-600"><span className="inline-flex items-center gap-3"><Icon className="h-4 w-4" />{label}</span><ArrowRight className="h-4 w-4" /></Link>)}
          </div>
        </section>
      </div>
    </div>
  );
}
