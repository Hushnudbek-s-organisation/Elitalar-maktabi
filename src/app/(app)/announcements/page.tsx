"use client";

import * as React from "react";
import { Megaphone, Pin, Plus } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { ANNOUNCEMENTS, SCHOOL } from "@/lib/demo-data";
import { isStaff, useSession } from "@/lib/session";
import { formatDateUz } from "@/lib/utils";
import type { Announcement } from "@/types/demo";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Input,
  PageHeader,
  Textarea,
} from "@/components/ui/core";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AnnouncementsPage() {
  const account = useSession((s) => s.account);
  const [items, setItems] = React.useState<Announcement[]>(ANNOUNCEMENTS);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [open, setOpen] = React.useState(false);

  const publish = () => {
    if (title.trim().length < 2 || body.trim().length < 2) {
      toast.error("Sarlavha va matnni to'ldiring");
      return;
    }
    setItems((prev) => [
      {
        id: `new-${Date.now()}`,
        title: title.trim(),
        body: body.trim(),
        date: new Date().toISOString().slice(0, 10),
        scope: "Maktab",
        pinned: false,
        author: account?.name ?? "Demo",
      },
      ...prev,
    ]);
    setTitle("");
    setBody("");
    setOpen(false);
    toast.success("E'lon nashr etildi (demo)");
  };

  const sorted = [...items].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <>
      <PageHeader
        title={t("nav.announcements")}
        subtitle={SCHOOL.name}
        action={
          account && (account.role === "DIRECTOR" || account.role === "ADMIN") ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  {t("ann.new")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>{t("ann.new")}</DialogTitle>
                <DialogDescription>
                  Maktab bo'yicha e'lon barcha foydalanuvchilarga ko'rinadi.
                </DialogDescription>
                <div className="mt-4 space-y-3">
                  <Input placeholder={t("ann.title")} value={title} onChange={(e) => setTitle(e.target.value)} />
                  <Textarea placeholder={t("ann.body")} value={body} onChange={(e) => setBody(e.target.value)} />
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
                    <Button onClick={publish}>{t("ann.publish")}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      <div className="space-y-4">
        {sorted.map((a) => (
          <Card key={a.id} className="p-5">
            <div className="flex items-start gap-4">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.pinned ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"}`}>
                {a.pinned ? <Pin className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{a.title}</h3>
                  {a.pinned ? <Badge tone="amber">{t("ann.pinned")}</Badge> : null}
                  <Badge tone="gray">{a.scope}</Badge>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{a.body}</p>
                <p className="mt-2.5 text-[11px] text-slate-400">
                  {a.author} · {formatDateUz(a.date)}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
