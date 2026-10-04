"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2, RefreshCw } from "lucide-react";
import DayTabs from "@/components/timetable/DayTabs";
import SubjectCard from "@/components/timetable/SubjectCard";
import { getStoredSession } from "@/lib/session";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getWeekdayCode, normalizeDayOfWeek, WEEKDAYS, WEEKDAY_LABELS, type WeekdayCode } from "@/lib/utils";
import type { Profile, TimetableLesson } from "@/types";

export default function TimetablePage() {
  const router = useRouter();
  const [student, setStudent] = useState<Profile | null>(null);
  const [timetable, setTimetable] = useState<TimetableLesson[]>([]);
  const [teachers, setTeachers] = useState<Record<string, string>>({});
  const [activeDay, setActiveDay] = useState<WeekdayCode>(getWeekdayCode() ?? "Du");
  const [term, setTerm] = useState("");
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
        setError("Profil topilmadi yoki unga kirish imkoni yo'q.");
        setLoading(false);
        return;
      }
      setStudent(profile as Profile);
      const { data: rows, error: timetableError } = await supabase
        .from("timetable")
        .select("id, class_name, day_of_week, lesson_number, subject, teacher_id, group_type, room, term, start_date, end_date")
        .eq("class_name", profile.class_name || "")
        .order("lesson_number", { ascending: true });
      if (!active) return;
      if (timetableError) {
        setError("Dars jadvalini yuklab bo'lmadi.");
        setLoading(false);
        return;
      }
      const schedule = (rows ?? []) as TimetableLesson[];
      setTimetable(schedule);
      const today = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
      const currentTerm = schedule.find((item) => item.start_date && item.end_date && item.start_date <= today && item.end_date >= today)?.term;
      const firstTerm = [...new Set(schedule.map((item) => item.term).filter((value): value is string => Boolean(value)))][0];
      setTerm(currentTerm || firstTerm || "");

      const teacherIds = [...new Set(schedule.map((item) => item.teacher_id).filter((value): value is string => Boolean(value)))];
      if (teacherIds.length) {
        const { data: teacherRows } = await supabase.from("profiles").select("id, full_name").in("id", teacherIds);
        if (active && teacherRows) setTeachers(Object.fromEntries(teacherRows.map((item) => [item.id, item.full_name])));
      }
      if (active) setLoading(false);
    };
    void load().catch((loadError) => {
      console.error(loadError);
      if (active) {
        setError("Jadvalni yuklashda kutilmagan xatolik yuz berdi.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [router]);

  const terms = useMemo(() => [...new Set(timetable.map((item) => item.term).filter((value): value is string => Boolean(value)))], [timetable]);
  const lessonsForDay = useMemo(() => timetable
    .filter((item) => (!term || !item.term || item.term === term) && normalizeDayOfWeek(item.day_of_week) === activeDay)
    .sort((a, b) => a.lesson_number - b.lesson_number), [activeDay, term, timetable]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-blue-600" /></div>;
  if (error || !student) return <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center"><p className="font-bold text-slate-900">Jadvalni ochib bo'lmadi</p><p className="mt-2 text-sm text-slate-500">{error || "Qayta kirib ko'ring."}</p><button onClick={() => window.location.reload()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"><RefreshCw className="h-4 w-4" /> Qayta urinish</button></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <section className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-600 p-6 text-white shadow-lg shadow-blue-900/10 sm:flex-row sm:items-end sm:p-8">
        <div><p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold"><CalendarDays className="h-4 w-4" /> O'QUV JADVALI</p><h1 className="mt-3 text-3xl font-black">Dars jadvali</h1><p className="mt-1 text-sm text-blue-100">{student.class_name || "Sinf"} sinfi · {WEEKDAY_LABELS[activeDay]}</p></div>
        {terms.length > 1 && <label className="text-sm font-bold">Chorak<select value={term} onChange={(event) => setTerm(event.target.value)} className="mt-1 block min-w-40 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white outline-none [&>option]:text-slate-900">{terms.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
      </section>

      <DayTabs activeDay={activeDay} onChange={setActiveDay} />

      {lessonsForDay.length ? (
        <div className="space-y-3">
          {lessonsForDay.map((lesson) => <SubjectCard key={lesson.id} lesson={lesson} teacherName={lesson.teacher_id ? teachers[lesson.teacher_id] : undefined} />)}
        </div>
      ) : (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><CalendarDays className="h-7 w-7" /></div>
          <h2 className="mt-4 text-lg font-black text-slate-900">{WEEKDAY_LABELS[activeDay]} kuni dars yo'q</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Bu kun dam olish kuni bo'lishi yoki jadval hali kiritilmagan bo'lishi mumkin.</p>
        </section>
      )}
    </div>
  );
}
