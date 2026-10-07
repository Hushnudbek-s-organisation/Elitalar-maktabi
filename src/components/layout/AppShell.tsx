"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  Settings,
  Users,
  UserSquare2,
  ClipboardList,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { ROLE_LABELS_UZ, type Role } from "@/types/demo";
import { Avatar } from "@/components/ui/core";
import { CommandPalette } from "@/components/layout/CommandPalette";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: Record<Role, NavItem[]> = {
  DIRECTOR: [
    { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/students", label: t("nav.students"), icon: Users },
    { href: "/teachers", label: t("nav.teachers"), icon: UserSquare2 },
    { href: "/timetable", label: t("nav.timetable"), icon: CalendarDays },
    { href: "/announcements", label: t("nav.announcements"), icon: Megaphone },
    { href: "/settings", label: t("nav.settings"), icon: Settings },
  ],
  ADMIN: [
    { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/students", label: t("nav.students"), icon: Users },
    { href: "/teachers", label: t("nav.teachers"), icon: UserSquare2 },
    { href: "/timetable", label: t("nav.timetable"), icon: CalendarDays },
    { href: "/announcements", label: t("nav.announcements"), icon: Megaphone },
    { href: "/settings", label: t("nav.settings"), icon: Settings },
  ],
  CLASS_TEACHER: [
    { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/journal", label: t("nav.journal"), icon: BookOpen },
    { href: "/timetable", label: t("nav.timetable"), icon: CalendarDays },
    { href: "/students", label: t("nav.students"), icon: Users },
    { href: "/homework", label: t("nav.homework"), icon: ClipboardList },
    { href: "/messages", label: t("nav.messages"), icon: MessageSquare },
    { href: "/announcements", label: t("nav.announcements"), icon: Megaphone },
  ],
  TEACHER: [
    { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/journal", label: t("nav.journal"), icon: BookOpen },
    { href: "/timetable", label: t("nav.timetable"), icon: CalendarDays },
    { href: "/students", label: t("nav.students"), icon: Users },
    { href: "/homework", label: t("nav.homework"), icon: ClipboardList },
    { href: "/messages", label: t("nav.messages"), icon: MessageSquare },
  ],
  PARENT: [
    { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/children", label: t("nav.children"), icon: Users },
    { href: "/timetable", label: t("nav.timetable"), icon: CalendarDays },
    { href: "/homework", label: t("nav.homework"), icon: ClipboardList },
    { href: "/messages", label: t("nav.messages"), icon: MessageSquare },
    { href: "/announcements", label: t("nav.announcements"), icon: Megaphone },
  ],
  STUDENT: [
    { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/children", label: "Baholarim", icon: GraduationCap },
    { href: "/timetable", label: t("nav.timetable"), icon: CalendarDays },
    { href: "/homework", label: t("nav.homework"), icon: ClipboardList },
    { href: "/announcements", label: t("nav.announcements"), icon: Megaphone },
  ],
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { account, logout } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  React.useEffect(() => {
    if (!account) router.replace("/login");
  }, [account, router]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!account) return null;

  const items = NAV[account.role];
  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-base font-bold leading-tight text-slate-900">SchoolOS</span>
            <span className="block text-[11px] font-medium text-slate-400">Maktab boshqaruvi</span>
          </span>
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active(item.href)
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <Avatar name={account.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-900">{account.name}</p>
              <p className="truncate text-[11px] text-slate-400">{ROLE_LABELS_UZ[account.role]}</p>
            </div>
            <button
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-600"
              title={t("nav.logout")}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        {items.slice(0, 5).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium",
              active(item.href) ? "text-indigo-600" : "text-slate-400",
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="max-w-full truncate px-1">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Topbar */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur lg:pl-64">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white lg:hidden">
            <GraduationCap className="h-4 w-4" />
          </span>
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 max-w-md flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400 transition-colors hover:bg-slate-100"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 truncate text-left">{t("common.search")}</span>
            <kbd className="hidden rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 sm:block">
              Ctrl K
            </kbd>
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="hidden rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 sm:block">
              {t("common.demo")}
            </span>
            <button
              className="relative rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100"
              title={t("nav.announcements")}
              onClick={() => router.push("/announcements")}
            >
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
            </button>
            <span className="lg:hidden">
              <Avatar name={account.name} size="sm" />
            </span>
          </div>
        </div>
      </header>

      <main className="px-4 pb-24 pt-5 sm:px-6 lg:pb-10 lg:pl-[17.5rem] lg:pr-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
