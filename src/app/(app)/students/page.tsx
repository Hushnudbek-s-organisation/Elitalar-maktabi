"use client";

import * as React from "react";
import { Search, ShieldAlert, TrendingUp } from "lucide-react";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  CLASSES,
  GRADES,
  RISK_EVENTS,
  STUDENTS,
  avgGradeOfStudent,
  attendanceRateOfStudent,
  classById,
  studentById,
  subjectById,
} from "@/lib/demo-data";
import { isStaff, useSession } from "@/lib/session";
import {
  Avatar,
  Badge,
  Card,
  CardBody,
  EmptyState,
  Input,
  PageHeader,
  ProgressBar,
} from "@/components/ui/core";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function StudentsPage() {
  const account = useSession((s) => s.account);
  const [query, setQuery] = React.useState("");
  const [classId, setClassId] = React.useState<string>("all");
  const [focusId, setFocusId] = React.useState<string | null>(null);

  if (!account || !isStaff(account.role)) {
    return (
      <>
        <PageHeader title={t("nav.students")} />
        <Card>
          <EmptyState title={t("common.noAccess")} />
        </Card>
      </>
    );
  }

  const visible =
    account.role === "CLASS_TEACHER" && account.homeroomClassId
      ? STUDENTS.filter((s) => s.classId === account.homeroomClassId)
      : STUDENTS;

  const filtered = visible.filter((s) => {
    if (classId !== "all" && s.classId !== classId) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.admissionNumber.includes(q) ||
      (classById(s.classId)?.name.toLowerCase() ?? "").includes(q)
    );
  });

  const focus = focusId ? studentById(focusId) : null;
  const focusRisk = RISK_EVENTS.find((r) => r.studentId === focusId);

  return (
    <>
      <PageHeader
        title={t("nav.students")}
        subtitle={`${visible.length} ${t("students.count")}`}
      />

      {/* Filtr */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("common.search")}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setClassId("all")}
            className={cn(
              "shrink-0 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors",
              classId === "all" ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600",
            )}
          >
            {t("common.all")}
          </button>
          {CLASSES.map((c) => (
            <button
              key={c.id}
              onClick={() => setClassId(c.id)}
              className={cn(
                "shrink-0 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors",
                c.id === classId ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Ro'yxat */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon={<Search className="h-10 w-10" />} title={t("students.notFound")} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 text-left font-semibold">{t("journal.student")}</th>
                  <th className="hidden px-3 py-3 text-left font-semibold sm:table-cell">Sinf</th>
                  <th className="px-3 py-3 text-center font-semibold">{t("students.avg")}</th>
                  <th className="hidden px-3 py-3 text-left font-semibold sm:table-cell">{t("students.attendance")}</th>
                  <th className="px-4 py-3 text-right font-semibold">№</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((s) => {
                  const risk = RISK_EVENTS.find((r) => r.studentId === s.id && r.status === "OPEN");
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setFocusId(s.id)}
                      className="cursor-pointer transition-colors hover:bg-indigo-50/40"
                    >
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-3">
                          <Avatar name={s.name} size="sm" />
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-[13px] font-semibold text-slate-900">{s.name}</span>
                              {risk ? <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-rose-500" /> : null}
                            </span>
                            <span className="block text-[11px] text-slate-400 sm:hidden">
                              {classById(s.classId)?.name}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="hidden px-3 py-2.5 sm:table-cell">
                        <Badge tone="gray">{classById(s.classId)?.name}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-sm font-bold text-slate-800">{avgGradeOfStudent(s.id) || "—"}</span>
                      </td>
                      <td className="hidden w-40 px-3 py-2.5 sm:table-cell">
                        <ProgressBar
                          value={attendanceRateOfStudent(s.id)}
                          tone={attendanceRateOfStudent(s.id) >= 90 ? "emerald" : "rose"}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-slate-400">{s.admissionNumber}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tafsilot oynasi */}
      <Dialog open={!!focus} onOpenChange={(v) => !v && setFocusId(null)}>
        <DialogContent className="max-w-xl">
          {focus ? (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar name={focus.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <DialogTitle className="truncate">{focus.name}</DialogTitle>
                  <DialogDescription>
                    {classById(focus.classId)?.name} · {focus.admissionNumber}
                  </DialogDescription>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4">
                  <p className="text-xs text-slate-400">{t("students.avg")}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{avgGradeOfStudent(focus.id) || "—"}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-slate-400">{t("students.attendance")}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{attendanceRateOfStudent(focus.id)}%</p>
                </Card>
              </div>

              {/* Risk */}
              {focusRisk ? (
                <div className="rounded-xl bg-rose-50/70 p-4">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                    <ShieldAlert className="h-4 w-4" />
                    {t("risk.title")} ({focusRisk.severity === "HIGH" ? t("risk.high") : t("risk.medium")})
                  </p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-[13px] text-rose-800/90">
                    {focusRisk.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Baholar */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {t("students.grades")}
                </p>
                <div className="space-y-1.5">
                  {GRADES.filter((g) => g.studentId === focus.id).slice(0, 6).map((g, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
                      <span className={cn("rounded px-1.5 text-[11px] font-bold text-white", subjectById(g.subjectId).color)}>
                        {subjectById(g.subjectId).short}
                      </span>
                      <span className="flex-1 text-xs text-slate-500">{g.type === "BSB" ? "BSB (100-ball)" : "Kunlik"}</span>
                      <span className="text-sm font-bold text-slate-800">{g.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <CardBody className="rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-400">
                PII siyosati: manzil va ota-ona shartnomalari faqat administratorga ko'rinadi.
                JSHSHIR umuman yig'ilmaydi (D5).
              </CardBody>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
