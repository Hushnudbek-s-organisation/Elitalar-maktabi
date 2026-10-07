"use client";

// Farzandlarim (ota-ona) / Baholarim (o'quvchi) — baho va davomat tarixi

import * as React from "react";
import { GraduationCap, TrendingUp } from "lucide-react";
import { t } from "@/lib/i18n";
import { cn, formatDateUz } from "@/lib/utils";
import {
  GRADES,
  HOMEWORK,
  avgGradeOfStudent,
  attendanceRateOfStudent,
  classById,
  studentById,
  subjectById,
} from "@/lib/demo-data";
import { useSession } from "@/lib/session";
import {
  Avatar,
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  ProgressBar,
  StatCard,
} from "@/components/ui/core";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ChildrenPage() {
  const account = useSession((s) => s.account);
  if (!account || (account.role !== "PARENT" && account.role !== "STUDENT")) {
    return (
      <>
        <PageHeader title={t("nav.children")} />
        <Card><EmptyState title={t("common.noAccess")} /></Card>
      </>
    );
  }

  const ids = account.role === "STUDENT" ? [account.studentId ?? "s01"] : account.childStudentIds ?? ["s01"];
  const children = ids.map((id) => studentById(id)).filter(Boolean);
  const [active, setActive] = React.useState(0);
  const child = children[active];

  if (!child) return null;

  const grades = GRADES.filter((g) => g.studentId === child.id);
  const homework = HOMEWORK.filter((h) => h.classId === child.classId);

  return (
    <>
      <PageHeader title={account.role === "PARENT" ? t("nav.children") : "Baholarim"} />

      {children.length > 1 ? (
        <div className="mb-5 flex gap-2">
          {children.map((c, i) => (
            <button
              key={c!.id}
              onClick={() => setActive(i)}
              className={cn(
                "flex items-center gap-2.5 rounded-2xl border p-3 transition-all",
                i === active ? "border-indigo-300 bg-white shadow-md" : "border-slate-200 bg-white/60",
              )}
            >
              <Avatar name={c!.name} size="sm" />
              <span className="text-left">
                <span className="block text-sm font-semibold text-slate-900">{c!.name.split(" ").slice(0, 2).join(" ")}</span>
                <span className="block text-xs text-slate-400">{classById(c!.classId)?.name}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatCard label={t("dash.avgGrade")} value={avgGradeOfStudent(child.id)} icon={<GraduationCap className="h-5 w-5" />} tone="blue" />
        <StatCard label={t("dash.attendanceRate")} value={`${attendanceRateOfStudent(child.id)}%`} icon={<TrendingUp className="h-5 w-5" />} tone="green" />
        <StatCard label={t("nav.homework")} value={homework.length} icon={<ClipboardIcon />} tone="amber" />
      </div>

      <Tabs defaultValue="grades">
        <TabsList>
          <TabsTrigger value="grades">{t("students.grades")}</TabsTrigger>
          <TabsTrigger value="attendance">{t("journal.attendance")}</TabsTrigger>
        </TabsList>

        <TabsContent value="grades">
          <Card>
            <CardHeader title={`${classById(child.classId)?.name} · ${t("dash.recentGrades")}`} subtitle="FAQAT nashr etilgan baholar (DRAFT o'qituvchida qoladi)" />
            <CardBody className="space-y-2">
              {grades.length === 0 ? (
                <EmptyState title="Baholar yo'q" />
              ) : (
                grades.map((g, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-2.5">
                    <span className={cn("rounded-md px-2 py-1 text-[11px] font-bold text-white", subjectById(g.subjectId).color)}>
                      {subjectById(g.subjectId).short}
                    </span>
                    <span className="flex-1 text-xs text-slate-500">
                      {g.type === "BSB" ? "BSB (100-ball)" : g.type === "CHSB" ? "CHSB (100-ball)" : "Kunlik (10-ball)"}
                    </span>
                    <span className="text-[11px] text-slate-400">{formatDateUz(g.date)}</span>
                    <span className="w-10 rounded-lg bg-indigo-50 py-1 text-center text-sm font-bold text-indigo-700">{g.value}</span>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader title={t("dash.attendanceRate")} />
            <CardBody className="space-y-4">
              <ProgressBar value={attendanceRateOfStudent(child.id)} tone="emerald" />
              <div className="flex flex-wrap gap-2">
                <Badge tone="green">Keldi: 24</Badge>
                <Badge tone="amber">Kechikdi: 1</Badge>
                <Badge tone="red">Sababsiz: 3</Badge>
                <Badge tone="blue">Sababli: 2</Badge>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                3 kun sababsiz qoldirilganda tizim avtomatik hujjat to'plami tayyorlaydi —
                yuborishdan oldin odam ko'rib chiqadi (jarayon shartnomasidagidek).
              </p>
            </CardBody>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function ClipboardIcon() {
  return <GraduationCap className="h-5 w-5" />;
}
