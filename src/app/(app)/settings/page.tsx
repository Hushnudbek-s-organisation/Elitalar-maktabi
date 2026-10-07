"use client";

import { Bell, Database, MessageCircle, Send, Smartphone, Wallet } from "lucide-react";
import { t } from "@/lib/i18n";
import { SCHOOL } from "@/lib/demo-data";
import { isAdmin, useSession } from "@/lib/session";
import { Badge, Card, CardBody, CardHeader, EmptyState, Input, PageHeader } from "@/components/ui/core";

const FEATURES = [
  { icon: MessageCircle, name: "Telegram bildirishnomalari", note: "D3: birinchi kanal", on: true },
  { icon: Smartphone, name: "Web Push", note: "PWA o'qituvchi ilovasi bilan", on: true },
  { icon: Bell, name: "Ilova ichidagi bildirishnomalar", note: "Har doim yoniq", on: true },
  { icon: Send, name: "SMS", note: "Keyinroq (provayder tanlanmagan)", on: false },
  { icon: Wallet, name: "Hamyon / reyting", note: "D7: bayroq bilan, default O'CHIQ", on: false },
];

export default function SettingsPage() {
  const account = useSession((s) => s.account);
  if (!account || !isAdmin(account.role)) {
    return (
      <>
        <PageHeader title={t("nav.settings")} />
        <Card><EmptyState title={t("common.noAccess")} /></Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t("nav.settings")} subtitle={SCHOOL.name} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("settings.school")} subtitle={t("settings.demoData")} />
          <CardBody className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("settings.schoolName")}</label>
              <Input defaultValue={SCHOOL.name} readOnly />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("settings.year")}</label>
                <Input defaultValue={SCHOOL.year} readOnly />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("settings.quarter")}</label>
                <Input defaultValue={SCHOOL.quarter} readOnly />
              </div>
            </div>
            <p className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
              {t("settings.demoNote")}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("settings.features")} subtitle={t("settings.featuresNote")} />
          <CardBody className="space-y-3">
            {FEATURES.map((f) => (
              <div key={f.name} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                  <f.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-900">{f.name}</span>
                  <span className="block text-[11px] text-slate-400">{f.note}</span>
                </span>
                <Badge tone={f.on ? "green" : "gray"}>{f.on ? t("settings.on") : t("settings.off")}</Badge>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Ma'lumotlar bazasi" subtitle="Supabase ulanishi (keyingi qadam)" />
          <CardBody>
            <div className="flex items-start gap-4 rounded-xl bg-slate-50 p-4">
              <Database className="mt-0.5 h-6 w-6 shrink-0 text-slate-400" />
              <div className="text-sm leading-relaxed text-slate-600">
                <p className="font-medium text-slate-900">Hozir: Demo rejim (brauzer ma'lumotlari)</p>
                <p className="mt-1 text-xs text-slate-500">
                  SQL migratsiyalari tayyor va lokal testdan o'tgan (001–004, 53/53 RLS testi).
                  Supabase loyihasi ulanganda: auth (real hisoblar), RLS (rollar huquqi), realtime,
                  storage (hujjatlar) avtomatik ishga tushadi.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
