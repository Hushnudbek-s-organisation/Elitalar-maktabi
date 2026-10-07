"use client";

import { useSession } from "@/lib/session";
import { t } from "@/lib/i18n";
import { PageHeader } from "@/components/ui/core";
import {
  DirectorDashboard,
  ParentDashboard,
  StudentDashboard,
  TeacherDashboard,
} from "@/components/dashboard/role-dashboards";

export default function DashboardPage() {
  const account = useSession((s) => s.account);

  if (!account) return null;

  return (
    <>
      <PageHeader
        title={`${t("dash.hello")}, ${account.name.split(" ")[0]}!`}
        subtitle={account.role === "DIRECTOR" || account.role === "ADMIN" ? "Maktab holati bir qarashda" : undefined}
      />
      {account.role === "DIRECTOR" || account.role === "ADMIN" ? (
        <DirectorDashboard account={account} />
      ) : account.role === "CLASS_TEACHER" || account.role === "TEACHER" ? (
        <TeacherDashboard account={account} />
      ) : account.role === "PARENT" ? (
        <ParentDashboard account={account} />
      ) : (
        <StudentDashboard account={account} />
      )}
    </>
  );
}
