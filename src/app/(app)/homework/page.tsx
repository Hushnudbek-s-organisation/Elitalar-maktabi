"use client";

import * as React from "react";
import { CalendarClock, ClipboardList, Plus } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { cn, formatDateUz, todayISO } from "@/lib/utils";
import { CLASSES, HOMEWORK, classById, subjectById } from "@/lib/demo-data";
import { isStaff, useSession } from "@/lib/session";
import type { Homework } from "@/types/demo";
import {
  Badge,
  Button,
  Card,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui/core";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function HomeworkPage() {
  const account = useSession((s) => s.account);
  const [items, setItems] = React.useState<Homework[]>(HOMEWORK);
  const [open, setOpen] = React.useState(false);
  const [classId, setClassId] = React.useState("c10a");
  const [subjectId, setSubjectId] = React.useState("mat");
  const [title, setTitle] = React.useState("");
  const [desc, setDesc] = React.useState("");

  const staff = account ? isStaff(account.role) : false;

  const visible = account
    ? account.role === "STUDENT" || account.role === "PARENT"
      ? items.filter((h) => account.role === "STUDENT" ? h.classId === "c10a" : h.classId === "c10a" || h.classId === "c7a")
      : items
    : [];

  const assign = () => {
    if (title.trim().length < 2) {
      toast.error("Sarlavhani to'ldiring");
      return;
    }
    setItems((prev) => [
      {
        id: `hw-${Date.now()}`,
        classId,
        subjectId,
        title: title.trim(),
        description: desc.trim(),
        dueDate: todayISO(),
        createdBy: account?.name ?? "Demo",
      },
      ...prev,
    ]);
    setTitle("");
    setDesc("");
    setOpen(false);
    toast.success("Vazifa berildi (demo)");
  };

  return (
    <>
      <PageHeader
        title={t("nav.homework")}
        action={
          staff ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  {t("hw.new")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>{t("hw.new")}</DialogTitle>
                <DialogDescription>Vazifa sinf yoki guruhga beriladi.</DialogDescription>
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Sinf">
                      {CLASSES.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Select>
                    <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} aria-label="Fan">
                      {["mat", "ont", "ing", "fiz", "kim", "tar", "bio"].map((sid) => (
                        <option key={sid} value={sid}>{subjectById(sid).name}</option>
                      ))}
                    </Select>
                  </div>
                  <Input placeholder={t("hw.title")} value={title} onChange={(e) => setTitle(e.target.value)} />
                  <Textarea placeholder={t("hw.description")} value={desc} onChange={(e) => setDesc(e.target.value)} />
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
                    <Button onClick={assign}>{t("hw.assign")}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {visible.map((h) => {
          const subj = subjectById(h.subjectId);
          const overdue = h.dueDate < todayISO();
          return (
            <Card key={h.id} className="p-5">
              <div className="flex items-start gap-3">
                <span className={cn("mt-0.5 rounded-lg px-2 py-1 text-xs font-bold text-white", subj.color)}>
                  {subj.short}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{h.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{h.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge tone="gray">{classById(h.classId)?.name}</Badge>
                    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", overdue ? "text-rose-500" : "text-slate-400")}>
                      <CalendarClock className="h-3.5 w-3.5" />
                      {t("hw.due")}: {formatDateUz(h.dueDate)}
                    </span>
                  </div>
                </div>
                <ClipboardList className="h-4 w-4 shrink-0 text-slate-300" />
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
