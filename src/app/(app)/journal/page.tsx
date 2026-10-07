"use client";

import * as React from "react";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { t } from "@/lib/i18n";
import { cn, LESSON_TIMES } from "@/lib/utils";
import {
  TODAY_ATTENDANCE,
  TODAY_LESSONS,
  classById,
  studentsOfClass,
  subjectById,
  teacherById,
} from "@/lib/demo-data";
import { useSession } from "@/lib/session";
import type { AttendanceStatus } from "@/types/demo";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  PageHeader,
} from "@/components/ui/core";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendancePanel } from "@/components/journal/AttendancePanel";
import { GradebookPanel } from "@/components/journal/GradebookPanel";

export default function JournalPage() {
  const account = useSession((s) => s.account);
  const teacherId = account?.teacherId ?? "t1";

  const myLessons = React.useMemo(
    () => TODAY_LESSONS.filter((l) => l.teacherId === teacherId),
    [teacherId],
  );
  const [lessonId, setLessonId] = React.useState<string>(myLessons[0]?.id ?? "");
  const lesson = myLessons.find((l) => l.id === lessonId);

  if (!account || (account.role !== "TEACHER" && account.role !== "CLASS_TEACHER" && account.role !== "ADMIN" && account.role !== "DIRECTOR")) {
    return (
      <>
        <PageHeader title={t("nav.journal")} />
        <Card>
          <EmptyState title={t("common.noAccess")} hint="Jurnal faqat o'qituvchilar uchun" />
        </Card>
      </>
    );
  }

  if (myLessons.length === 0) {
    return (
      <>
        <PageHeader title={t("nav.journal")} subtitle="Dushanba" />
        <Card>
          <EmptyState icon={<Users className="h-10 w-10" />} title={t("dash.noLessons")} />
        </Card>
      </>
    );
  }

  const cls = lesson ? classById(lesson.classId) : undefined;
  const students = lesson ? studentsOfClass(lesson.classId) : [];

  return (
    <>
      <PageHeader title={t("nav.journal")} subtitle="Dushanba, 1-smena" />

      {/* Dars tanlash */}
      <div className="mb-5 flex flex-wrap gap-2">
        {myLessons.map((l) => {
          const active = l.id === lessonId;
          return (
            <button
              key={l.id}
              onClick={() => setLessonId(l.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
              )}
            >
              <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-bold text-white", subjectById(l.subjectId).color)}>
                {subjectById(l.subjectId).short}
              </span>
              {classById(l.classId)?.name}
              {l.group ? <Badge tone="blue">{l.group}-{t("journal.group")}</Badge> : null}
              <span className="text-[11px] font-normal text-slate-400">{l.period}-{t("journal.period")}</span>
            </button>
          );
        })}
      </div>

      {lesson ? (
        <Tabs defaultValue="attendance">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="attendance">{t("journal.attendance")}</TabsTrigger>
              <TabsTrigger value="grades">{t("journal.gradebook")}</TabsTrigger>
            </TabsList>
            <p className="text-xs text-slate-400">
              {t("journal.topic")}: <span className="font-medium text-slate-600">{lesson.topic}</span>
            </p>
          </div>

          <TabsContent value="attendance">
            <AttendancePanel
              key={`att-${lessonId}`}
              lessonId={lessonId}
              lessonLabel={`${subjectById(lesson.subjectId).short} · ${cls?.name} · ${lesson.period}-${t("journal.period")} (${LESSON_TIMES[lesson.period - 1]})`}
              initial={Object.fromEntries(
                students.map((s) => [
                  s.id,
                  (TODAY_ATTENDANCE.find((a) => a.studentId === s.id)?.status ?? "PRESENT") as AttendanceStatus,
                ]),
              )}
              students={students.map((s) => ({ id: s.id, name: s.name }))}
            />
          </TabsContent>

          <TabsContent value="grades">
            <GradebookPanel
              key={`gr-${lessonId}`}
              lessonId={lessonId}
              classId={lesson.classId}
              subjectId={lesson.subjectId}
              subjectShort={subjectById(lesson.subjectId).short}
              scaleMax={10}
              students={students.map((s) => ({ id: s.id, name: s.name }))}
            />
          </TabsContent>
        </Tabs>
      ) : null}
    </>
  );
}
