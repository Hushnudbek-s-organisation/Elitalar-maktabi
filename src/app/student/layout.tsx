"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bell, BookOpen, CalendarDays, LayoutDashboard, LogOut, Menu, MessageCircle,
  MessageSquare, Moon, Settings, Sun, Trophy, Wallet, X,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { clearSession, getStoredSession } from "@/lib/session";
import { useNotificationStore } from "@/store/useNotificationStore";
import type { Notification, Profile } from "@/types";

const navItems = [
  { title: "Asosiy", href: "/student/dashboard", icon: LayoutDashboard },
  { title: "Dars jadvali", href: "/student/timetable", icon: CalendarDays },
  { title: "Ta'lim", href: "/student/education", icon: BookOpen },
  { title: "Hamyon", href: "/student/wallet", icon: Wallet },
  { title: "Sinf reytingi", href: "/student/ranking", icon: Trophy },
  { title: "Messenger", href: "/student/messenger", icon: MessageCircle },
];

const pageTitles: Record<string, string> = Object.fromEntries(navItems.map((item) => [item.href, item.title]));

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const notifications = useNotificationStore((state) => state.notifications);
  const setNotifications = useNotificationStore((state) => state.setNotifications);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const markNotificationRead = useNotificationStore((state) => state.markAsRead);
  const markAllNotificationsRead = useNotificationStore((state) => state.markAllAsRead);

  const [student, setStudent] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isChanging, setIsChanging] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ message: "", isAnonymous: false });
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const updateSidebar = () => setIsSidebarOpen(media.matches);
    updateSidebar();
    media.addEventListener?.("change", updateSidebar);
    return () => media.removeEventListener?.("change", updateSidebar);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const dark = savedTheme === "dark";
    setIsDarkMode(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  useEffect(() => {
    const session = getStoredSession();
    if (!session.id || session.role !== "student") {
      router.replace("/");
      return;
    }
    if (!isSupabaseConfigured) {
      setLoadError("Supabase sozlanmagan. Administrator .env.local faylini to'ldirishi kerak.");
      setLoading(false);
      return;
    }

    let alive = true;
    const loadStudent = async () => {
      setLoading(true);
      setLoadError("");
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, class_name, pp_balance, cp_score, avatar_url, username")
        .eq("id", session.id)
        .maybeSingle();
      if (!alive) return;
      if (error) {
        setLoadError("Profilni yuklab bo'lmadi. Baza ruxsatlari va ulanishini tekshiring.");
        setLoading(false);
        return;
      }
      if (!data || data.role !== "student") {
        clearSession();
        router.replace("/");
        return;
      }
      setStudent(data as Profile);

      const { data: items, error: notificationError } = await supabase
        .from("notifications")
        .select("id, user_id, title, message, is_read, created_at")
        .eq("user_id", session.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (!alive) return;
      if (notificationError) {
        console.error("Bildirishnomalarni yuklashda xatolik:", notificationError.message);
      } else {
        setNotifications((items ?? []) as Notification[]);
      }
      setLoading(false);
    };

    void loadStudent();
    const channel = supabase
      .channel(`student-notifications-${session.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${session.id}` }, (payload) => {
        addNotification(payload.new as Notification);
      })
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [addNotification, router, setNotifications]);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications]);
  const isMessenger = pathname === "/student/messenger";
  const currentTitle = pageTitles[pathname] || "O'quvchi paneli";

  const toggleTheme = () => {
    const next = !isDarkMode;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDarkMode(next);
  };

  const handleLogout = () => {
    clearSession();
    setNotifications([]);
    router.replace("/");
  };

  const markAsRead = async (item: Notification) => {
    if (item.is_read) return;
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", item.id).eq("user_id", student?.id);
    if (error) {
      toast.error("Bildirishnomani yangilab bo'lmadi.");
      return;
    }
    markNotificationRead(item.id);
  };

  const markAllAsRead = async () => {
    if (!student || unreadCount === 0) return;
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", student.id).eq("is_read", false);
    if (error) {
      toast.error("Bildirishnomalarni yangilab bo'lmadi.");
      return;
    }
    markAllNotificationsRead();
    setShowNotifDropdown(false);
  };

  const handleSendFeedback = async () => {
    const message = feedbackForm.message.trim();
    if (!student || !message) {
      toast.error("Murojaat matnini kiriting.");
      return;
    }
    setIsSendingFeedback(true);
    const { error } = await supabase.from("feedbacks").insert([{
      sender_id: feedbackForm.isAnonymous ? null : student.id,
      sender_name: feedbackForm.isAnonymous ? "Anonim" : student.full_name,
      message,
      is_anonymous: feedbackForm.isAnonymous,
    }]);
    setIsSendingFeedback(false);
    if (error) {
      toast.error("Murojaat yuborilmadi. Birozdan so'ng qayta urinib ko'ring.");
      return;
    }
    toast.success("Murojaatingiz yuborildi. Rahmat!");
    setShowFeedbackModal(false);
    setFeedbackForm({ message: "", isAnonymous: false });
  };

  const handleChangePassword = async () => {
    const password = newPassword;
    if (!student || password.length < 6) {
      toast.error("Yangi parol kamida 6 ta belgidan iborat bo'lsin.");
      return;
    }
    setIsChanging(true);
    const { error } = await supabase.from("profiles").update({ password }).eq("id", student.id);
    setIsChanging(false);
    if (error) {
      toast.error("Parolni yangilab bo'lmadi.");
      return;
    }
    toast.success("Parol yangilandi.");
    setNewPassword("");
    setShowSettingsModal(false);
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50"><div className="flex flex-col items-center gap-3 text-slate-500"><span className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /><span className="text-sm font-semibold">Ma'lumotlar yuklanmoqda...</span></div></div>;
  }

  if (loadError || !student) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><Bell className="h-6 w-6" /></div>
          <h1 className="mt-4 text-xl font-black text-slate-950">Kabinetni ochib bo'lmadi</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{loadError || "Profil topilmadi yoki tizimdan chiqilgan."}</p>
          <button onClick={() => router.replace("/")} className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-blue-600">Kirish sahifasiga qaytish</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-slate-50 text-slate-900 transition-colors dark:bg-[#0e1621] dark:text-slate-200">
      {isSidebarOpen && <button aria-label="Menyuni yopish" className="fixed inset-0 z-40 bg-slate-950/40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-[#111b27] md:relative md:z-20 ${isSidebarOpen ? "translate-x-0 md:w-72" : "-translate-x-full md:translate-x-0 md:w-0"}`}>
        <div className="flex h-20 min-w-72 items-center gap-3 border-b border-slate-100 px-6 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white shadow-lg shadow-blue-600/20">E</div>
          <div><p className="text-lg font-black tracking-[0.16em] text-slate-950 dark:text-white">ELITA</p><p className="text-[11px] font-semibold text-slate-400">O'quvchi portali</p></div>
          <button className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-100 md:hidden" onClick={() => setIsSidebarOpen(false)} aria-label="Menyuni yopish"><X className="h-5 w-5" /></button>
        </div>

        <nav aria-label="Asosiy menyu" className="custom-scrollbar min-w-72 flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map(({ title, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} onClick={() => { if (window.innerWidth < 768) setIsSidebarOpen(false); }} className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-bold transition ${active ? "bg-blue-600 text-white shadow-md shadow-blue-600/15" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"}`}>
                <Icon className="h-5 w-5 shrink-0" />{title}
              </Link>
            );
          })}
        </nav>

        <div className="min-w-72 space-y-1 border-t border-slate-100 p-4 dark:border-slate-800">
          <button onClick={() => setShowSettingsModal(true)} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"><Settings className="h-5 w-5" />Sozlamalar</button>
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"><LogOut className="h-5 w-5" />Tizimdan chiqish</button>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-[#111b27]/95 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setIsSidebarOpen((open) => !open)} className="rounded-xl bg-slate-100 p-2.5 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700" aria-label="Menyuni ochish yoki yopish"><Menu className="h-5 w-5" /></button>
            <div className="min-w-0"><h1 className="truncate text-sm font-black text-slate-900 dark:text-white sm:text-base">{currentTitle}</h1><p className="hidden text-xs text-slate-400 sm:block">Assalomu alaykum, {student.full_name.split(" ")[0]}</p></div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={toggleTheme} className="rounded-xl bg-slate-100 p-2.5 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700" aria-label={isDarkMode ? "Yorug' rejim" : "Tungi rejim"}>{isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
            <div className="relative">
              <button onClick={() => setShowNotifDropdown((open) => !open)} className="relative rounded-xl bg-slate-100 p-2.5 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700" aria-label={`Bildirishnomalar, ${unreadCount} ta o'qilmagan`} aria-expanded={showNotifDropdown}>
                <Bell className="h-5 w-5" />{unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full border-2 border-white bg-rose-500 px-1 text-center text-[10px] font-black leading-4 text-white dark:border-[#111b27]">{unreadCount > 9 ? "9+" : unreadCount}</span>}
              </button>
              {showNotifDropdown && (
                <div className="absolute right-0 top-14 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#17212b]">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                    <h2 className="font-black text-slate-900 dark:text-white">Bildirishnomalar</h2>
                    {unreadCount > 0 && <button onClick={markAllAsRead} className="text-xs font-bold text-blue-600">Barchasini o'qish</button>}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? <p className="px-4 py-8 text-center text-sm text-slate-500">Hozircha xabarlar yo'q.</p> : notifications.map((item) => (
                      <button key={item.id} onClick={() => void markAsRead(item)} className={`block w-full border-b border-slate-100 px-4 py-3 text-left last:border-0 dark:border-slate-700/70 ${item.is_read ? "hover:bg-slate-50 dark:hover:bg-slate-800" : "bg-blue-50/70 dark:bg-blue-900/10"}`}>
                        <span className="flex items-center justify-between gap-3 text-sm font-bold text-slate-900 dark:text-white"><span className="line-clamp-1">{item.title}</span>{!item.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />}</span>
                        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500 dark:text-slate-400">{item.message}</span>
                        {item.created_at && <span className="mt-1.5 block text-[10px] text-slate-400">{new Date(item.created_at).toLocaleString("uz-UZ", { dateStyle: "short", timeStyle: "short" })}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="ml-1 flex items-center gap-2 border-l border-slate-200 pl-3 dark:border-slate-700 sm:pl-4">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-black text-blue-700 dark:bg-blue-600 dark:text-white">{student.avatar_url ? <img src={student.avatar_url} alt="" className="h-full w-full object-cover" /> : student.full_name.slice(0, 1).toUpperCase()}</div>
              <span className="hidden max-w-36 truncate text-sm font-bold text-slate-700 dark:text-slate-200 lg:block">{student.full_name}</span>
            </div>
          </div>
        </header>

        <main className={`min-h-0 flex-1 overflow-y-auto ${isMessenger ? "bg-[#0e1621] p-0" : "bg-slate-50 p-4 dark:bg-[#0e1621] sm:p-6 lg:p-8"}`}>
          {children}
        </main>

        {!isMessenger && <button onClick={() => setShowFeedbackModal(true)} className="fixed bottom-5 right-4 z-30 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-xl shadow-blue-600/20 transition hover:bg-blue-700 sm:bottom-6 sm:right-6"><MessageSquare className="h-4 w-4" /><span className="hidden sm:inline">Murojaat yo'llash</span><span className="sm:hidden">Murojaat</span></button>}
      </div>

      {showSettingsModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowSettingsModal(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="settings-title" className="w-full max-w-md rounded-3xl border border-white/80 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-[#17212b] sm:p-8">
            <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-blue-600">Hisob xavfsizligi</p><h2 id="settings-title" className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Sozlamalar</h2></div><button onClick={() => setShowSettingsModal(false)} aria-label="Yopish" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
            <label htmlFor="new-password" className="mb-2 mt-7 block text-sm font-bold text-slate-700 dark:text-slate-300">Yangi parol (kamida 6 belgi)</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength={6} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Yangi parol" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0e1621] dark:text-white" />
            <button onClick={handleChangePassword} disabled={isChanging || newPassword.length < 6} className="mt-4 w-full rounded-xl bg-blue-600 py-3.5 font-black text-white transition hover:bg-blue-700 disabled:opacity-50">{isChanging ? "SAQLANMOQDA..." : "PAROLNI YANGILASH"}</button>
          </section>
        </div>
      )}

      {showFeedbackModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSendingFeedback) setShowFeedbackModal(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="feedback-title" className="w-full max-w-md overflow-hidden rounded-3xl border border-white bg-white shadow-2xl dark:border-slate-700 dark:bg-[#17212b]">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-700"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><MessageSquare className="h-5 w-5" /></span><h2 id="feedback-title" className="font-black text-slate-950 dark:text-white">Murojaat yo'llash</h2></div><button onClick={() => setShowFeedbackModal(false)} aria-label="Yopish" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
            <div className="space-y-4 p-5">
              <label htmlFor="feedback-message" className="sr-only">Murojaat matni</label>
              <textarea id="feedback-message" rows={5} maxLength={2000} placeholder="Savol yoki taklifingizni yozing..." value={feedbackForm.message} onChange={(event) => setFeedbackForm({ ...feedbackForm, message: event.target.value })} className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0e1621] dark:text-white" />
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700"><input type="checkbox" checked={feedbackForm.isAnonymous} onChange={(event) => setFeedbackForm({ ...feedbackForm, isAnonymous: event.target.checked })} className="mt-0.5 h-4 w-4 accent-blue-600" /><span><span className="block text-sm font-bold text-slate-800 dark:text-slate-200">Anonim yuborish</span><span className="mt-0.5 block text-xs text-slate-500">Ismingiz va profilingiz murojaat bilan saqlanmaydi.</span></span></label>
              <button onClick={handleSendFeedback} disabled={isSendingFeedback || !feedbackForm.message.trim()} className="w-full rounded-xl bg-blue-600 py-3.5 font-black text-white transition hover:bg-blue-700 disabled:opacity-50">{isSendingFeedback ? "YUBORILMOQDA..." : "YUBORISH"}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
