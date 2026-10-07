import * as React from "react";
import { CheckCircle2, Clock, FileX2, NotebookPen, UserX } from "lucide-react";
import { t } from "@/lib/i18n";
import type { AttendanceStatus } from "@/types/demo";

export const STATUS_ORDER: AttendanceStatus[] = ["PRESENT", "LATE", "UNEXCUSED", "EXCUSED"];

export const STATUS_UI: Record<
  AttendanceStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    active: string;
    badge: "green" | "amber" | "red" | "blue" | "gray";
  }
> = {
  PRESENT: { icon: CheckCircle2, label: t("journal.present"), active: "bg-emerald-500 text-white border-emerald-500", badge: "green" },
  LATE: { icon: Clock, label: t("journal.late"), active: "bg-amber-500 text-white border-amber-500", badge: "amber" },
  UNEXCUSED: { icon: FileX2, label: t("journal.unexcused"), active: "bg-rose-500 text-white border-rose-500", badge: "red" },
  EXCUSED: { icon: NotebookPen, label: t("journal.excused"), active: "bg-sky-500 text-white border-sky-500", badge: "blue" },
  ABSENT: { icon: UserX, label: t("journal.excused"), active: "bg-slate-500 text-white border-slate-500", badge: "gray" },
};
