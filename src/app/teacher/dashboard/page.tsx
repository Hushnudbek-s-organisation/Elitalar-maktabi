"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, Users, Calendar, Award, Star, BookOpen,
  Clock, ShieldCheck, CheckCircle, LogOut, Settings,
  TableProperties, Send, AlertCircle, X, PlusCircle, Edit, ListTodo, DownloadCloud, MessageCircle, MoreVertical, Search, BellOff, Trash2, Ban, Copy, ChevronDown, ChevronLeft, Loader2, MessageSquare, FileText
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getStoredSession, clearSession } from "@/lib/session";
import { getDatesInRange, parseDate, getWeekdayCode } from "@/lib/utils";
import ManagePointsModal, { type AttendanceCode } from "@/components/teacher/ManagePointsModal";
import { useRouter } from "next/navigation";

const HOLIDAYS = new Set(["01.10.2026", "08.12.2026", "01.01.2027", "08.03.2027", "21.03.2027", "22.03.2027", "09.05.2027"]);
function formatDate(dateValue: string) {
  const date = parseDate(dateValue);
  if (!date) return dateValue;
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
}
function getLocalISODate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function getDayName(dateValue: string) {
  const date = parseDate(dateValue);
  if (!date) return "";
  return ["Yak", "Du", "Se", "Ch", "Pa", "Ju", "Sh"][date.getDay()];
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false); // ✅ HYDRATION HIMOYASI
  const [currentTeacher, setCurrentTeacher] = useState<any>(null);
  const [activeMenu, setActiveMenu] = useState<"boshqaruv" | "timetable" | "jurnal" | "ish_reja" | "homeroom" | "settings" | "messenger">("boshqaruv");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [myStudents, setMyStudents] = useState<any[]>([]);
  const [myTimetable, setMyTimetable] = useState<any[]>([]);
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [myClasses, setMyClasses] = useState<string[]>([]);

  // SOZLAMALAR
  const [newPassword, setNewPassword] = useState("");
  const [isChanging, setIsChanging] = useState(false);

  // MUROJAAT (FEEDBACK)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ message: "", isAnonymous: false });
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  // MESSENGER
  const [contacts, setContacts] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactForm, setContactForm] = useState({ id: "", name: "" });
  const [showChatMenu, setShowChatMenu] = useState(false);

  // CHORAK VA JADVAL STATE'LARI
  const [selectedTerm, setSelectedTerm] = useState("1-chorak");
  const [selectedTermPlan, setSelectedTermPlan] = useState("1-chorak");

  // ISH REJA
  const [selectedClassForPlan, setSelectedClassForPlan] = useState("");
  const [generatedDates, setGeneratedDates] = useState<any[]>([]);
  const [planForm, setPlanForm] = useState<{ [key: string]: { topic: string, homework: string, deadline: string } }>({});
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isSyncingPlan, setIsSyncingPlan] = useState(false);

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkTopicsText, setBulkTopicsText] = useState("");

  const [showSyncModal, setShowSyncModal] = useState(false);
  const [targetClassForSync, setTargetClassForSync] = useState("");

  // JURNAL
  const [selectedClassToGrade, setSelectedClassToGrade] = useState("");
  const [studentsInJournal, setStudentsInJournal] = useState<any[]>([]);
  const [isJournalLoading, setIsJournalLoading] = useState(false);
  const [journalError, setJournalError] = useState("");
  const [journalRetry, setJournalRetry] = useState(0);
  const [pastFixCounts, setPastFixCounts] = useState<any>({});

  const [gradeModal, setGradeModal] = useState<{ isOpen: boolean, type: 'today' | 'past' | 'bsb' | 'future', student: any, col: any } | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<'keldi' | 'dq' | 'k'>('keldi');
  const [gradeInput, setGradeInput] = useState({ classwork: "", homework: "" });
  const [ppRequestType, setPpRequestType] = useState("+1");
  const [isGrading, setIsGrading] = useState(false);

  // ✅ HAFTA KUNLARI TARJIMASI
  const days = ["Du", "Se", "Ch", "Pa", "Ju", "Sh"];
  const fullDayNames: Record<string, string> = {
    "Du": "Dushanba", "Se": "Seshanba", "Ch": "Chorshanba",
    "Pa": "Payshanba", "Ju": "Juma", "Sh": "Shanba"
  };
  const lessonNumbers = [1, 2, 3, 4, 5, 6];

  const todayNameString = getWeekdayCode() ?? "Du";

  // Contact list has a stable callback so the auth bootstrap effect only reruns when needed.
  const loadContacts = useCallback(async (teacherId: string) => {
    const { data, error } = await supabase.from("contacts")
      .select("id, owner_id, contact_id, contact_name")
      .eq("owner_id", teacherId);
    if (error) {
      console.error("Kontaktlarni yuklashda xatolik:", error);
      setLoadError("Kontaktlarni yuklab bo'lmadi. Messenger uchun RLS ruxsatlarini tekshiring.");
      return;
    }
    setContacts(data ?? []);
  }, []);

  const fetchTeacherData = useCallback(async (teacherId: string) => {
    setIsLoading(true);
    setLoadError("");
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role, bio, homeroom, username")
        .eq("id", teacherId)
        .maybeSingle();
      if (profileError) {
        setLoadError("O'qituvchi ma'lumotlarini yuklab bo'lmadi. Baza ulanishi yoki RLS ruxsatlarini tekshiring.");
        return;
      }
      if (!profile || profile.role !== "teacher") {
        clearSession();
        router.replace("/");
        return;
      }

      setCurrentTeacher(profile);
      const [studentsResponse, scheduleResponse, classesResponse] = await Promise.all([
        profile.homeroom
          ? supabase.from("profiles").select("id, full_name, class_name, cp_score").eq("role", "student").eq("class_name", profile.homeroom).order("full_name")
          : Promise.resolve({ data: [], error: null }),
        supabase.from("timetable").select("id, class_name, day_of_week, lesson_number, subject, teacher_id, group_type, room, term, start_date, end_date").eq("teacher_id", profile.id),
        supabase.from("classes").select("name, max_limit, total_cp, homeroom_teacher").order("name"),
      ]);
      if (studentsResponse.error || scheduleResponse.error || classesResponse.error) {
        setLoadError("Ayrim ma'lumotlar yuklanmadi. Supabase jadval nomlari va ruxsatlarini tekshiring.");
      }
      setMyStudents(studentsResponse.data || []);
      const schedule = scheduleResponse.data || [];
      setMyTimetable(schedule);
      setMyClasses([...new Set([...schedule.map((item: any) => item.class_name), profile.homeroom].filter(Boolean))].sort());
      setAllClasses(classesResponse.data || []);
      await loadContacts(profile.id);
    } catch (error) {
      console.error(error);
      setLoadError("O'qituvchi panelini yuklashda kutilmagan xatolik yuz berdi.");
    } finally {
      setIsLoading(false);
    }
  }, [loadContacts, router]);

  // ==========================================
  // XAVFSIZ YUKLASH TIZIMI
  // ==========================================
  useEffect(() => {
    setIsMounted(true);
    const session = getStoredSession();
    if (!session.id || session.role !== "teacher") {
      clearSession();
      setIsLoading(false);
      router.replace("/");
      return;
    }
    if (!isSupabaseConfigured) {
      setLoadError("Supabase sozlanmagan. Administrator .env.local faylini tekshirishi kerak.");
      setIsLoading(false);
      return;
    }
    void fetchTeacherData(session.id);
  }, [fetchTeacherData, router]);

  const todayClasses = myTimetable.filter(t => t.day_of_week === todayNameString).sort((a,b) => a.lesson_number - b.lesson_number);

  const goToJournal = async (className: string) => {
    setActiveMenu("jurnal");
    handleSelectClassJournal(className);
  };

  const handleLogout = () => {
    clearSession();
    router.replace("/");
  };

  // MUROJAATNI YUBORISH
  const handleSendFeedback = async () => {
    const message = feedbackForm.message.trim();
    if (!message) return alert("Xabar yozing!");
    setIsSendingFeedback(true);
    try {
      const { error } = await supabase.from("feedbacks").insert([{
        sender_id: currentTeacher.id,
        sender_name: currentTeacher.full_name,
        message,
        is_anonymous: feedbackForm.isAnonymous,
      }]);
      if (error) throw error;
      alert("Murojaatingiz yuborildi.");
      setShowFeedbackModal(false);
      setFeedbackForm({ message: "", isAnonymous: false });
    } catch (error) {
      console.error("Murojaat yuborishda xatolik:", error);
      alert(error instanceof Error ? error.message : "Murojaatni yuborib bo'lmadi. Qayta urinib ko'ring.");
    } finally {
      setIsSendingFeedback(false);
    }
  };

  // MESSENGER
  const loadMessages = async (contactId: string) => {
    if (!currentTeacher?.id || !/^[A-Z0-9_-]{1,40}$/i.test(contactId)) {
      setMessages([]);
      return;
    }
    setMessages([]);
    const teacherId = currentTeacher.id;
    const { data, error } = await supabase.from("messages")
      .select("id, sender_id, receiver_id, text, created_at")
      .or(`and(sender_id.eq.${teacherId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${teacherId})`)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Xabarlarni yuklashda xatolik:", error);
      alert("Xabarlar yuklanmadi. Ulanish yoki ruxsatlarni tekshiring.");
      return;
    }
    setMessages(data ?? []);
  };

  const handleAddContact = async () => {
    const contactId = contactForm.id.trim().toUpperCase();
    const contactName = contactForm.name.trim();
    if (!/^[A-Z0-9_-]{1,40}$/.test(contactId) || !contactName) return alert("To'g'ri ID va kontakt nomini kiriting.");
    if (contactId === currentTeacher.id) return alert("O'zingizni kontakt sifatida qo'sha olmaysiz.");

    setIsSavingContact(true);
    try {
      const { data: profile, error: profileError } = await supabase.from("profiles").select("id").eq("id", contactId).maybeSingle();
      if (profileError) throw profileError;
      if (!profile) return alert("Bu ID bo'yicha foydalanuvchi topilmadi.");
      const { data: existing, error: existingError } = await supabase.from("contacts").select("id").eq("owner_id", currentTeacher.id).eq("contact_id", contactId).maybeSingle();
      if (existingError) throw existingError;
      if (existing) return alert("Bu kontakt allaqachon ro'yxatda bor.");
      const { error } = await supabase.from("contacts").insert([{ owner_id: currentTeacher.id, contact_id: contactId, contact_name: contactName }]);
      if (error) throw error;
      setShowAddContact(false);
      setContactForm({ id: "", name: "" });
      await loadContacts(currentTeacher.id);
    } catch (error) {
      console.error("Kontakt qo'shishda xatolik:", error);
      alert(error instanceof Error ? error.message : "Kontaktni qo'shib bo'lmadi.");
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = msgInput.trim();
    const chat = activeChat;
    if (!text || !chat || isSendingMessage) return;
    const optimisticId = `pending-${Date.now()}`;
    const optimisticMessage = { id: optimisticId, sender_id: currentTeacher.id, receiver_id: chat.contact_id, text, created_at: new Date().toISOString() };
    setMessages((previous) => [...previous, optimisticMessage]);
    setMsgInput("");
    setIsSendingMessage(true);
    try {
      const { error } = await supabase.from("messages").insert([{ sender_id: currentTeacher.id, receiver_id: chat.contact_id, text }]);
      if (error) throw error;
    } catch (error) {
      console.error("Xabar yuborishda xatolik:", error);
      setMessages((previous) => previous.filter((message) => message.id !== optimisticId));
      if (activeChat?.contact_id === chat.contact_id) setMsgInput(text);
      alert(error instanceof Error ? error.message : "Xabar yuborilmadi. Qayta urinib ko'ring.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleClearHistory = async () => {
    if (!activeChat || !confirm("Ushbu suhbat tarixini butunlay o'chirishni xohlaysizmi?")) return;
    const contactId = activeChat.contact_id;
    const teacherId = currentTeacher.id;
    const { error } = await supabase.from("messages").delete()
      .or(`and(sender_id.eq.${teacherId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${teacherId})`);
    if (error) {
      console.error("Suhbat tarixini o'chirishda xatolik:", error);
      alert("Suhbat tarixini o'chirib bo'lmadi.");
      return;
    }
    setMessages([]);
    setShowChatMenu(false);
  };

  // ISH REJA
  const generateLessonDates = () => {
    if (!selectedClassForPlan) return;
    const classSchedule = myTimetable.filter(t => t.class_name === selectedClassForPlan && t.term === selectedTermPlan);
    if (classSchedule.length === 0) return alert("Bu sinf va chorak uchun dars jadvali tuzilmagan!");

    const lessonDays = Array.from(new Set(classSchedule.map(t => t.day_of_week)));
    const startDate = classSchedule[0].start_date;
    const endDate = classSchedule[0].end_date;
    if(!startDate || !endDate) return alert("Chorak sanalari belgilanmagan!");

    const allDates = getDatesInRange(startDate, endDate);
    const validLessonDates = [];
    for (let d of allDates) {
      const dayName = getDayName(d);
      const formattedD = formatDate(d);
      if (lessonDays.includes(dayName) && !HOLIDAYS.has(formattedD)) {
        validLessonDates.push({ date: d, label: formattedD, dayName });
      }
    }
    setGeneratedDates(validLessonDates);
    setPlanForm({});
  };

  const handleBulkInsert = () => {
    const topics = bulkTopicsText.split('\n').filter(t => t.trim() !== "");
    const newPlanForm = { ...planForm };
    for (let i = 0; i < Math.min(topics.length, generatedDates.length); i++) {
      newPlanForm[generatedDates[i].date] = { topic: topics[i], homework: "Mavzuni o'qish", deadline: "Keyingi darsgacha" };
    }
    setPlanForm(newPlanForm);
    setShowBulkModal(false);
    setBulkTopicsText("");
  };

  const handlePlanChange = (date: string, field: string, value: string) => {
    setPlanForm({ ...planForm, [date]: { ...planForm[date], [field]: value } });
  };

  const handleSaveFullPlan = async () => {
    if (!selectedClassForPlan) return;
    const homeworkRows = generatedDates.flatMap((gDate) => {
      const plan = planForm[gDate.date];
      if (!plan?.topic.trim()) return [];
      return [{
        class_name: selectedClassForPlan,
        subject: currentTeacher.bio,
        topic: plan.topic.trim(),
        description: plan.homework.trim(),
        deadline: plan.deadline || "Keyingi darsgacha",
        date: gDate.date,
      }];
    });
    if (!homeworkRows.length) return alert("Hech qanday mavzu kiritilmadi. Avvalgi vazifalar o'zgartirilmadi.");

    setIsSavingPlan(true);
    try {
      const { data: oldRows, error: oldError } = await supabase.from("homeworks").select("id").eq("class_name", selectedClassForPlan).eq("subject", currentTeacher.bio);
      if (oldError) throw oldError;
      const { data: insertedRows, error: insertError } = await supabase.from("homeworks").insert(homeworkRows).select("id");
      if (insertError) throw insertError;
      const insertedIds = (insertedRows ?? []).map((row) => row.id).filter(Boolean);
      if (insertedIds.length !== homeworkRows.length) {
        if (insertedIds.length) await supabase.from("homeworks").delete().in("id", insertedIds);
        throw new Error("Yangi vazifalarning hammasi saqlanmadi; avvalgi vazifalar saqlab qolindi.");
      }
      const oldIds = (oldRows ?? []).map((row) => row.id).filter((id) => !insertedIds.includes(id));
      if (oldIds.length) {
        const { error: deleteError } = await supabase.from("homeworks").delete().in("id", oldIds);
        if (deleteError) {
          const { error: rollbackError } = await supabase.from("homeworks").delete().in("id", insertedIds);
          throw new Error(rollbackError ? "Yangi rejalar saqlandi, lekin eskilarini tozalash va bekor qilishda xatolik yuz berdi." : "Avvalgi vazifalar saqlab qolindi; yangi rejalar bekor qilindi.");
        }
      }
      alert(`${homeworkRows.length} ta dars rejasi saqlandi va o'quvchilarga yuborildi.`);
    } catch (error) {
      console.error("Ish rejani saqlashda xatolik:", error);
      alert(error instanceof Error ? error.message : "Ish rejani saqlashda xatolik yuz berdi.");
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleSyncToClass = async () => {
    if (!targetClassForSync) return alert("Sinfni tanlang!");
    if (targetClassForSync === selectedClassForPlan) return alert("Boshqa sinfni tanlang!");

    const targetSchedule = myTimetable.filter((item) => item.class_name === targetClassForSync && item.term === selectedTermPlan);
    if (!targetSchedule.length) return alert("Ushbu sinf uchun dars jadvali yo'q!");
    const { start_date: startDate, end_date: endDate } = targetSchedule[0];
    if (!startDate || !endDate) return alert("Maqsadli sinf jadvalida chorak sanalari belgilanmagan!");

    const lessonDays = Array.from(new Set(targetSchedule.map((item) => item.day_of_week)));
    const targetValidDates = getDatesInRange(startDate, endDate).filter((date) => {
      const dayName = getDayName(date);
      return lessonDays.includes(dayName) && !HOLIDAYS.has(formatDate(date));
    });
    const currentTopics = generatedDates.flatMap((gDate) => {
      const plan = planForm[gDate.date];
      return plan?.topic.trim() ? [plan] : [];
    });
    if (!currentTopics.length) return alert("Sinxronlash uchun avval mavzularni kiriting!");
    const rowsToInsert = currentTopics.slice(0, targetValidDates.length).map((plan, index) => ({
      class_name: targetClassForSync,
      subject: currentTeacher.bio,
      topic: plan.topic.trim(),
      description: plan.homework.trim() || "Mavzuni takrorlash",
      deadline: plan.deadline || "Keyingi darsgacha",
      date: targetValidDates[index],
    }));
    if (!rowsToInsert.length) return alert("Tanlangan chorakda reja ko'chirish uchun dars sanasi topilmadi.");

    setIsSyncingPlan(true);
    try {
      const { data: oldRows, error: oldError } = await supabase.from("homeworks").select("id").eq("class_name", targetClassForSync).eq("subject", currentTeacher.bio);
      if (oldError) throw oldError;
      const { data: insertedRows, error: insertError } = await supabase.from("homeworks").insert(rowsToInsert).select("id");
      if (insertError) throw insertError;
      const insertedIds = (insertedRows ?? []).map((row) => row.id).filter(Boolean);
      if (insertedIds.length !== rowsToInsert.length) {
        if (insertedIds.length) await supabase.from("homeworks").delete().in("id", insertedIds);
        throw new Error("Ko'chirilgan vazifalarning hammasi saqlanmadi; avvalgi vazifalar saqlab qolindi.");
      }
      const oldIds = (oldRows ?? []).map((row) => row.id).filter((id) => !insertedIds.includes(id));
      if (oldIds.length) {
        const { error: deleteError } = await supabase.from("homeworks").delete().in("id", oldIds);
        if (deleteError) {
          const { error: rollbackError } = await supabase.from("homeworks").delete().in("id", insertedIds);
          throw new Error(rollbackError ? "Yangi vazifalar saqlandi, lekin eskilarini tozalash va bekor qilishda xatolik yuz berdi." : "Avvalgi vazifalar saqlab qolindi; ko'chirilgan vazifalar bekor qilindi.");
        }
      }
      const remaining = Math.max(0, currentTopics.length - rowsToInsert.length);
      alert(`${rowsToInsert.length} ta mavzu ${targetClassForSync} sinfiga ko'chirildi.${remaining ? ` ${remaining} ta mavzu uchun chorakda bo'sh dars sanasi qolmadi.` : ""}`);
      setShowSyncModal(false);
    } catch (error) {
      console.error("Rejani sinxronlashda xatolik:", error);
      alert(error instanceof Error ? error.message : "Rejani ko'chirishda xatolik yuz berdi.");
    } finally {
      setIsSyncingPlan(false);
    }
  };

  // JURNAL LOGIKASI
  const handleSelectClassJournal = (className: string) => setSelectedClassToGrade(className);

  useEffect(() => {
    if (!selectedClassToGrade) {
      setStudentsInJournal([]);
      setJournalError("");
      setIsJournalLoading(false);
      return;
    }
    let active = true;
    setIsJournalLoading(true);
    setJournalError("");
    void (async () => {
      try {
        const { data, error } = await supabase.from("profiles")
          .select("id, full_name, class_name, cp_score")
          .eq("role", "student")
          .eq("class_name", selectedClassToGrade)
          .order("full_name");
        if (!active) return;
        if (error) {
          setStudentsInJournal([]);
          setJournalError("Sinf o'quvchilarini yuklab bo'lmadi. Ruxsat va ulanishni tekshiring.");
          return;
        }
        setStudentsInJournal(data ?? []);
      } catch (error) {
        console.error("Jurnal ro'yxatini yuklashda xatolik:", error);
        if (active) setJournalError("Sinf o'quvchilarini yuklashda xatolik yuz berdi.");
      } finally {
        if (active) setIsJournalLoading(false);
      }
    })();
    return () => { active = false; };
  }, [selectedClassToGrade, journalRetry]);

  const handleCellClick = (student: any, col: any) => {
    if (col.type === "future") return alert("Kelajakdagi darslarga baho qo'yish taqiqlangan!");
    setAttendanceStatus('keldi');
    setGradeInput({ classwork: "", homework: "" });
    setGradeModal({ isOpen: true, type: col.type, student, col });
  };

  const submitTodayGrade = async () => {
    const student = gradeModal?.student;
    if (!student) return;

    let addedCP = 0;
    let finalVisualGrade = "";
    if (attendanceStatus === "dq") {
      addedCP = -5;
      finalVisualGrade = "DQ";
    } else if (attendanceStatus === "k") {
      finalVisualGrade = "K";
    } else {
      const enteredScores = [gradeInput.classwork, gradeInput.homework].filter((value) => value.trim() !== "");
      if (!enteredScores.length) return alert("Kamida bitta bahoni 1 dan 10 gacha kiriting.");
      if (enteredScores.some((value) => !/^(10|[1-9])$/.test(value.trim()))) {
        return alert("Baho faqat 1 dan 10 gacha bo'lgan butun son bo'lishi kerak.");
      }
      const average = enteredScores.reduce((sum, value) => sum + Number(value), 0) / enteredScores.length;
      finalVisualGrade = Number.isInteger(average) ? String(average) : average.toFixed(1);
      if (average >= 9.5) addedCP = 2;
      else if (average >= 8.5) addedCP = 1;
      else if (average >= 7.5) addedCP = 0;
      else addedCP = -2;
    }

    setIsGrading(true);
    try {
      const newCP = (Number(student.cp_score) || 0) + addedCP;
      const { data: updatedStudent, error: profileError } = await supabase
        .from("profiles")
        .update({ cp_score: newCP })
        .eq("id", student.id)
        .eq("role", "student")
        .select("id, cp_score")
        .maybeSingle();
      if (profileError) throw profileError;
      if (!updatedStudent) throw new Error("Bahoni saqlashga ruxsat berilmadi yoki o'quvchi topilmadi.");

      setStudentsInJournal((previous) => previous.map((item) => item.id === student.id ? { ...item, cp_score: newCP } : item));
      setMyStudents((previous) => previous.map((item) => item.id === student.id ? { ...item, cp_score: newCP } : item));

      let rankingWarning = "";
      const { data: allClassStudents, error: rosterError } = await supabase
        .from("profiles")
        .select("cp_score")
        .eq("role", "student")
        .eq("class_name", selectedClassToGrade);
      if (rosterError) {
        rankingWarning = " Sinf reytingini qayta hisoblab bo'lmadi.";
      } else {
        const classTotalCP = (allClassStudents ?? []).reduce((total, item) => total + (Number(item.cp_score) || 0), 0);
        const { error: classError } = await supabase.from("classes").update({ total_cp: classTotalCP }).eq("name", selectedClassToGrade);
        if (classError) rankingWarning = " Sinf reytingi saqlanmadi.";
      }

      setGradeModal(null);
      alert(`Baho saqlandi: ${finalVisualGrade}.\nNatija: ${addedCP > 0 ? `+${addedCP} CP` : addedCP < 0 ? `${addedCP} CP (jarima)` : "0 CP"}.${rankingWarning}`);
    } catch (error) {
      console.error("Bahoni saqlashda xatolik:", error);
      alert(error instanceof Error ? error.message : "Bahoni saqlashda xatolik yuz berdi.");
    } finally {
      setIsGrading(false);
    }
  };

  const submitPPRequest = async () => {
    setIsGrading(true);
    const student = gradeModal?.student;
    let amount = 0;
    let reason = "";

    if (gradeModal?.type === 'past') {
      const currentCount = pastFixCounts[student.id] || 0;
      if (currentCount === 0) amount = 500;
      else if (currentCount === 1) amount = 700;
      else amount = 1000;
      reason = `${gradeModal?.col.label} sanasidagi bahoni to'g'rilash`;
    } else {
      amount = ppRequestType === '+1' ? 10000 : 20000;
      reason = `Yozma ishdan ${ppRequestType} ball qo'shish`;
    }

    const { error } = await supabase.from('notifications').insert([{
      user_id: student.id,
      title: "Ustozdan To'lov So'rovi",
      message: `Ustoz sizdan ${amount} PP to'lov so'rayapti.\nSabab: ${reason}\n\nRozimisiz?`
    }]);

    if (!error) {
      alert(`So'rov o'quvchiga yuborildi!\nRozilik bersa sizga xabar keladi.`);
      if (gradeModal?.type === 'past') {
        setPastFixCounts({...pastFixCounts, [student.id]: (pastFixCounts[student.id] || 0) + 1});
      }
      setGradeModal(null);
    } else alert("Xatolik!");

    setIsGrading(false);
  };

  const handleChangePassword = async () => {
    const nextPassword = newPassword.trim();
    if (nextPassword.length < 8) return alert("Yangi parol kamida 8 ta belgidan iborat bo'lishi kerak.");
    setIsChanging(true);
    try {
      const { data, error } = await supabase.from("profiles").update({ password: nextPassword }).eq("id", currentTeacher.id).eq("role", "teacher").select("id").maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Parolni yangilashga ruxsat berilmadi.");
      alert("Yangi parol saqlandi. Keyingi kirishda shu paroldan foydalaning.");
      setNewPassword("");
    } catch (error) {
      console.error("Parolni yangilashda xatolik:", error);
      alert(error instanceof Error ? error.message : "Parolni yangilab bo'lmadi.");
    } finally {
      setIsChanging(false);
    }
  };

  if (!isMounted) return null; // ✅ HYDRATION HIMOYASI

  if (isLoading && !currentTeacher) {
    return <div className="flex h-screen items-center justify-center bg-slate-50 p-6"><div className="flex flex-col items-center"><Loader2 className="mb-4 h-12 w-12 animate-spin text-indigo-600"/><h2 className="text-xl font-black text-slate-800">Ma'lumotlar yuklanmoqda...</h2></div></div>;
  }
  if (loadError && !currentTeacher) {
    return <div className="flex h-screen items-center justify-center bg-slate-50 p-6"><div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl"><h2 className="text-xl font-black text-slate-900">Panelni ochib bo'lmadi</h2><p className="mt-2 text-sm leading-6 text-slate-500">{loadError}</p><button onClick={() => { const session = getStoredSession(); if (session.id) void fetchTeacherData(session.id); }} className="mt-5 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white">Qayta yuklash</button></div></div>;
  }
  if (!currentTeacher) return null;

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">

      {/* SIDEBAR */}
      <aside className="w-72 bg-indigo-950 border-r border-indigo-900 flex flex-col h-screen flex-shrink-0 z-20 text-indigo-100 hidden md:flex p-6">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-amber-500/20">
            {currentTeacher?.full_name?.charAt(0) || "T"}
          </div>
          <div>
            <h2 className="text-xl font-black text-white truncate w-40">{currentTeacher?.full_name || "O'qituvchi"}</h2>
            <p className="text-xs font-bold text-indigo-400">{currentTeacher?.bio || ""} fani o'qituvchisi</p>
          </div>
        </div>
        <nav className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <button onClick={() => setActiveMenu("boshqaruv")} className={`w-full flex items-center p-4 rounded-2xl font-bold transition-all ${activeMenu === 'boshqaruv' ? 'bg-indigo-600 text-white' : 'hover:bg-white/5 hover:text-white'}`}>
            <LayoutDashboard className="w-5 h-5 mr-3" /> Asosiy Panel
          </button>
          <button onClick={() => setActiveMenu("timetable")} className={`w-full flex items-center p-4 rounded-2xl font-bold transition-all ${activeMenu === 'timetable' ? 'bg-indigo-600 text-white' : 'hover:bg-white/5 hover:text-white'}`}>
            <Calendar className="w-5 h-5 mr-3" /> Dars Jadvalim
          </button>
          <button onClick={() => setActiveMenu("jurnal")} className={`w-full flex items-center p-4 rounded-2xl font-bold transition-all ${activeMenu === 'jurnal' ? 'bg-indigo-600 text-white' : 'hover:bg-white/5 hover:text-white'}`}>
            <TableProperties className="w-5 h-5 mr-3" /> Jurnal & Baholash
          </button>
          <button onClick={() => setActiveMenu("ish_reja")} className={`w-full flex items-center p-4 rounded-2xl font-bold transition-all ${activeMenu === 'ish_reja' ? 'bg-indigo-600 text-white' : 'hover:bg-white/5 hover:text-white'}`}>
            <ListTodo className="w-5 h-5 mr-3" /> Ish Reja
          </button>
          <button onClick={() => setActiveMenu("messenger")} className={`w-full flex items-center p-4 rounded-2xl font-bold transition-all ${activeMenu === 'messenger' ? 'bg-indigo-600 text-white' : 'hover:bg-white/5 hover:text-white'}`}>
            <MessageCircle className="w-5 h-5 mr-3" /> Messenger
          </button>
          {currentTeacher?.homeroom && (
            <button onClick={() => setActiveMenu("homeroom")} className={`w-full flex items-center p-4 rounded-2xl font-bold transition-all mt-4 ${activeMenu === 'homeroom' ? 'bg-amber-500 text-white' : 'text-amber-300 hover:bg-white/5 hover:text-white'}`}>
              <Users className="w-5 h-5 mr-3" /> Mening Sinfim
            </button>
          )}
          <button onClick={() => setActiveMenu("settings")} className={`w-full flex items-center p-4 rounded-2xl font-bold transition-all mt-8 ${activeMenu === 'settings' ? 'bg-indigo-600 text-white' : 'hover:bg-white/5 hover:text-white'}`}>
            <Settings className="w-5 h-5 mr-3" /> Sozlamalar
          </button>
        </nav>
        <button onClick={handleLogout} className="w-full flex items-center justify-center p-4 rounded-2xl text-red-400 font-black hover:bg-red-500/10 mt-4 transition-all">
          <LogOut className="w-5 h-5 mr-2" /> Chiqish
        </button>
      </aside>

      {/* CONTENT */}
      <main className="flex-1 h-full overflow-y-auto p-8 lg:p-12 relative pb-24">
        {loadError && <div role="alert" className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 sm:flex-row sm:items-center sm:justify-between"><span>{loadError}</span><button onClick={() => { const session = getStoredSession(); if (session.id) void fetchTeacherData(session.id); }} className="shrink-0 rounded-xl bg-amber-100 px-4 py-2 font-black hover:bg-amber-200">Qayta yuklash</button></div>}
        {isLoading && currentTeacher && <div role="status" className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Ma'lumotlar yuklanmoqda...</div>}
        <div className={`w-full bg-gradient-to-r from-indigo-600 to-blue-600 rounded-[3rem] p-10 text-white shadow-xl relative overflow-hidden mb-10 ${activeMenu === "messenger" ? "hidden" : ""}`}>
          <div className="absolute top-0 right-0 p-8 opacity-10"><BookOpen className="w-48 h-48" /></div>
          <div className="relative z-10">
            <h1 className="text-4xl font-black mb-2 tracking-tighter">Salom, {currentTeacher?.full_name} 👋</h1>
            <div className="flex gap-4 mt-6">
              <span className="bg-white/20 px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest backdrop-blur-md flex items-center">
                <Star className="w-4 h-4 mr-2 text-amber-300" /> {currentTeacher?.bio} Fani
              </span>
              {currentTeacher?.homeroom && (
                <span className="bg-amber-500/90 px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest backdrop-blur-md flex items-center shadow-inner">
                  <ShieldCheck className="w-4 h-4 mr-2" /> {currentTeacher.homeroom} Rahbari
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* ASOSIY PANEL */}
          {activeMenu === "boshqaruv" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-slate-900 flex items-center">
                <Clock className="w-6 h-6 mr-3 text-indigo-500"/> Bugungi Darslaringiz ({fullDayNames[todayNameString]})
              </h2>
              {todayClasses.length === 0 ? (
                <div className="bg-white p-12 rounded-[3rem] shadow-sm border-2 border-dashed border-slate-200 text-center">
                  <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4"/>
                  <h3 className="text-xl font-bold text-slate-400">Bugun sizda hech qanday dars yo'q. Dam oling!</h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {todayClasses.map(t => (
                    <div key={t.id} onClick={() => goToJournal(t.class_name)} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 cursor-pointer hover:shadow-lg hover:border-indigo-100 transition-all group">
                       <div className="flex justify-between items-center mb-6">
                         <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xl">{t.lesson_number}</div>
                         <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-3 py-1 rounded-full uppercase">{t.room || "Xona yo'q"}</span>
                       </div>
                       <h3 className="text-3xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{t.class_name}</h3>
                       {t.group_type && t.group_type !== 'Barchasi' && (
                         <span className="inline-block mt-2 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg">{t.group_type}</span>
                       )}
                       <p className="text-slate-400 font-bold mt-2 text-sm uppercase tracking-widest flex items-center">Sinf jurnaliga kirish <span className="ml-2">➔</span></p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SINF RAHBARI: MENING SINFIM */}
          {activeMenu === "homeroom" && (
            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[700px]">
              <div className="p-8 border-b border-slate-100 bg-white">
                 <h2 className="text-2xl font-black text-slate-900 flex items-center"><Users className="w-6 h-6 mr-3 text-amber-500"/> Mening Sinfim: {currentTeacher.homeroom}</h2>
                 <p className="text-slate-500 text-sm mt-1">Sinfingizdagi o'quvchilar ro'yxati va ularning reytingi.</p>
              </div>
              <div className="flex-1 overflow-x-auto p-6 bg-slate-50/50">
                {myStudents.length === 0 ? (
                  <div className="text-center p-12 text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-3xl bg-white">Sinfingizda hozircha o'quvchilar yo'q.</div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr>
                          <th className="p-4 bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-xs">№</th>
                          <th className="p-4 bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-xs">F.I.SH</th>
                          <th className="p-4 bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-xs text-center">ID raqami</th>
                          <th className="p-4 bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-xs text-center">Reyting (CP)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myStudents.map((s, i) => (
                          <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-4 font-bold text-slate-400">{i + 1}</td>
                            <td className="p-4 font-bold text-slate-800">{s.full_name}</td>
                            <td className="p-4 font-black text-indigo-600 text-center">{s.id}</td>
                            <td className="p-4 font-black text-emerald-500 text-center">{s.cp_score || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ISH REJA */}
          {activeMenu === "ish_reja" && (
             <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[700px]">
              <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white">
                 <div>
                   <h2 className="text-2xl font-black text-slate-900 flex items-center"><ListTodo className="w-6 h-6 mr-3 text-indigo-600"/> Avtomatik Ish Reja</h2>
                 </div>
                 <div className="flex flex-wrap gap-3">
                   <select value={selectedClassForPlan} onChange={e => setSelectedClassForPlan(e.target.value)} className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700 shadow-sm">
                      <option value="">Sinfni tanlang</option>
                      {myClasses.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                   <select value={selectedTermPlan} onChange={e => setSelectedTermPlan(e.target.value)} className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl outline-none focus:border-indigo-500 font-black text-indigo-700 shadow-sm">
                      <option value="1-chorak">1-chorak</option>
                      <option value="2-chorak">2-chorak</option>
                      <option value="3-chorak">3-chorak</option>
                      <option value="4-chorak">4-chorak</option>
                   </select>
                   <button onClick={generateLessonDates} className="px-6 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-colors shadow-md">SANALARNI KIRITISH</button>
                 </div>
              </div>

              {!selectedClassForPlan || generatedDates.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-20 bg-slate-50/50">
                  <Calendar className="w-24 h-24 mb-6 opacity-20 text-indigo-500" />
                  <h2 className="font-black text-2xl tracking-tight text-center max-w-md">Yuqoridan sinfni tanlang va tugmani bosing.</h2>
                </div>
              ) : (
                <div className="flex-1 overflow-x-auto p-8 bg-slate-50/50">
                  <div className="flex justify-between items-center mb-6">
                    <div className="bg-indigo-100 text-indigo-700 font-black px-4 py-2 rounded-xl text-sm">Jami darslar: {generatedDates.length} ta</div>
                    <div className="flex gap-3">
                      <button onClick={() => setShowSyncModal(true)} className="px-5 py-2.5 bg-white border-2 border-emerald-200 text-emerald-600 font-black rounded-xl hover:bg-emerald-50 shadow-sm flex items-center">
                        <Copy className="w-4 h-4 mr-2"/> Boshqa sinfga nusxalash
                      </button>
                      <button onClick={() => setShowBulkModal(true)} className="px-5 py-2.5 bg-white border-2 border-indigo-200 text-indigo-600 font-black rounded-xl hover:bg-indigo-50 shadow-sm flex items-center">
                        <DownloadCloud className="w-4 h-4 mr-2"/> Ommaviy kiritish (Paste)
                      </button>
                    </div>
                  </div>
                  <div className="border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm bg-white">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-4 text-slate-400 font-black text-xs w-16 text-center">№</th>
                          <th className="p-4 text-slate-500 font-black uppercase text-xs tracking-widest w-40">Sana</th>
                          <th className="p-4 text-slate-500 font-black uppercase text-xs tracking-widest">Mavzu</th>
                          <th className="p-4 text-slate-500 font-black uppercase text-xs tracking-widest w-64">Uy vazifasi</th>
                          <th className="p-4 text-slate-500 font-black uppercase text-xs tracking-widest w-48">Muddat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generatedDates.map((gDate, index) => {
                          const dateKey = gDate.date;
                          const pData = planForm[dateKey] || { topic: "", homework: "", deadline: "Keyingi darsgacha" };
                          return (
                            <tr key={dateKey} className="border-b border-slate-100 hover:bg-slate-50 focus-within:bg-indigo-50/30 transition-colors">
                              <td className="p-4 text-center font-bold text-slate-400">{index + 1}</td>
                              <td className="p-4 border-l border-slate-100">
                                <span className="text-indigo-600 font-black text-base">{gDate.label}</span>
                                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{fullDayNames[gDate.dayName]}</span>
                              </td>
                              <td className="p-2 border-l border-slate-100">
                                <input type="text" placeholder="Mavzu..." className="w-full p-3 bg-transparent outline-none font-medium text-slate-800" value={pData.topic} onChange={(e) => handlePlanChange(dateKey, 'topic', e.target.value)} />
                              </td>
                              <td className="p-2 border-l border-slate-100">
                                <input type="text" placeholder="Vazifa..." className="w-full p-3 bg-transparent outline-none text-sm text-slate-600" value={pData.homework} onChange={(e) => handlePlanChange(dateKey, 'homework', e.target.value)} />
                              </td>
                              <td className="p-2 border-l border-slate-100">
                                <select className="w-full p-3 bg-transparent outline-none text-xs font-bold text-slate-500" value={pData.deadline} onChange={(e) => handlePlanChange(dateKey, 'deadline', e.target.value)}>
                                  <option value="Keyingi darsgacha">Keyingi darsgacha</option>
                                  <option value="Ertaga 08:00">Ertaga 08:00</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-8 flex justify-end">
                    <button onClick={() => void handleSaveFullPlan()} disabled={isSavingPlan} className="px-10 py-5 bg-indigo-600 text-white font-black text-lg rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center disabled:cursor-not-allowed disabled:opacity-50">
                      {isSavingPlan ? <Loader2 className="w-6 h-6 mr-3 animate-spin"/> : <CheckCircle className="w-6 h-6 mr-3"/>} {isSavingPlan ? "SAQLANMOQDA..." : "O'QUVCHILARGA YUBORISH"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DARS JADVALIM (TO'LIQ) */}
          {activeMenu === "timetable" && (
            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden min-h-[700px] flex flex-col animate-in fade-in">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                 <div>
                   <h2 className="text-2xl font-black text-slate-900 flex items-center">
                     <Calendar className="text-indigo-600 mr-3"/> Shaxsiy Dars Jadvalingiz
                   </h2>
                   <p className="text-slate-500 font-medium mt-1">Faqat sizning darslaringiz ko'rsatilgan.</p>
                 </div>
                 <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className="bg-white px-4 py-3 rounded-xl font-black text-sm outline-none text-indigo-700 shadow-sm cursor-pointer border border-slate-200">
                    <option value="1-chorak">1-chorak</option>
                    <option value="2-chorak">2-chorak</option>
                    <option value="3-chorak">3-chorak</option>
                    <option value="4-chorak">4-chorak</option>
                 </select>
              </div>

              <div className="flex-1 overflow-x-auto p-8">
                <table className="w-full border-collapse bg-white shadow-sm rounded-2xl overflow-hidden border border-slate-100">
                  <thead>
                    <tr>
                      <th className="p-4 bg-slate-50 border-b border-r border-slate-100 w-20"><Clock className="w-5 h-5 mx-auto text-slate-300"/></th>
                      {/* ✅ HAFTA KUNLARI */}
                      {days.map(d => <th key={d} className="p-4 bg-slate-50 border-b border-slate-100 text-slate-400 font-black uppercase text-xs tracking-widest">{fullDayNames[d]}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {lessonNumbers.map(num => (
                      <tr key={num}>
                        <td className="p-4 border-b border-r border-slate-100 text-center font-black text-slate-400 bg-slate-50/30 text-lg">{num}</td>
                        {days.map(day => {
                          const cellLessons = myTimetable.filter(t => t.day_of_week === day && t.lesson_number === num && t.term === selectedTerm);
                          return (
                            <td key={day+num} className={`p-2 border-b border-slate-100 h-32 w-44 transition-all align-top ${cellLessons.length > 0 ? 'bg-indigo-50/30' : ''}`}>
                              {cellLessons.length > 0 ? (
                                <div className="flex flex-col gap-2 h-full">
                                  {cellLessons.map(lesson => (
                                    <div key={lesson.id} className="h-full flex flex-col justify-center bg-indigo-600 rounded-xl p-3 shadow-md text-white">
                                      <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-black text-lg">{lesson.class_name}</h3>
                                        {lesson.group_type && lesson.group_type !== 'Barchasi' && (
                                          <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-bold uppercase">{lesson.group_type}</span>
                                        )}
                                      </div>
                                      <p className="text-xs font-medium text-indigo-200">{lesson.subject}</p>
                                      {lesson.room && <p className="text-[10px] font-bold text-indigo-300 mt-2">{lesson.room}</p>}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <span className="text-slate-200 text-xs font-bold uppercase">Bo'sh</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* JURNAL / BAHOLASH */}
          {activeMenu === "jurnal" && (
            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden min-h-[700px] flex flex-col animate-in fade-in">
              <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-50/50">
                 <div>
                   <h2 className="text-2xl font-black text-slate-900 flex items-center">
                     <TableProperties className="text-indigo-600 mr-3"/> Baholash Jurnali
                   </h2>
                   <p className="text-slate-500 font-medium mt-1">Sizga biriktirilgan sinflarni baholang.</p>
                 </div>

                 <div className="flex gap-4">
                   <div className="bg-white p-1.5 rounded-2xl flex border border-slate-200 shadow-sm">
                     {myClasses.length === 0 ? (
                       <div className="px-5 py-2.5 text-sm font-bold text-slate-400">Sizga hech qanday sinf biriktirilmagan</div>
                     ) : (
                       <select
                         value={selectedClassToGrade}
                         onChange={(e) => handleSelectClassJournal(e.target.value)}
                         className="px-4 py-2 font-black text-indigo-700 outline-none bg-transparent cursor-pointer"
                       >
                         <option value="">Sinfni tanlang...</option>
                         {myClasses.map(cls => (
                           <option key={cls} value={cls}>{cls} - sinf</option>
                         ))}
                       </select>
                     )}
                   </div>
                 </div>
              </div>

              <div className="flex-1 p-8">
                {!selectedClassToGrade ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <Users className="w-20 h-20 mb-4 opacity-20"/>
                    <p className="text-xl font-bold italic">Tepadan o'zingizning sinfingizni tanlang</p>
                  </div>
                ) : (
                  <div className="animate-in fade-in zoom-in-95">
                    <div className="flex justify-between items-end mb-6">
                      <h3 className="text-2xl font-black text-slate-800">{selectedClassToGrade} o'quvchilari ro'yxati</h3>
                      <p className="text-sm font-bold text-slate-400">Jami: {studentsInJournal.length} ta o'quvchi</p>
                    </div>

                    {isJournalLoading ? (
                      <div className="flex justify-center rounded-3xl border border-slate-100 bg-slate-50 p-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
                    ) : journalError ? (
                      <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-800">{journalError}<button onClick={() => setJournalRetry((value) => value + 1)} className="ml-3 underline">Qayta urinish</button></div>
                    ) : studentsInJournal.length === 0 ? (
                      <div className="p-10 border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-400 font-bold">
                        Bu sinfda hozircha o'quvchilar yo'q.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-slate-100">
                        <table className="w-full min-w-[620px] text-left border-collapse">
                          <thead>
                            <tr className="border-b-2 border-slate-100 bg-slate-50 text-slate-400 uppercase text-xs font-black tracking-widest">
                              <th className="p-4 w-16 text-center">№</th>
                              <th className="p-4">O'quvchi F.I.SH</th>
                              <th className="p-4 text-center">Joriy CP</th>
                              <th className="p-4 text-right">Amal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {studentsInJournal.map((student, index) => (
                              <tr key={student.id} className="border-b border-slate-50 last:border-0 hover:bg-indigo-50/30 transition-colors">
                                <td className="p-4 text-center font-bold text-slate-400">{index + 1}</td>
                                <td className="p-4 font-bold text-slate-900">{student.full_name}</td>
                                <td className="p-4 text-center"><span className="rounded-lg bg-emerald-50 px-3 py-1 font-black text-emerald-700">{Number(student.cp_score) || 0} CP</span></td>
                                <td className="p-4 text-right"><button type="button" onClick={() => handleCellClick(student, { type: "today", label: formatDate(getLocalISODate()) })} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Baholash</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MESSENGER */}
          {activeMenu === "messenger" && (
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 h-[calc(100vh-180px)] min-h-[420px] flex overflow-hidden">
              <div className={`${isMobileChatOpen ? "hidden" : "flex"} w-full shrink-0 flex-col border-r border-slate-100 bg-slate-50/50 sm:flex sm:w-80`}>
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                  <div className="relative flex-1 mr-2">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Qidiruv..." className="w-full bg-slate-100 rounded-xl py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <button onClick={() => setShowAddContact(true)} className="p-2.5 bg-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-colors">
                    <Edit className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {contacts.map(c => (
                    <button key={c.id} type="button" onClick={() => { setActiveChat(c); void loadMessages(c.contact_id); setShowChatMenu(false); setIsMobileChatOpen(true); }} className={`w-full p-4 flex items-center gap-3 text-left cursor-pointer border-b border-slate-50 transition-all ${activeChat?.id === c.id ? 'bg-indigo-50 border-indigo-100' : 'hover:bg-slate-100'}`}>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500 text-white flex items-center justify-center font-black text-lg shadow-sm">
                        {c.contact_name?.charAt(0) || "?"}
                      </div>
                      <div className="min-w-0">
                        <h3 className={`truncate font-bold text-sm ${activeChat?.id === c.id ? 'text-indigo-900' : 'text-slate-800'}`}>{c.contact_name || "Kontakt"}</h3>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{c.contact_id}</p>
                      </div>
                    </button>
                  ))}
                  {contacts.length === 0 && <p className="text-center text-slate-400 text-sm mt-10 p-4">Kontakt qo'shing.</p>}
                </div>
              </div>
              <div className={`${isMobileChatOpen ? "flex" : "hidden"} min-w-0 flex-1 flex-col bg-[#f0f2f5] relative sm:flex`}>
                {activeChat ? (
                  <>
                    <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 shadow-sm">
                      <div className="flex min-w-0 items-center gap-3">
                        <button type="button" aria-label="Kontaktlar ro'yxatiga qaytish" onClick={() => setIsMobileChatOpen(false)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 sm:hidden"><ChevronLeft className="h-5 w-5" /></button>
                        <div className="w-10 h-10 shrink-0 rounded-full bg-indigo-500 text-white flex items-center justify-center font-black">
                          {activeChat.contact_name?.charAt(0) || "?"}
                        </div>
                        <div className="min-w-0">
                          <h2 className="truncate font-bold text-slate-800">{activeChat.contact_name || "Kontakt"}</h2>
                          <p className="text-[11px] text-slate-500 uppercase tracking-widest">{String(activeChat.contact_id).startsWith("T-") ? "O'qituvchi" : "O'quvchi"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 relative">
                        <button onClick={() => setShowChatMenu(!showChatMenu)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-full">
                          <MoreVertical className="w-5 h-5"/>
                        </button>
                        {showChatMenu && (
                          <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in zoom-in-95">
                            <button onClick={handleClearHistory} className="w-full flex items-center px-4 py-3 text-sm text-red-600 font-bold hover:bg-red-50">
                              <Trash2 className="w-4 h-4 mr-3"/> Tarixni tozalash
                            </button>
                            <button className="w-full flex items-center px-4 py-3 text-sm text-slate-700 font-bold hover:bg-slate-50">
                              <BellOff className="w-4 h-4 mr-3 text-slate-400"/> Ovozsiz (Mute)
                            </button>
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button className="w-full flex items-center px-4 py-3 text-sm text-slate-700 font-bold hover:bg-slate-50">
                              <Ban className="w-4 h-4 mr-3 text-slate-400"/> Bloklash
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {messages.map(msg => {
                        const isMe = msg.sender_id === currentTeacher.id;
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-md px-4 py-2.5 rounded-2xl shadow-sm text-[15px] ${isMe ? 'bg-[#e3ffc2] text-slate-800 rounded-br-sm' : 'bg-white text-slate-800 rounded-bl-sm'}`}>
                              <p>{msg.text}</p>
                              <div className={`text-[10px] text-right mt-1 ${isMe ? 'text-green-700' : 'text-slate-400'}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} {isMe && '✓✓'}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200 flex gap-3 items-center">
                      <input type="text" value={msgInput} onChange={e => setMsgInput(e.target.value)} disabled={isSendingMessage} placeholder="Xabar yozing..." className="flex-1 bg-slate-100 rounded-full py-3 px-5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:opacity-60" />
                      <button type="submit" aria-label="Xabar yuborish" disabled={isSendingMessage || !msgInput.trim()} className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 shadow-md transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50">
                        {isSendingMessage ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5 ml-1"/>}
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <MessageCircle className="w-20 h-20 mb-4 opacity-20"/>
                    <p className="font-bold text-lg">Yozishish uchun chapdan chatni tanlang</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SOZLAMALAR */}
          {activeMenu === "settings" && (
            <div className="max-w-xl bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 mx-auto mt-10">
              <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center mb-6">
                <Settings className="w-8 h-8"/>
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-2">Sozlamalar</h2>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-8">Shaxsiy parolingizni o'zgartiring</p>
              <input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Kamida 8 ta belgili yangi parol" className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl mb-6 font-black text-lg outline-none text-center" />
              <button onClick={handleChangePassword} disabled={isChanging} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center text-lg disabled:opacity-50">
                {isChanging ? "SAQLANMOQDA..." : "PAROLNI SAQLASH"}
              </button>
            </div>
          )}

        </div>
      </main>

      <nav aria-label="O'qituvchi menyusi" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_-20px_rgba(15,23,42,0.3)] backdrop-blur md:hidden">
        <div className="flex overflow-x-auto">
          {[
            { key: "boshqaruv", label: "Asosiy", icon: LayoutDashboard },
            { key: "timetable", label: "Jadval", icon: Calendar },
            { key: "jurnal", label: "Jurnal", icon: TableProperties },
            { key: "ish_reja", label: "Reja", icon: ListTodo },
            { key: "messenger", label: "Xabarlar", icon: MessageCircle },
            ...(currentTeacher?.homeroom ? [{ key: "homeroom", label: "Sinfim", icon: Users }] : []),
            { key: "settings", label: "Sozlama", icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            return <button key={item.key} type="button" aria-current={activeMenu === item.key ? "page" : undefined} onClick={() => { setActiveMenu(item.key as typeof activeMenu); setIsMobileChatOpen(false); }} className={`flex min-w-[68px] flex-1 flex-col items-center gap-1 px-2 py-2 text-[10px] font-bold ${activeMenu === item.key ? "text-indigo-700" : "text-slate-500"}`}><Icon className="h-5 w-5"/><span>{item.label}</span></button>;
          })}
        </div>
      </nav>

      {/* FLOAT MUROJAAT TUGMASI */}
      {activeMenu !== "messenger" && <div className="fixed bottom-20 w-[90%] md:bottom-4 md:w-auto left-1/2 transform -translate-x-1/2 z-30">
        <button onClick={() => setShowFeedbackModal(true)} className="w-full md:w-auto bg-slate-900/90 backdrop-blur-md text-slate-300 text-[13px] font-medium px-6 py-2.5 rounded-full shadow-2xl hover:text-white flex items-center justify-center gap-2 transition-all hover:bg-slate-900">
          <MessageSquare className="w-4 h-4 text-indigo-400"/> Tizim bo'yicha murojaat yo'llash
        </button>
      </div>}

      {/* MODALLAR */}

      {/* MUROJAAT MODALI */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowFeedbackModal(false)}>
           <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-8 bg-slate-900 flex justify-between items-center">
                <h3 className="text-xl font-black text-white flex items-center"><MessageSquare className="w-5 h-5 mr-3 text-indigo-400"/> Murojaat yo'llash</h3>
                <button onClick={() => setShowFeedbackModal(false)} className="text-slate-400 hover:text-white"><X/></button>
              </div>
              <div className="p-8 space-y-4">
                 <textarea rows={4} placeholder="Fikringizni yozing..." className="w-full p-4 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-2xl font-medium outline-none resize-none" value={feedbackForm.message} onChange={e => setFeedbackForm({...feedbackForm, message: e.target.value})}></textarea>
                 <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer">
                   <input type="checkbox" className="w-5 h-5 accent-slate-900" checked={feedbackForm.isAnonymous} onChange={e => setFeedbackForm({...feedbackForm, isAnonymous: e.target.checked})} />
                   <div>
                     <p className="font-bold text-sm">Anonim yuborish</p>
                     <p className="text-xs text-slate-500">Ismingiz ko'rinmaydi</p>
                   </div>
                 </label>
                 <button onClick={handleSendFeedback} disabled={isSendingFeedback} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 disabled:opacity-50">
                   {isSendingFeedback ? "YUBORILMOQDA..." : "YUBORISH"}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* BAHOLASH / BALL SO'ROVI MODALI */}
      {gradeModal?.isOpen && (
        <ManagePointsModal
          studentName={gradeModal.student.full_name}
          dateLabel={gradeModal.col.label}
          mode={gradeModal.type}
          attendance={attendanceStatus}
          classwork={gradeInput.classwork}
          homework={gradeInput.homework}
          pointsRequest={ppRequestType}
          correctionCount={pastFixCounts[gradeModal.student.id] || 0}
          isSubmitting={isGrading}
          onAttendanceChange={setAttendanceStatus}
          onClassworkChange={(value) => setGradeInput((previous) => ({ ...previous, classwork: value }))}
          onHomeworkChange={(value) => setGradeInput((previous) => ({ ...previous, homework: value }))}
          onPointsRequestChange={setPpRequestType}
          onSaveGrade={() => void submitTodayGrade()}
          onRequestPoints={() => void submitPPRequest()}
          onClose={() => setGradeModal(null)}
        />
      )}

      {/* KONTAKT QO'SHISH MODALI */}
      {showAddContact && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowAddContact(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden" onClick={e=>e.stopPropagation()}>
             <div className="p-6 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center"><h3 className="font-black text-indigo-900">Yangi Kontakt</h3></div>
             <div className="p-6 space-y-4">
               <input type="text" placeholder="ID (S-8392 yoki T-1122)" className="w-full p-4 bg-slate-50 rounded-xl outline-none font-mono uppercase" value={contactForm.id} onChange={e=>setContactForm({...contactForm, id: e.target.value})} />
               <input type="text" placeholder="Ism qo'ying" className="w-full p-4 bg-slate-50 rounded-xl outline-none font-bold" value={contactForm.name} onChange={e=>setContactForm({...contactForm, name: e.target.value})} />
               <button onClick={() => void handleAddContact()} disabled={isSavingContact} className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{isSavingContact ? "SAQLANMOQDA..." : "SAQLASH"}</button>
             </div>
          </div>
        </div>
      )}

      {/* BULK KISITISH MODALI */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowBulkModal(false)}>
           <div className="bg-white rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-8 bg-indigo-50 flex justify-between items-center border-b border-indigo-100">
                <h3 className="text-xl font-black text-indigo-900 flex items-center"><DownloadCloud className="w-6 h-6 mr-3"/> Ommaviy Kiritish</h3>
                <button onClick={() => setShowBulkModal(false)} className="text-indigo-400 hover:text-indigo-700"><X/></button>
              </div>
              <div className="p-8 space-y-4">
                 <textarea rows={10} className="w-full p-5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-2xl font-medium outline-none resize-none leading-relaxed" placeholder="1. Mavzu&#10;2. Keyingi mavzu" value={bulkTopicsText} onChange={e => setBulkTopicsText(e.target.value)}></textarea>
                 <button onClick={handleBulkInsert} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 mt-4">TIZIMGA JOYLASHTIRISH</button>
              </div>
           </div>
        </div>
      )}

      {/* SINXRONLASH MODALI */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowSyncModal(false)}>
           <div className="bg-white rounded-[3rem] w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-8 bg-emerald-50 flex justify-between items-center border-b border-emerald-100">
                <h3 className="text-xl font-black text-emerald-900 flex items-center"><Copy className="w-5 h-5 mr-3"/> Sinxronlash</h3>
                <button onClick={() => setShowSyncModal(false)} className="text-emerald-400 hover:text-emerald-700"><X/></button>
              </div>
              <div className="p-8 space-y-4">
                 <p className="text-sm font-bold text-slate-600 mb-2">Qaysi parallel sinfga dars mavzularini ko'chirmoqchisiz?</p>
                 <select value={targetClassForSync} onChange={e => setTargetClassForSync(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-700 shadow-sm">
                    <option value="">Sinfni tanlang</option>
                    {allClasses.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                 </select>
                 <button onClick={() => void handleSyncToClass()} disabled={isSyncingPlan || isSavingPlan} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-xl hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 mt-4">
                   {isSyncingPlan ? "KO'CHIRILMOQDA..." : "NUSXA OLISH"}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
