"use client";

// Ctrl+K — global qidiruv (o'quvchi < 3 soniyada topilishi kerak)

import * as React from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Search, UserSquare2, CalendarDays, BookOpen } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { STUDENTS, TEACHERS, subjectById } from "@/lib/demo-data";
import { useSession, isAdmin, isStaff } from "@/lib/session";

interface PaletteItem {
  id: string;
  label: string;
  hint: string;
  group: string;
  href: string;
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const account = useSession((s) => s.account);
  const [query, setQuery] = React.useState("");
  const [elapsed, setElapsed] = React.useState<number | null>(null);
  const startedAt = React.useRef<number>(0);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setElapsed(null);
      startedAt.current = performance.now();
    }
  }, [open]);

  const items = React.useMemo<PaletteItem[]>(() => {
    const role = account?.role;
    const list: PaletteItem[] = [];
    // Sahifalar
    if (role) {
      const pages: [string, string, string][] = [
        ["Boshqaruv paneli", "Sahifa", "/dashboard"],
        ["Dars jadvali", "Sahifa", "/timetable"],
        ["E'lonlar", "Sahifa", "/announcements"],
      ];
      if (isStaff(role)) {
        pages.push(["O'quvchilar", "Sahifa", "/students"], ["Jurnal", "Sahifa", "/journal"]);
      }
      if (isAdmin(role)) {
        pages.push(["O'qituvchilar", "Sahifa", "/teachers"], ["Sozlamalar", "Sahifa", "/settings"]);
      }
      for (const [label, hint, href] of pages) list.push({ id: href, label, hint, group: "Sahifalar", href });
    }
    // O'quvchilar (PII: faqat xodimlar ko'radi)
    if (account && isStaff(account.role)) {
      for (const st of STUDENTS) {
        list.push({
          id: `st-${st.id}`,
          label: st.name,
          hint: `${st.admissionNumber}`,
          group: "O'quvchilar",
          href: `/students?focus=${st.id}`,
        });
      }
      for (const tc of TEACHERS) {
        list.push({
          id: `tc-${tc.id}`,
          label: tc.name,
          hint: tc.subjectIds.map((sid) => subjectById(sid).name).join(", "),
          group: "O'qituvchilar",
          href: `/teachers?focus=${tc.id}`,
        });
      }
    }
    return list;
  }, [account]);

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.filter((i) => i.group === "Sahifalar").slice(0, 6);
    return items
      .filter((i) => i.label.toLowerCase().includes(q) || i.hint.toLowerCase().includes(q))
      .slice(0, 10);
  }, [items, query]);

  const onQuery = (v: string) => {
    setQuery(v);
    if (elapsed === null) setElapsed(Math.round(performance.now() - startedAt.current));
  };

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[15%] max-w-xl translate-y-0 p-0">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) go(results[0].href);
            }}
            placeholder="O'quvchi, o'qituvchi yoki sahifa..."
            className="h-14 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {elapsed !== null && query ? (
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
              {elapsed} ms
            </span>
          ) : null}
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-400">Hech narsa topilmadi</p>
          ) : (
            results.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => go(item.href)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-100",
                  idx === 0 && "bg-slate-50",
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  {item.group === "Sahifalar" ? (
                    <CalendarDays className="h-4 w-4" />
                  ) : item.group === "O'quvchilar" ? (
                    <GraduationCap className="h-4 w-4" />
                  ) : (
                    <UserSquare2 className="h-4 w-4" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900">{item.label}</span>
                  <span className="block truncate text-xs text-slate-400">{item.hint}</span>
                </span>
                {item.group !== "Sahifalar" ? (
                  <BookOpen className="h-4 w-4 shrink-0 text-slate-300" />
                ) : null}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
