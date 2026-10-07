"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CHAT_THREADS } from "@/lib/demo-data";
import { isStaff, useSession } from "@/lib/session";
import { Avatar, Badge, Card, EmptyState, PageHeader } from "@/components/ui/core";

export default function MessagesPage() {
  const account = useSession((s) => s.account);
  const [activeId, setActiveId] = React.useState(CHAT_THREADS[0]?.id ?? "");
  const [draft, setDraft] = React.useState("");
  const [threads, setThreads] = React.useState(CHAT_THREADS);

  if (!account || !isStaff(account.role)) {
    return (
      <>
        <PageHeader title={t("nav.messages")} />
        <Card><EmptyState title={t("common.noAccess")} hint="Xabarlar moduli xodimlar uchun" /></Card>
      </>
    );
  }

  const active = threads.find((th) => th.id === activeId);

  const send = () => {
    if (draft.trim().length === 0) return;
    const now = new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
    setThreads((prev) =>
      prev.map((th) =>
        th.id === activeId
          ? {
              ...th,
              messages: [...th.messages, { from: "me" as const, text: draft.trim(), time: now }],
              lastMessage: draft.trim(),
              lastTime: now,
            }
          : th,
      ),
    );
    setDraft("");
    toast.success("Xabar yuborildi (demo)");
  };

  return (
    <>
      <PageHeader title={t("nav.messages")} subtitle="Ish soatlari: 08:00–17:00 (D3: Telegram birinchi)" />
      <Card className="flex h-[calc(100vh-16rem)] min-h-[420px] overflow-hidden">
        {/* Threadlar */}
        <div className="w-full shrink-0 border-r border-slate-100 sm:w-64">
          <div className="divide-y divide-slate-50">
            {threads.map((th) => (
              <button
                key={th.id}
                onClick={() => setActiveId(th.id)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors",
                  th.id === activeId ? "bg-indigo-50/60" : "hover:bg-slate-50",
                )}
              >
                <Avatar name={th.withName} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-slate-900">{th.withName}</span>
                  <span className="block truncate text-[11px] text-slate-400">{th.lastMessage}</span>
                </span>
                {th.unread > 0 ? <Badge tone="red">{th.unread}</Badge> : null}
              </button>
            ))}
          </div>
        </div>

        {/* Chat */}
        {active ? (
          <div className="hidden min-w-0 flex-1 flex-col sm:flex">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <Avatar name={active.withName} size="sm" />
              <div>
                <p className="text-sm font-semibold text-slate-900">{active.withName}</p>
                <p className="text-[11px] text-slate-400">{active.withRole}</p>
              </div>
            </div>
            <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
              {active.messages.map((m, i) => (
                <div key={i} className={cn("flex", m.from === "me" ? "justify-end" : "justify-start")}>
                  <span
                    className={cn(
                      "max-w-[75%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed",
                      m.from === "me"
                        ? "rounded-br-md bg-indigo-600 text-white"
                        : "rounded-bl-md bg-slate-100 text-slate-800",
                    )}
                  >
                    {m.text}
                    <span className={cn("mt-1 block text-right text-[10px]", m.from === "me" ? "text-indigo-200" : "text-slate-400")}>
                      {m.time}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 border-t border-slate-100 p-3">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={t("msg.type")}
                className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm focus:border-indigo-400 focus:outline-none"
              />
              <button
                onClick={send}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-700"
                aria-label={t("msg.send")}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </Card>
    </>
  );
}
