import Link from "next/link";
import { ArrowRight, CalendarClock, MapPin, UserRound } from "lucide-react";
import type { TimetableLesson } from "@/types";
import { LESSON_TIMES, WEEKDAY_LABELS, normalizeDayOfWeek } from "@/lib/utils";

export default function NextClassWidget({
  lesson,
  teacherName,
  day,
}: {
  lesson?: TimetableLesson | null;
  teacherName?: string;
  day?: string;
}) {
  const dayCode = normalizeDayOfWeek(day ?? lesson?.day_of_week);
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-blue-600"><CalendarClock className="h-4 w-4" /> Keyingi dars</p>
          {lesson ? (
            <>
              <h2 className="mt-4 text-2xl font-black text-slate-950">{lesson.subject}</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {dayCode ? WEEKDAY_LABELS[dayCode] : "Jadval"} · {lesson.lesson_number}-dars
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-4 text-xl font-black text-slate-950">Hozircha dars belgilanmagan</h2>
              <p className="mt-1 text-sm text-slate-500">Jadval yangilanganda bu yerda ko'rinadi.</p>
            </>
          )}
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><CalendarClock className="h-6 w-6" /></div>
      </div>
      {lesson && (
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
          <span className="font-bold text-slate-800">{LESSON_TIMES[lesson.lesson_number - 1] ?? "Vaqt belgilanmagan"}</span>
          {teacherName && <span className="inline-flex items-center gap-1.5"><UserRound className="h-4 w-4 text-slate-400" />{teacherName}</span>}
          {lesson.room && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" />{lesson.room}</span>}
        </div>
      )}
      <Link href="/student/timetable" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700">
        To'liq jadval <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
