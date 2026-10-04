import { BookOpen, MapPin, UserRound } from "lucide-react";
import type { TimetableLesson } from "@/types";
import { LESSON_TIMES } from "@/lib/utils";

export default function SubjectCard({ lesson, teacherName }: { lesson: TimetableLesson; teacherName?: string }) {
  return (
    <article className="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md sm:gap-5 sm:p-5">
      <div className="flex w-[4.25rem] shrink-0 flex-col items-center justify-center rounded-2xl bg-blue-50 px-2 py-3 text-center text-blue-700">
        <span className="text-[10px] font-black uppercase tracking-wide">Dars</span>
        <span className="mt-0.5 text-2xl font-black">{lesson.lesson_number}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-black text-slate-950 sm:text-lg">{lesson.subject}</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">{LESSON_TIMES[lesson.lesson_number - 1] ?? "Vaqt belgilanmagan"}</p>
          </div>
          {lesson.group_type && lesson.group_type !== "Barchasi" && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700">{lesson.group_type}</span>}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-500">
          {teacherName && <span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" />{teacherName}</span>}
          {lesson.room && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{lesson.room}</span>}
          {!teacherName && !lesson.room && <span className="inline-flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" />Dars tafsilotlari</span>}
        </div>
      </div>
    </article>
  );
}
