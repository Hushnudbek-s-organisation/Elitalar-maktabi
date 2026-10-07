"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Megaphone,
  TrendingDown,
  UserSquare2,
  Users,
} from "lucide-react";
import { t } from "@/lib/i18n";
import {
  ANNOUNCEMENTS,
  CLASSES,
  HOMEWORK,
  RISK_EVENTS,
  SCHOOL,
  TODAY_LESSONS,
  avgGradeOfStudent,
  attendanceRateOfStudent,
  classById,
  directorStats,
  studentById,
  studentsOfClass,
  subjectById,
  teacherById,
} from "@/lib/demo-data";
import type { DemoAccount } from "@/lib/session";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ProgressBar,
  StatCard,
} from "@/components/ui/core";
import { LESSON_TIMES, formatDateUz } from "@/lib/utils";

// ============================================================================
// DIREKTOR — maktab holati 0 bosishda
// ============================================================================
export function DirectorDashboard({ account }: { account: DemoAccount }) {
  const risk = RISK_EVENTS[0];
  const riskStudent = risk ? studentById(risk.studentId) : undefined;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label={t("dash.students")} value={directorStats.students} icon={<Users className="h-5 w-5" />} tone="blue" />
        <StatCard label={t("dash.teachers")} value={directorStats.teachers} icon={<UserSquare2 className="h-5 w-5" />} tone="violet" />
        <StatCard
          label={t("dash.attendanceToday")}
          value={`${directorStats.attendanceToday}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="green"
          hint="33/34 o'quvchi darsda"
        />
        <StatCard
          label={t("dash.openRisks")}
          value={directorStats.openRisks}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="red"
          hint={t("risk.explainable")}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Risk */}
        <Card className="lg:col-span-2">
          <CardHeader
            title={t("dash.riskEvents")}
            subtitle={t("risk.explainable")}
            action={<Badge tone="red">{t("risk.high")}</Badge>}
          />
          <CardBody className="space-y-4">
            {risk && riskStudent ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar name={riskStudent.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{riskStudent.name}</p>
                    <p className="text-xs text-slate-400">{classById(riskStudent.classId)?.name}</p>
                  </div>
                  <Link href="/students">
                    <Button variant="outline" size="sm">
                      {t("students.info")}
                    </Button>
                  </Link>
                </div>
                <div className="rounded-xl bg-rose-50/60 p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                    <TrendingDown className="h-3.5 w-3.5" />
                    {t("risk.reasons")}:
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-sm text-rose-800/90">
                    {risk.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <EmptyState icon={<CheckCircle2 className="h-10 w-10" />} title="Ogohlantirish yo'q" />
            )}
          </CardBody>
        </Card>

        {/* Sinf ko'rsatkichlari */}
        <Card>
          <CardHeader title={t("dash.classes")} subtitle={SCHOOL.quarter} />
          <CardBody className="space-y-4">
            {CLASSES.map((c) => {
              const students = studentsOfClass(c.id);
              const rate = Math.round(
                students.reduce((a, s) => a + attendanceRateOfStudent(s.id), 0) / students.length,
              );
              return (
                <div key={c.id}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-900">{c.name}</span>
                    <span className="text-xs text-slate-500">
                      {students.length} · {teacherById(c.homeroomTeacherId)?.name.split(" ")[0]}
                    </span>
                  </div>
                  <ProgressBar value={rate} tone={rate >= 90 ? "emerald" : "rose"} />
                  <p className="mt-1 text-right text-[11px] text-slate-400">{rate}%</p>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>

      {/* E'lonlar */}
      <Card>
        <CardHeader
          title={t("nav.announcements")}
          action={
            <Link href="/announcements" className="text-xs font-medium text-indigo-600 hover:underline">
              {t("common.viewAll")}
            </Link>
          }
        />
        <CardBody className="space-y-3">
          {ANNOUNCEMENTS.slice(0, 3).map((a) => (
            <div key={a.id} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Megaphone className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <span className="truncate">{a.title}</span>
                  {a.pinned ? <Badge tone="amber">{t("ann.pinned")}</Badge> : null}
                </p>
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{a.body}</p>
              </div>
              <span className="shrink-0 text-[11px] text-slate-400">{formatDateUz(a.date)}</span>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

// ============================================================================
// O'QITUVCHI / SINF RAHBARI — bugungi darslar + tezkor amallar
// ============================================================================
export function TeacherDashboard({ account }: { account: DemoAccount }) {
  const router = useRouter();
  const teacherId = account.teacherId ?? "t1";
  const myLessons = TODAY_LESSONS.filter((l) => l.teacherId === teacherId);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label={t("dash.todayLessons")} value={myLessons.length} icon={<BookOpen className="h-5 w-5" />} tone="blue" />
        <StatCard label="Belgilanmagan davomat" value={myLessons.length} icon={<ClipboardList className="h-5 w-5" />} tone="amber" hint="Jurnalga o'ting" />
        <StatCard label="Uy vazifalari" value={HOMEWORK.filter((h) => teacherById(h.subjectId.length > 0 ? "t1" : "t1")?.id === teacherId).length || 2} icon={<ClipboardList className="h-5 w-5" />} tone="violet" />
        <StatCard label="Xabarlar" value={2} icon={<Megaphone className="h-5 w-5" />} tone="green" hint="2 ota-ona yozdi" />
      </div>

      <Card>
        <CardHeader
          title={t("dash.todayLessons")}
          subtitle="Dushanba, 1-smena"
          action={
            <Link href="/journal">
              <Button size="sm">
                {t("dash.openJournal")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          }
        />
        <CardBody className="space-y-3">
          {myLessons.length === 0 ? (
            <EmptyState icon={<CalendarDays className="h-10 w-10" />} title={t("dash.noLessons")} />
          ) : (
            myLessons.map((l) => {
              const cls = classById(l.classId);
              return (
                <button
                  key={l.id}
                  onClick={() => router.push("/journal")}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
                >
                  <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-100 text-[10px] font-bold text-slate-600">
                    {l.period}
                    <span className="font-medium text-slate-400">dars</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold text-white ${subjectById(l.subjectId).color}`}>
                        {subjectById(l.subjectId).short}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">{cls?.name}</span>
                      {l.group ? <Badge tone="blue">{l.group}-{t("journal.group")}</Badge> : null}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-400">{l.topic}</span>
                  </span>
                  <span className="shrink-0 text-[11px] font-medium text-slate-400">
                    {LESSON_TIMES[l.period - 1]}
                  </span>
                </button>
              );
            })
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ============================================================================
// OTA-ONA — farzandlar xulosasi
// ============================================================================
export function ParentDashboard({ account }: { account: DemoAccount }) {
  const children = (account.childStudentIds ?? []).map((id) => studentById(id)).filter(Boolean);
  const [active, setActive] = React.useState(0);
  const child = children[active];

  return (
    <div className="space-y-5">
      {/* Farzand tanlash */}
      <div className="flex gap-2">
        {children.map((c, i) => (
          <button
            key={c!.id}
            onClick={() => setActive(i)}
            className={`flex items-center gap-2.5 rounded-2xl border p-3 transition-all ${
              i === active
                ? "border-indigo-300 bg-white shadow-md"
                : "border-slate-200 bg-white/60 hover:bg-white"
            }`}
          >
            <Avatar name={c!.name} size="sm" />
            <span className="text-left">
              <span className="block text-sm font-semibold text-slate-900">
                {c!.name.split(" ").slice(0, 2).join(" ")}
              </span>
              <span className="block text-xs text-slate-400">{classById(c!.classId)?.name}</span>
            </span>
          </button>
        ))}
      </div>

      {child ? (
        <>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <StatCard label={t("dash.avgGrade")} value={avgGradeOfStudent(child.id)} icon={<GraduationCap className="h-5 w-5" />} tone="blue" />
            <StatCard label={t("dash.attendanceRate")} value={`${attendanceRateOfStudent(child.id)}%`} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
            <StatCard label={t("dash.homeworkDue")} value={HOMEWORK.filter((h) => h.classId === child.classId).length} icon={<ClipboardList className="h-5 w-5" />} tone="amber" />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Bugungi davomat" subtitle={formatDateUz(new Date().toISOString().slice(0, 10))} />
              <CardBody>
                <div className="flex items-center gap-3 rounded-xl bg-emerald-50/60 p-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Darslarda qatnashdi</p>
                    <p className="text-xs text-emerald-700/70">Barcha darslar belgilandi</p>
                  </div>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t("nav.announcements")} />
              <CardBody className="space-y-3">
                {ANNOUNCEMENTS.slice(0, 2).map((a) => (
                  <div key={a.id} className="text-sm">
                    <p className="font-medium text-slate-900">{a.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{a.body}</p>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

// ============================================================================
// O'QUVCHI
// ============================================================================
export function StudentDashboard({ account }: { account: DemoAccount }) {
  const student = account.studentId ? studentById(account.studentId) : undefined;
  const cls = student ? classById(student.classId) : undefined;
  const lessons = student ? TODAY_LESSONS.filter((l) => l.classId === student.classId) : [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label={t("dash.avgGrade")} value={student ? avgGradeOfStudent(student.id) : "—"} icon={<GraduationCap className="h-5 w-5" />} tone="blue" />
        <StatCard label={t("dash.attendanceRate")} value={student ? `${attendanceRateOfStudent(student.id)}%` : "—"} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
        <StatCard label="Bugungi darslar" value={lessons.length} icon={<BookOpen className="h-5 w-5" />} tone="violet" />
        <StatCard label={t("nav.homework")} value={student ? HOMEWORK.filter((h) => h.classId === student.classId).length : 0} icon={<ClipboardList className="h-5 w-5" />} tone="amber" />
      </div>

      <Card>
        <CardHeader title={t("dash.todayLessons")} subtitle={cls ? `${cls.name} sinfi` : undefined} />
        <CardBody className="space-y-2">
          {lessons.map((l) => (
            <div key={l.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
              <span className={`rounded-md px-2 py-1 text-xs font-bold text-white ${subjectById(l.subjectId).color}`}>
                {subjectById(l.subjectId).short}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{l.topic}</span>
              <span className="text-[11px] font-medium text-slate-400">{LESSON_TIMES[l.period - 1]}</span>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
