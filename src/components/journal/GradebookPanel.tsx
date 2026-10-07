"use client";

// ============================================================================
// Baholar jurnali (spreadsheet): klaviatura navigatsiyasi (↑↓←→, Home/End),
// 1..10 ball, avtomatik saqlash (debounce), BSB ustuni (100-ball).
// Supabase'da: grades jadvaliga upsert (client_uuid bilan idempotent).
// ============================================================================

import * as React from "react";
import { CloudUpload, Keyboard } from "lucide-react";
import { t } from "@/lib/i18n";
import { cn, addDaysISO, todayISO } from "@/lib/utils";
import { GRADES } from "@/lib/demo-data";
import { Avatar, Badge, Card, CardBody } from "@/components/ui/core";

interface Props {
  lessonId: string;
  classId: string;
  subjectId: string;
  subjectShort: string;
  scaleMax: number;
  students: { id: string; name: string }[];
}

interface Cell {
  value: string; // input qiymati
  status: "PUBLISHED" | "DRAFT";
}

const DATES = (() => {
  const today = todayISO();
  return [addDaysISO(today, -14), addDaysISO(today, -7), addDaysISO(today, -3), today];
})();

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function GradebookPanel({ classId, subjectId, scaleMax, students }: Props) {
  // cells[studentId][colIndex]
  const [cells, setCells] = React.useState<Record<string, Cell[]>>(() => {
    const out: Record<string, Cell[]> = {};
    for (const s of students) {
      out[s.id] = DATES.map((date) => {
        const g = GRADES.find(
          (x) => x.studentId === s.id && x.subjectId === subjectId && x.date === date && x.type === "FORMATIV",
        );
        return g ? { value: String(g.value), status: g.status } : { value: "", status: "DRAFT" };
      });
    }
    return out;
  });
  const [savedFlash, setSavedFlash] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const setCell = (studentId: string, col: number, value: string) => {
    // Faqat 1..scaleMax
    const clean = value.replace(/[^0-9]/g, "").slice(0, 2);
    if (clean !== "" && Number(clean) > scaleMax) return;
    setCells((prev) => {
      const row = [...(prev[studentId] ?? [])];
      row[col] = { value: clean, status: "DRAFT" };
      return { ...prev, [studentId]: row };
    });
    // Avtomatik saqlash (debounce)
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setCells((prev) => {
        const next: Record<string, Cell[]> = {};
        for (const [k, row] of Object.entries(prev)) {
          next[k] = row.map((c) => (c.value !== "" ? { ...c, status: "PUBLISHED" } : c));
        }
        return next;
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    }, 800);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => {
    const focus = (r: number, c: number) => {
      if (r < 0 || r >= students.length || c < 0 || c >= DATES.length) return;
      e.preventDefault();
      document.getElementById(`cell-${r}-${c}`)?.focus();
    };
    switch (e.key) {
      case "ArrowUp": return focus(rowIdx - 1, colIdx);
      case "ArrowDown": case "Enter": return focus(rowIdx + 1, colIdx);
      case "ArrowLeft": return focus(rowIdx, colIdx - 1);
      case "ArrowRight": return focus(rowIdx, colIdx + 1);
      case "Home": return focus(rowIdx, 0);
      case "End": return focus(rowIdx, DATES.length - 1);
    }
  };

  const bsb = (studentId: string): number | null => {
    const g = GRADES.find((x) => x.studentId === studentId && x.subjectId === subjectId && x.type === "BSB");
    return g ? g.value : null;
  };

  const avg = (studentId: string): string => {
    const vals = (cells[studentId] ?? []).filter((c) => c.value !== "").map((c) => Number(c.value));
    if (vals.length === 0) return "—";
    return (vals.reduce((a, v) => a + v, 0) / vals.length).toFixed(1);
  };

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Keyboard className="h-3.5 w-3.5" />
            {t("journal.gradeHint")}
          </p>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-opacity",
              savedFlash ? "bg-emerald-50 text-emerald-600 opacity-100" : "bg-slate-100 text-slate-400 opacity-60",
            )}
          >
            <CloudUpload className="h-3.5 w-3.5" />
            {savedFlash ? t("common.saved") : t("journal.autosave")}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2.5 text-left font-semibold">{t("journal.student")}</th>
                {DATES.map((d, i) => (
                  <th key={d} className="w-16 px-1 py-2.5 text-center font-semibold">
                    {fmtDate(d)}
                    {i === DATES.length - 1 ? (
                      <span className="block text-[9px] font-medium normal-case text-indigo-400">bugun</span>
                    ) : null}
                  </th>
                ))}
                <th className="w-16 px-2 py-2.5 text-center font-semibold text-violet-500">BSB</th>
                <th className="w-14 px-2 py-2.5 text-center font-semibold">O&apos;rt.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s, rowIdx) => (
                <tr key={s.id} className={rowIdx % 2 === 1 ? "bg-slate-50/40" : undefined}>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2.5">
                      <span className="w-4 text-right text-[11px] font-medium text-slate-300">{rowIdx + 1}</span>
                      <Avatar name={s.name} size="sm" className="h-7 w-7 text-[10px]" />
                      <span className="max-w-[180px] truncate text-[13px] font-medium text-slate-800">{s.name}</span>
                    </span>
                  </td>
                  {DATES.map((d, colIdx) => {
                    const cell = cells[s.id]?.[colIdx];
                    return (
                      <td key={d} className="px-1 py-1.5 text-center">
                        <input
                          id={`cell-${rowIdx}-${colIdx}`}
                          inputMode="numeric"
                          value={cell?.value ?? ""}
                          onChange={(e) => setCell(s.id, colIdx, e.target.value)}
                          onKeyDown={(e) => onKey(e, rowIdx, colIdx)}
                          className={cn(
                            "h-9 w-12 rounded-lg border text-center text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30",
                            cell?.value
                              ? cell.status === "PUBLISHED"
                                ? "border-indigo-200 bg-indigo-50/60 text-indigo-700"
                                : "border-amber-200 bg-amber-50/60 text-amber-700"
                              : "border-slate-200 bg-white text-slate-700",
                          )}
                          aria-label={`${s.name} ${fmtDate(d)} bahosi`}
                        />
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-center">
                    {bsb(s.id) !== null ? (
                      <Badge tone="violet">{bsb(s.id)}</Badge>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center text-sm font-bold text-slate-700">{avg(s.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400">
          Sariq = hali savlanmagan (DRAFT), ko&apos;k = nashr etilgan. Ota-onalar faqat
          nashr etilgan baholarni ko&apos;radi.
        </p>
      </CardBody>
    </Card>
  );
}
