"use client";

import * as React from "react";
import { t } from "@/lib/i18n";
import { cn, LESSON_TIMES, WEEKDAY_NAMES_UZ, WEEKDAY_SHORT_UZ, todayDay } from "@/lib/utils";
import { CLASSES, TIMETABLE, classById, classOfStudent, subjectById, teacherById } from "@/lib/demo-data";
import { useSession } from "@/lib/session";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/core";

export default function TimetablePage() {
  const account = useSession((s) => s.account);

  const defaultClassId = React.useMemo(() => {
    if (!account) return CLASSES[0].id;
    if (account.role === "STUDENT" && account.studentId) {
      return classOfStudent(account.studentId)?.id ?? "c10a";
    }
    if (account.role === "PARENT" && account.childStudentIds?.[0]) {
      return classOfStudent(account.childStudentIds[0])?.id ?? "c10a";
    }
    if (account.role === "CLASS_TEACHER") return account.homeroomClassId ?? "c10a";
    return "c10a";
  }, [account]);

  const [classId, setClassId] = React.useState(defaultClassId);
  const canSwitch = account?.role === "DIRECTOR" || account?.role === "ADMIN" || account?.role === "CLASS_TEACHER" || account?.role === "TEACHER";
  const today = todayDay();

  const slots = TIMETABLE.filter((s) => s.classId === classId);

  return (
    <>
      <PageHeader title={t("nav.timetable")} subtitle={t("tt.legend")} />

      {canSwitch ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {CLASSES.map((c) => (
            <button
              key={c.id}
              onClick={() => setClassId(c.id)}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
                c.id === classId
                  ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="w-24 border-b border-slate-100 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {t("tt.class")}
                </th>
                {WEEKDAY_NAMES_UZ.map((d, i) => (
                  <th
                    key={d}
                    className={cn(
                      "border-b border-l border-slate-100 px-3 py-3 text-left text-xs font-semibold",
                      today === i + 1 ? "text-indigo-600" : "text-slate-600",
                    )}
                  >
                    {d}
                    {today === i + 1 ? <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" /> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6].map((period) => (
                <tr key={period}>
                  <td className="border-b border-slate-50 bg-slate-50/50 px-3 py-2 align-top">
                    <span className="block text-sm font-bold text-slate-700">{period}</span>
                    <span className="block text-[10px] text-slate-400">{LESSON_TIMES[period - 1]}</span>
                  </td>
                  {WEEKDAY_NAMES_UZ.map((_, dayIdx) => {
                    const day = dayIdx + 1;
                    const daySlots = slots.filter((s) => s.day === day && s.period === period);
                    return (
                      <td key={day} className="border-b border-l border-slate-50 p-1.5 align-top">
                        {daySlots.length === 0 ? (
                          <span className="block px-2 py-3 text-center text-[11px] text-slate-300">{t("tt.free")}</span>
                        ) : (
                          <div className="space-y-1">
                            {daySlots.map((s) => {
                              const subj = subjectById(s.subjectId);
                              return (
                                <div
                                  key={`${s.classId}-${s.day}-${s.period}-${s.group ?? 0}`}
                                  className="rounded-lg bg-slate-50 px-2 py-1.5"
                                  title={`${subj.name} · ${teacherById(s.teacherId)?.name} · ${s.room}`}
                                >
                                  <span className="flex items-center gap-1.5">
                                    <span className={cn("rounded px-1.5 text-[11px] font-bold text-white", subj.color)}>
                                      {subj.short}
                                    </span>
                                    {s.group ? <Badge tone="blue" className="px-1.5 py-0 text-[10px]">{s.group}-g</Badge> : null}
                                  </span>
                                  <span className="mt-1 block truncate text-[10px] text-slate-400">
                                    {s.room} · {teacherById(s.teacherId)?.name.split(" ")[0]}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-xs text-slate-400">
        {classById(classId)?.name} · Sinf rahbari:{" "}
        {teacherById(classById(classId)?.homeroomTeacherId ?? "")?.name}
      </p>
    </>
  );
}
