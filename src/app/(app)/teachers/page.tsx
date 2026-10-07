"use client";

import { UserSquare2 } from "lucide-react";
import { t } from "@/lib/i18n";
import { CLASSES, TEACHERS, subjectById } from "@/lib/demo-data";
import { isAdmin, useSession } from "@/lib/session";
import { Avatar, Badge, Card, CardBody, EmptyState, PageHeader } from "@/components/ui/core";

export default function TeachersPage() {
  const account = useSession((s) => s.account);
  if (!account || !isAdmin(account.role)) {
    return (
      <>
        <PageHeader title={t("nav.teachers")} />
        <Card><EmptyState title={t("common.noAccess")} /></Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t("nav.teachers")} subtitle={`${TEACHERS.length} xodim`} />
      <div className="grid gap-4 sm:grid-cols-2">
        {TEACHERS.map((tc) => {
          const homeroom = CLASSES.find((c) => c.homeroomTeacherId === tc.id);
          return (
            <Card key={tc.id} className="p-5">
              <div className="flex items-start gap-4">
                <Avatar name={tc.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{tc.name}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tc.subjectIds.map((sid) => (
                      <Badge key={sid} tone="blue">{subjectById(sid).name}</Badge>
                    ))}
                    {homeroom ? <Badge tone="amber">{t("teachers.homeroom")}: {homeroom.name}</Badge> : null}
                  </div>
                  <p className="mt-2.5 text-xs text-slate-400">{tc.phone}</p>
                </div>
                <UserSquare2 className="h-4 w-4 shrink-0 text-slate-300" />
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
