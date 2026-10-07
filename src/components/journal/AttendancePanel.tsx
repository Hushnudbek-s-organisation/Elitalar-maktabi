"use client";

// ============================================================================
// Bir teginishli davomat: "HAMMASI KELDI" + har o'quvchi uchun tezkor tugmalar.
// Maqsad: 30 o'quvchi ≤ 10 soniyada. Taymer buni ko'rsatadi.
// ============================================================================

import * as React from "react";
import { CheckCheck, Save, Timer } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/types/demo";
import { Avatar, Badge, Button, Card, CardBody } from "@/components/ui/core";
import { STATUS_ORDER, STATUS_UI } from "@/components/journal/attendance-status";

interface Props {
  lessonId: string;
  lessonLabel: string;
  students: { id: string; name: string }[];
  initial: Record<string, AttendanceStatus>;
}

export function AttendancePanel({ lessonId, lessonLabel, students, initial }: Props) {
  const [statuses, setStatuses] = React.useState<Record<string, AttendanceStatus>>(initial);
  const [savedAt, setSavedAt] = React.useState<string | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const startedAt = React.useRef(Date.now());

  React.useEffect(() => {
    const iv = setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(iv);
  }, []);

  const setAll = (status: AttendanceStatus) => {
    setStatuses(Object.fromEntries(students.map((s) => [s.id, status])));
    setDirty(true);
  };

  const setOne = (id: string, status: AttendanceStatus) => {
    setStatuses((prev) => ({ ...prev, [id]: status }));
    setDirty(true);
  };

  const save = () => {
    // Demo: faqat lokal holat. Supabase'da: upsert attendance (idempotent client_uuid bilan)
    setSavedAt(new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }));
    setDirty(false);
    toast.success(`${t("common.saved")} — ${Object.keys(statuses).length} ${t("journal.marked")}`);
  };

  const counts = STATUS_ORDER.map((st) => ({
    status: st,
    count: Object.values(statuses).filter((v) => v === st).length,
  }));

  return (
    <Card>
      <CardBody className="space-y-4">
        {/* Tezkor amallar */}
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={() => setAll("PRESENT")} className="flex-1 sm:flex-none">
            <CheckCheck className="h-5 w-5" />
            {t("journal.allPresent")}
          </Button>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
              <Timer className="h-3.5 w-3.5" />
              {t("journal.elapsed")}: {elapsed}s
            </span>
            {savedAt && !dirty ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-600">
                {t("common.saved")} · {savedAt}
              </span>
            ) : null}
          </div>
          <p className="w-full text-xs text-slate-400 sm:w-auto">{t("journal.quickHint")}</p>
        </div>

        {/* Holat hisoblagichlari */}
        <div className="flex flex-wrap gap-2">
          {counts.map(({ status, count }) => (
            <Badge key={status} tone={STATUS_UI[status].badge}>
              {STATUS_UI[status].label}: {count}
            </Badge>
          ))}
          <Badge tone="gray">{lessonLabel}</Badge>
        </div>

        {/* O'quvchilar ro'yxati */}
        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
          {students.map((s, i) => {
            const st = statuses[s.id] ?? "PRESENT";
            return (
              <div
                key={s.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 transition-colors sm:px-4",
                  i % 2 === 1 && "bg-slate-50/50",
                )}
              >
                <span className="w-5 shrink-0 text-right text-xs font-medium text-slate-300">{i + 1}</span>
                <Avatar name={s.name} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{s.name}</span>
                <span className="flex shrink-0 gap-1">
                  {STATUS_ORDER.map((order) => {
                    const ui = STATUS_UI[order];
                    const active = st === order;
                    return (
                      <button
                        key={order}
                        onClick={() => setOne(s.id, order)}
                        title={ui.label}
                        aria-label={`${s.name}: ${ui.label}`}
                        aria-pressed={active}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg border transition-all sm:h-8 sm:w-8",
                          active ? ui.active : "border-slate-200 bg-white text-slate-300 hover:border-slate-300 hover:text-slate-500",
                        )}
                      >
                        <ui.icon className="h-4 w-4" />
                      </button>
                    );
                  })}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            {dirty ? "O'zgarishlar saqlanmagan" : "Hammasi saqlangan"}
          </p>
          <Button onClick={save} disabled={!dirty} variant={dirty ? "primary" : "secondary"}>
            <Save className="h-4 w-4" />
            {t("common.save")}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
