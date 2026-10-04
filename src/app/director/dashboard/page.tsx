"use client";

import { useState, useEffect } from "react";
import { 
  Users, UserPlus, Shield, Calendar, Calculator, 
  Crown, LayoutDashboard, CheckCircle2, X, PlusCircle, 
  School, Edit, Trash2, Search, ArrowLeft, MessageSquare, 
  Send, CheckCircle, Key, Clock, Wand2, AlertTriangle, Settings2, FileText, ChevronDown, LogOut, Loader2, Copy
} from "lucide-react";
import { supabase } from "@/lib/supabase"; 
import { generateTimetableDetailed } from "@/lib/timetableAlgorithm";
import { generateAccountId, generateOneTimePassword } from "@/lib/credentials";
import { isSupabaseConfigured } from "@/lib/supabase";
import { clearSession, getStoredSession } from "@/lib/session";
import { safeJsonParse } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function DirectorDashboard() {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState<"boshqaruv" | "teachers" | "students" | "timetable" | "algorithm">("boshqaruv");
  
  // Auth Loading
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [credentials, setCredentials] = useState<{ role: string; id: string; password: string } | null>(null);

  useEffect(() => {
    let alive = true;
    const verifyAdmin = async () => {
      const session = getStoredSession();
      if (!session.id || (session.role !== "director" && session.role !== "admin")) {
        clearSession();
        router.replace("/");
        return;
      }
      if (!isSupabaseConfigured) {
        setLoadError("Supabase sozlanmagan. .env.local faylini tekshiring.");
        setIsAuthLoading(false);
        return;
      }
      const { data: profile, error } = await supabase.from("profiles").select("id, role").eq("id", session.id).maybeSingle();
      if (!alive) return;
      if (error) {
        setLoadError("Direktor huquqini tekshirib bo'lmadi. Baza ulanishi yoki ruxsatlarni tekshiring.");
        setIsAuthLoading(false);
        return;
      }
      const actualRole = String(profile?.role ?? "").toLowerCase();
      if (!profile || (actualRole !== "director" && actualRole !== "admin")) {
        clearSession();
        router.replace("/");
        return;
      }
      setIsAuthLoading(false);
      void fetchData();
    };

    void verifyAdmin();
    const savedWorkloads = safeJsonParse<any[]>(localStorage.getItem("elita_workloads"), []);
    setWorkloads(Array.isArray(savedWorkloads) ? savedWorkloads : []);
    return () => { alive = false; };
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.replace("/");
  };

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string, onConfirm: () => void } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type }); 
    setTimeout(() => setToast(null), 5000); 
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  
  const [showWorkloadModal, setShowWorkloadModal] = useState(false);
  const [workloads, setWorkloads] = useState<any[]>([]); 
  const [workloadForm, setWorkloadForm] = useState<{ class_names: string[], subject: string, split_mode: string, teacher_id: string, teacher_id_2: string, hours: number }>({ 
    class_names: [], subject: "", split_mode: "Barchasi", teacher_id: "", teacher_id_2: "", hours: 2
  });
  const [showClassDropdown, setShowClassDropdown] = useState(false);

  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showEditTeacherModal, setShowEditTeacherModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [replyModal, setReplyModal] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]); 
  const [feedbacks, setFeedbacks] = useState<any[]>([]); 
  const [timetableData, setTimetableData] = useState<any[]>([]);
  
  const [selectedClassView, setSelectedClassView] = useState<string | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [editingStudent, setEditingStudent] = useState<any>(null); 
  const [newPerson, setNewPerson] = useState({ fullName: "", subject: "", homeroom: "", className: "" });
  const [newClassInfo, setNewClassInfo] = useState({ name: "", limit: 24 });

  const [selectedClassForTimetable, setSelectedClassForTimetable] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState("1-chorak");
  const [termStartDate, setTermStartDate] = useState("2026-09-02");
  const [termEndDate, setTermEndDate] = useState("2026-11-03");

  const [currentCell, setCurrentCell] = useState<{ day: string, lesson: number } | null>(null);
  const [lessonForm, setLessonForm] = useState({ subject: "", teacher_id: "", room: "", group_type: "Barchasi" });

  const subjectsBase = [
    "Algebra", "Geometriya", "Ona tili", "Adabiyot", "Ingliz tili", "Rus tili", 
    "Kimyo", "Biologiya", "Fizika", "Informatika", "O'zbekiston tarixi", "Jahon tarixi", 
    "Geografiya", "Tarbiya", "Davlat va huquq asoslari", "Iqtisodiyot", 
    "Jismoniy tarbiya", "Chizmachilik", "Texnologiya"
  ].sort(); 

  const days = ["Du", "Se", "Ch", "Pa", "Ju", "Sh"];
  const fullDayNames: Record<string, string> = { 
    "Du": "Dushanba", "Se": "Seshanba", "Ch": "Chorshanba", 
    "Pa": "Payshanba", "Ju": "Juma", "Sh": "Shanba" 
  };
  
  const lessonNumbers = [1, 2, 3, 4, 5, 6]; 
  const groupTypes = ["Barchasi", "1-guruh", "2-guruh", "O'g'il bolalar", "Qizlar"];
  const splitModes = ["Barchasi", "1 va 2-guruhlarga bo'lish", "O'g'il va Qiz bolalarga bo'lish"];

  const fetchData = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const [teacherResponse, classResponse, studentResponse, feedbackResponse, timetableResponse] = await Promise.all([
        supabase.from("profiles").select("id, full_name, role, bio, homeroom, created_at").eq("role", "teacher").order("created_at", { ascending: false }),
        supabase.from("classes").select("name, max_limit, total_cp, homeroom_teacher").order("name"),
        supabase.from("profiles").select("id, full_name, role, class_name, pp_balance, cp_score, created_at").eq("role", "student").order("full_name"),
        supabase.from("feedbacks").select("id, sender_id, sender_name, message, is_anonymous, status, answer, created_at").order("created_at", { ascending: false }),
        supabase.from("timetable").select("id, class_name, day_of_week, lesson_number, subject, teacher_id, group_type, room, term, start_date, end_date"),
      ]);
      const failure = [teacherResponse, classResponse, studentResponse, feedbackResponse, timetableResponse].find((response) => response.error);
      if (failure?.error) {
        console.error("Direktor panelini yuklashda xatolik:", failure.error.message);
        setLoadError("Ma'lumotlarni to'liq yuklab bo'lmadi. Supabase jadvallari va RLS ruxsatlarini tekshiring.");
      }
      setTeachers(teacherResponse.data || []);
      setClasses(classResponse.data || []);
      setAllStudents(studentResponse.data || []);
      setFeedbacks(feedbackResponse.data || []);
      setTimetableData(timetableResponse.data || []);
    } catch (err) {
      console.error(err);
      setLoadError("Ma'lumotlarni yuklashda kutilmagan xatolik yuz berdi.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStudentsCount = (className: string) => allStudents.filter(s => s.class_name === className).length;

  useEffect(() => {
    const termDates: Record<string, [string, string]> = {
      "1-chorak": ["2026-09-02", "2026-11-03"],
      "2-chorak": ["2026-11-10", "2026-12-27"],
      "3-chorak": ["2027-01-11", "2027-03-20"],
      "4-chorak": ["2027-03-28", "2027-05-25"],
    };
    const [start, end] = termDates[selectedTerm];
    if (start && end) {
      setTermStartDate(start);
      setTermEndDate(end);
    }
  }, [selectedTerm]);

  const toggleClassInWorkload = (cName: string) => {
     const exists = workloadForm.class_names.includes(cName);
     if (exists) setWorkloadForm({...workloadForm, class_names: workloadForm.class_names.filter(n => n !== cName)});
     else setWorkloadForm({...workloadForm, class_names: [...workloadForm.class_names, cName]});
  };

  const handleAddWorkload = () => {
    if (workloadForm.class_names.length === 0 || !workloadForm.subject || workloadForm.hours <= 0) {
      return showToast("Barcha maydonlarni to'ldiring va kamida 1 ta sinf tanlang!", "error");
    }
    
    if (workloadForm.split_mode === "Barchasi" && !workloadForm.teacher_id) {
       return showToast("O'qituvchini tanlang!", "error");
    }

    if (workloadForm.split_mode !== "Barchasi" && (!workloadForm.teacher_id || !workloadForm.teacher_id_2)) {
       return showToast("Guruhlarga bo'linganda ikkala o'qituvchini ham tanlash shart!", "error");
    }

    let updated = [...workloads];
    workloadForm.class_names.forEach(cls => {
       if (workloadForm.split_mode === "Barchasi") {
          updated.push({ id: crypto.randomUUID(), class_name: cls, subject: workloadForm.subject, teacher_id: workloadForm.teacher_id, hours: workloadForm.hours, group_type: "Barchasi" });
       } else if (workloadForm.split_mode === "1 va 2-guruhlarga bo'lish") {
          updated.push({ id: crypto.randomUUID(), class_name: cls, subject: workloadForm.subject, teacher_id: workloadForm.teacher_id, hours: workloadForm.hours, group_type: "1-guruh" });
          updated.push({ id: crypto.randomUUID(), class_name: cls, subject: workloadForm.subject, teacher_id: workloadForm.teacher_id_2, hours: workloadForm.hours, group_type: "2-guruh" });
       } else if (workloadForm.split_mode === "O'g'il va Qiz bolalarga bo'lish") {
          updated.push({ id: crypto.randomUUID(), class_name: cls, subject: workloadForm.subject, teacher_id: workloadForm.teacher_id, hours: workloadForm.hours, group_type: "O'g'il bolalar" });
          updated.push({ id: crypto.randomUUID(), class_name: cls, subject: workloadForm.subject, teacher_id: workloadForm.teacher_id_2, hours: workloadForm.hours, group_type: "Qizlar" });
       }
    });

    setWorkloads(updated); 
    localStorage.setItem('elita_workloads', JSON.stringify(updated));
    setWorkloadForm({...workloadForm, class_names: [], teacher_id: "", teacher_id_2: "", subject: "", hours: 2, split_mode: "Barchasi"}); 
    showToast("Yuklamalar muvaffaqiyatli qo'shildi!"); 
    setShowClassDropdown(false);
  };

  const handleDeleteWorkload = (id: string) => {
    const updated = workloads.filter(w => w.id !== id);
    setWorkloads(updated); 
    localStorage.setItem('elita_workloads', JSON.stringify(updated));
    showToast("Yuklama o'chirildi!");
  };

  const handleAutoGenerate = () => {
    if (workloads.length === 0) {
      showToast("Jadval tuzishdan oldin dars yuklamalarini kiriting.", "error");
      setShowWorkloadModal(true);
      return;
    }

    setConfirmDialog({
      message: "Tanlangan chorak jadvali qayta tuziladi. Yangi jadval tekshirilib saqlangandan keyingina eski jadval almashtiriladi. Davom etasizmi?",
      onConfirm: async () => {
        setConfirmDialog(null);
        setConflictWarning(null);
        setIsGenerating(true);
        try {
          const requests = workloads.map((item) => ({
            className: item.class_name,
            subject: item.subject,
            teacherId: item.teacher_id,
            hoursPerWeek: Number(item.hours),
            groupType: item.group_type || "Barchasi",
          }));
          classes.forEach((classItem) => {
            const homeroomTeacher = teachers.find((teacher) => teacher.homeroom === classItem.name);
            if (homeroomTeacher) requests.push({ className: classItem.name, subject: "Kelajak soati", teacherId: homeroomTeacher.id, hoursPerWeek: 1, groupType: "Barchasi" });
          });

          const result = generateTimetableDetailed(requests);
          if (result.errors.length) {
            const message = result.errors.slice(0, 2).join(" ");
            setConflictWarning(message);
            showToast(`Yuklamalarni tekshiring: ${message}`, "error");
            return;
          }
          if (result.unplaced.length) {
            const unplacedSummary = result.unplaced.slice(0, 3).map((item) => `${item.className} — ${item.subject}: ${item.placedHours}/${item.requestedHours}`).join("; ");
            setConflictWarning(`Joylashtirilmagan darslar: ${unplacedSummary}. Yuklama yoki o'qituvchi bandligini o'zgartiring.`);
            showToast(`${result.unplaced.length} ta fan yuklamasi to'liq joylashmadi. Eski jadval saqlab qolindi.`, "error");
            return;
          }
          if (!result.lessons.length) {
            showToast("Jadval uchun saqlanadigan dars topilmadi.", "error");
            return;
          }

          const uniqueInsertData = result.lessons.map((lesson) => ({
            class_name: lesson.class_name,
            day_of_week: lesson.day_of_week,
            lesson_number: lesson.lesson_number,
            subject: lesson.subject,
            teacher_id: lesson.teacher_id,
            group_type: lesson.group_type || "Barchasi",
            room: lesson.room || null,
            term: selectedTerm,
            start_date: termStartDate,
            end_date: termEndDate,
          }));
          const { data: existingRows, error: existingError } = await supabase.from("timetable").select("id").eq("term", selectedTerm);
          if (existingError) throw existingError;

          // Insert first; if it fails, the previously published schedule remains untouched.
          const { data: insertedRows, error: insertError } = await supabase.from("timetable").insert(uniqueInsertData).select("id");
          if (insertError) throw insertError;
          const insertedIds = (insertedRows ?? []).map((row) => row.id).filter(Boolean);
          if (insertedIds.length !== uniqueInsertData.length) {
            if (insertedIds.length) await supabase.from("timetable").delete().in("id", insertedIds);
            throw new Error("Yangi jadvalning barcha qatorlari tasdiqlanmadi; eski jadval saqlab qolindi.");
          }

          const oldIds = (existingRows ?? []).map((row) => row.id).filter((id) => !insertedIds.includes(id));
          if (oldIds.length) {
            const { error: deleteError } = await supabase.from("timetable").delete().in("id", oldIds);
            if (deleteError) {
              await supabase.from("timetable").delete().in("id", insertedIds);
              throw deleteError;
            }
          }
          const sessions = new Set(uniqueInsertData.map((lesson) => `${lesson.class_name}:${lesson.day_of_week}:${lesson.lesson_number}`)).size;
          showToast(`Jadval saqlandi: ${sessions} ta dars vaqti, ${uniqueInsertData.length} ta guruh yozuvi.`, "success");
          await fetchData();
        } catch (error) {
          console.error("Jadvalni saqlashda xatolik:", error);
          showToast(error instanceof Error ? error.message : "Jadvalni saqlashda xatolik yuz berdi.", "error");
        } finally {
          setIsGenerating(false);
        }
      },
    });
  };

  const currentCellLessons = currentCell ? timetableData.filter(t => t.class_name === selectedClassForTimetable && t.day_of_week === currentCell.day && t.lesson_number === currentCell.lesson && t.term === selectedTerm) : [];

  const handleSaveLesson = async () => {
    if (!selectedClassForTimetable || !currentCell) return showToast("Avval sinf va jadval katagini tanlang.", "error");
    if (!lessonForm.subject || !lessonForm.teacher_id) return showToast("Fan va o'qituvchini tanlang.", "error");

    const isBusy = timetableData.find(t => t.term === selectedTerm && t.day_of_week === currentCell.day && t.lesson_number === currentCell.lesson && t.teacher_id === lessonForm.teacher_id && t.class_name !== selectedClassForTimetable);
    if (isBusy) {
      const teacherName = teachers.find(t => t.id === lessonForm.teacher_id)?.full_name;
      setConflictWarning(`🔴 KONFLIKT: Ustoz ${teacherName} ayni shu vaqtda ${isBusy.class_name} sinfida dars o'tadi.`);
      return; 
    }

    if (currentCellLessons.some((lesson) => lesson.teacher_id === lessonForm.teacher_id)) {
      setConflictWarning("Bir o'qituvchi bir vaqtda ikki guruhga dars o'ta olmaydi.");
      return;
    }

    if (currentCellLessons.length > 0) {
      const wholeClassExists = currentCellLessons.some((lesson) => !lesson.group_type || lesson.group_type === "Barchasi");
      const groupAlreadyExists = currentCellLessons.some((lesson) => lesson.group_type === lessonForm.group_type);
      const differentSubjectExists = currentCellLessons.some((lesson) => lesson.subject !== lessonForm.subject);
      if (lessonForm.group_type === "Barchasi" || wholeClassExists || groupAlreadyExists || differentSubjectExists) {
        setConflictWarning("Bu katakka faqat bitta fan qo'yiladi; sinfni bo'lib o'tkazishda har bir guruhni alohida tanlang.");
        return;
      }
    }

    setConflictWarning(null); 
    const { error } = await supabase.from('timetable').insert([{ 
      class_name: selectedClassForTimetable, day_of_week: currentCell?.day, lesson_number: currentCell?.lesson, 
      subject: lessonForm.subject, teacher_id: lessonForm.teacher_id, group_type: lessonForm.group_type, room: lessonForm.room, term: selectedTerm, start_date: termStartDate, end_date: termEndDate
    }]);
    
    if(!error) { 
      showToast("Dars saqlandi!"); 
      setLessonForm({ subject: "", teacher_id: "", room: "", group_type: "Barchasi" }); 
      fetchData(); 
    } else {
      showToast(error.message, "error");
    }
  };

  const deleteLessonItem = async (id: string) => {
    await supabase.from('timetable').delete().eq('id', id); 
    showToast("Dars o'chirildi!"); fetchData();
  };

  const handleAddClass = async () => {
    const name = newClassInfo.name.trim().toUpperCase();
    if (!name || !Number.isInteger(newClassInfo.limit) || newClassInfo.limit < 1) return showToast("Sinf nomi va o'quvchi limitini to'g'ri kiriting.", "error");
    if (classes.some((classItem) => classItem.name === name)) return showToast("Bu sinf allaqachon mavjud.", "error");
    const { error } = await supabase.from("classes").insert([{ name, max_limit: newClassInfo.limit, total_cp: 0 }]);
    if (error) return showToast(error.message, "error");
    showToast("Sinf yaratildi.");
    setShowClassModal(false);
    setNewClassInfo({ name: "", limit: 24 });
    await fetchData();
  };

  const handleAddTeacher = async () => {
    const fullName = newPerson.fullName.trim();
    if (!fullName || !newPerson.subject) return showToast("F.I.SH va fanini kiriting.", "error");
    const id = generateAccountId("T");
    const password = generateOneTimePassword();
    const { error } = await supabase.from("profiles").insert([{
      id,
      role: "teacher",
      full_name: fullName,
      bio: newPerson.subject,
      password,
      homeroom: newPerson.homeroom || null,
    }]);
    if (error) return showToast(error.message, "error");
    setCredentials({ role: "O'qituvchi", id, password });
    setShowTeacherModal(false);
    setNewPerson({ fullName: "", subject: "", homeroom: "", className: "" });
    await fetchData();
  };

  const handleUpdateTeacher = async () => {
    const { error } = await supabase.from('profiles').update({ full_name: editingTeacher.full_name, bio: editingTeacher.bio, homeroom: editingTeacher.homeroom || null }).eq('id', editingTeacher.id);
    if(!error) { showToast("Saqlandi!"); setShowEditTeacherModal(false); fetchData(); } else showToast(error.message, "error");
  };

  const handleDeleteTeacher = (id: string) => {
    setConfirmDialog({ message: "O'qituvchini o'chirasizmi?", onConfirm: async () => { setConfirmDialog(null); await supabase.from('profiles').delete().eq('id', id); fetchData(); }});
  };

  const handleAddStudent = async () => {
    const fullName = newPerson.fullName.trim();
    const classItem = classes.find((item) => item.name === newPerson.className);
    if (!fullName || !classItem) return showToast("F.I.SH va sinfni tanlang.", "error");
    const classLimit = Number(classItem.max_limit ?? 0);
    if (classLimit > 0 && getStudentsCount(classItem.name) >= classLimit) return showToast(`${classItem.name} sinfi belgilangan limitga yetgan.`, "error");
    const id = generateAccountId("S");
    const password = generateOneTimePassword();
    const { error } = await supabase.from("profiles").insert([{
      id,
      role: "student",
      full_name: fullName,
      class_name: classItem.name,
      password,
      pp_balance: 0,
      cp_score: 0,
    }]);
    if (error) return showToast(error.message, "error");
    setCredentials({ role: "O'quvchi", id, password });
    setShowStudentModal(false);
    setNewPerson({ fullName: "", subject: "", homeroom: "", className: "" });
    await fetchData();
  };

  const handleUpdateStudent = async () => {
    const { error } = await supabase.from('profiles').update({ full_name: editingStudent.full_name, class_name: editingStudent.class_name }).eq('id', editingStudent.id);
    if(!error) { showToast("Saqlandi!"); setShowEditStudentModal(false); fetchData(); } else showToast(error.message, "error");
  };

  const handleDeleteStudent = (id: string, name: string) => { 
    setConfirmDialog({ message: `Diqqat! O'quvchi ${name} maktabdan o'chiriladi. Davom etamizmi?`, onConfirm: async () => { setConfirmDialog(null); await supabase.from('profiles').delete().eq('id', id); fetchData(); }}); 
  };

  const handleDeleteFeedback = (id: string) => { 
    setConfirmDialog({ message: "Murojaatni o'chirasizmi?", onConfirm: async () => { setConfirmDialog(null); await supabase.from('feedbacks').delete().eq('id', id); fetchData(); }}); 
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return showToast("Javob yozing!", "error");
    setIsReplying(true);
    await supabase.from('feedbacks').update({ status: 'javob_berildi', answer: replyText }).eq('id', replyModal.id);
    if (replyModal.sender_id) await supabase.from('notifications').insert([{ user_id: replyModal.sender_id, title: "Direktordan javob keldi", message: replyText }]);
    showToast("Javob yuborildi!"); setReplyModal(null); setReplyText(""); setIsReplying(false); fetchData(); 
  };

  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 font-sans p-6">
        <div className="flex flex-col items-center">
           <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-4 shadow-lg rounded-full" />
           <h2 className="text-2xl font-black text-slate-800 tracking-tight">Direktor tizimi tekshirilmoqda...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden relative">
      
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl font-bold text-white shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-8 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-6 h-6"/> : <AlertTriangle className="w-6 h-6"/>}
          {toast.message}
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10"/>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Tasdiqlang!</h3>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDialog(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors">Yo'q, qaytish</button>
              <button onClick={confirmDialog.onConfirm} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold shadow-lg hover:bg-red-600 transition-colors">Ha, bajarilsin</button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="w-72 bg-slate-950 text-slate-400 p-6 hidden md:flex flex-col border-r border-slate-800 relative z-10">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20">E</div>
          <span className="text-2xl font-black text-white tracking-tighter italic">ELITA</span>
        </div>
        <nav className="space-y-2 flex-1">
          <button onClick={() => setActiveMenu("boshqaruv")} className={`w-full flex items-center p-4 rounded-2xl font-bold transition-all ${activeMenu === 'boshqaruv' ? 'bg-indigo-600 text-white shadow-xl' : 'hover:bg-slate-900 hover:text-white'}`}><LayoutDashboard className="w-5 h-5 mr-3"/> Boshqaruv</button>
          <button onClick={() => setActiveMenu("teachers")} className={`w-full flex items-center p-4 rounded-2xl font-bold transition-all ${activeMenu === 'teachers' ? 'bg-indigo-600 text-white shadow-xl' : 'hover:bg-slate-900 hover:text-white'}`}><Crown className="w-5 h-5 mr-3"/> O'qituvchilar</button>
          <button onClick={() => setActiveMenu("students")} className={`w-full flex items-center p-4 rounded-2xl font-bold transition-all ${activeMenu === 'students' ? 'bg-indigo-600 text-white shadow-xl' : 'hover:bg-slate-900 hover:text-white'}`}><Users className="w-5 h-5 mr-3"/> O'quvchilar</button>
          <button onClick={() => setActiveMenu("timetable")} className={`w-full flex items-center p-4 rounded-2xl font-bold transition-all ${activeMenu === 'timetable' ? 'bg-indigo-600 text-white shadow-xl' : 'hover:bg-slate-900 hover:text-white'}`}><Calendar className="w-5 h-5 mr-3"/> Dars Jadvali</button>
          <button onClick={() => setActiveMenu("algorithm")} className={`w-full flex items-center p-4 rounded-2xl font-bold transition-all ${activeMenu === 'algorithm' ? 'bg-indigo-600 text-white shadow-xl' : 'hover:bg-slate-900 hover:text-white'}`}><Calculator className="w-5 h-5 mr-3"/> Algoritm & Moliya</button>
        </nav>
        <button onClick={handleLogout} className="mt-auto w-full flex items-center justify-center p-4 rounded-2xl text-red-400 font-black hover:bg-red-500/10 mt-4 transition-all">
          <LogOut className="w-5 h-5 mr-2" /> Tizimdan Chiqish
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="relative z-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
        {loadError && <div role="alert" className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">{loadError}<button onClick={() => void fetchData()} className="ml-3 underline">Qayta yuklash</button></div>}
        {isLoading && <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Ma'lumotlar yangilanmoqda...</div>}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Direktor Paneli</h1>
            <p className="text-slate-500 font-medium mt-1">Elita Meta-Education tizimi boshqaruvi</p>
          </div>
        </header>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center font-black text-indigo-600 animate-pulse">MA'LUMOTLAR YUKLANMOQDA...</div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {activeMenu === "boshqaruv" && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                    <Crown className="w-10 h-10 text-indigo-600 mb-4"/>
                    <h3 className="text-slate-400 font-bold text-sm uppercase">O'qituvchilar</h3>
                    <p className="text-5xl font-black text-slate-900 mt-2">{teachers.length}</p>
                  </div>
                  <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                    <School className="w-10 h-10 text-blue-600 mb-4"/>
                    <h3 className="text-slate-400 font-bold text-sm uppercase">Jami Sinflar</h3>
                    <p className="text-5xl font-black text-slate-900 mt-2">{classes.length}</p>
                  </div>
                  <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                    <Calculator className="w-10 h-10 text-emerald-600 mb-4"/>
                    <h3 className="text-slate-400 font-bold text-sm uppercase">Oylik Byudjet</h3>
                    <p className="text-5xl font-black text-slate-900 mt-2">100K <span className="text-xl">PP</span></p>
                  </div>
                </div>

                <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3"><MessageSquare className="text-indigo-600"/> Kelib tushgan Murojaatlar</h2>
                    <span className="bg-indigo-100 text-indigo-600 font-black px-3 py-1 rounded-full text-sm">{feedbacks.length} ta</span>
                  </div>
                  <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
                    {feedbacks.length === 0 ? (
                      <div className="text-center p-10 text-slate-400 font-bold border-2 border-dashed border-slate-100 rounded-3xl">Hozircha murojaatlar yo'q.</div>
                    ) : (
                      feedbacks.map(f => (
                        <div key={f.id} onClick={() => setReplyModal(f)} className={`p-6 rounded-3xl border flex justify-between items-start gap-4 hover:shadow-md transition-shadow cursor-pointer ${f.status === 'javob_berildi' ? 'bg-white border-slate-200 opacity-60' : 'bg-slate-50 border-indigo-100'}`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`font-black text-sm px-3 py-1 rounded-lg ${f.is_anonymous ? 'bg-slate-800 text-white' : 'bg-blue-100 text-blue-700'}`}>
                                {f.is_anonymous ? 'Yashirin Murojaat' : f.sender_name}
                              </span>
                              {f.status === 'javob_berildi' && <span className="text-xs font-bold text-emerald-500 flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Javob berilgan</span>}
                              <span className="text-xs font-bold text-slate-400 ml-auto">{new Date(f.created_at).toLocaleString('uz-UZ')}</span>
                            </div>
                            <p className="text-slate-700 font-medium leading-relaxed">{f.message}</p>
                            {f.answer && (
                              <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800 text-sm font-medium">
                                <span className="font-bold text-emerald-600 block mb-1">Sizning javobingiz:</span>{f.answer}
                              </div>
                            )}
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteFeedback(f.id); }} className="p-3 text-red-400 hover:text-white hover:bg-red-500 rounded-xl transition-all flex-shrink-0">
                            <Trash2 className="w-5 h-5"/>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeMenu === "teachers" && (
              <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                  <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3"><Crown className="text-indigo-600"/> Ustozlar Ro'yxati</h2>
                  <button onClick={() => setShowTeacherModal(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">
                    <UserPlus className="w-5 h-5"/> Yangi O'qituvchi
                  </button>
                </div>
                <div className="overflow-x-auto p-4">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-400 text-xs font-black uppercase tracking-widest border-b border-slate-50">
                        <th className="p-4">ID / Parol</th><th className="p-4">F.I.SH</th><th className="p-4">Mutaxassisligi</th><th className="p-4">Sinf Rahbarligi</th><th className="p-4 text-right">Amallar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teachers.map(t => (
                        <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                          <td className="p-4">
                            <div className="font-black text-indigo-600 text-sm">{t.id}</div>
                            <div className="text-[10px] font-mono font-bold text-amber-600 uppercase flex items-center gap-1"><Key className="w-3 h-3"/> {t.password}</div>
                          </td>
                          <td className="p-4 font-bold text-slate-900">{t.full_name}</td>
                          <td className="p-4 text-sm text-slate-500 font-medium">{t.bio}</td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${t.homeroom ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>{t.homeroom || "Yo'q"}</span>
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={() => { setEditingTeacher(t); setShowEditTeacherModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all mr-1">
                              <Edit className="w-5 h-5"/>
                            </button>
                            <button onClick={() => handleDeleteTeacher(t.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all">
                              <Trash2 className="w-5 h-5"/>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeMenu === "students" && (
              <div className="space-y-8 animate-in slide-in-from-bottom-4">
                {selectedClassView ? (
                  <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <button onClick={() => setSelectedClassView(null)} className="p-3 bg-white shadow-sm border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 transition-colors"><ArrowLeft className="w-5 h-5"/></button>
                        <h2 className="text-3xl font-black text-slate-900">{selectedClassView} Sinf O'quvchilari</h2>
                      </div>
                      <button onClick={() => { setNewPerson({...newPerson, className: selectedClassView}); setShowStudentModal(true); }} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">
                        <PlusCircle className="w-5 h-5"/> Yangi O'quvchi
                      </button>
                    </div>
                    <div className="overflow-x-auto p-4">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-slate-400 text-xs font-black uppercase tracking-widest border-b border-slate-50">
                            <th className="p-4">O'quvchi ID / Parol</th><th className="p-4">F.I.SH</th><th className="p-4 text-center">Balans (PP)</th><th className="p-4 text-right">Amallar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allStudents.filter(s => s.class_name === selectedClassView).length === 0 ? (
                            <tr><td colSpan={4} className="text-center p-12 text-slate-400 font-bold border-2 border-dashed border-slate-50 rounded-3xl m-4">Bu sinfda o'quvchilar yo'q.</td></tr>
                          ) : (
                            allStudents.filter(s => s.class_name === selectedClassView).map((student) => (
                              <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                <td className="p-4">
                                  <div className="font-black text-indigo-600">{student.id}</div>
                                  <div className="text-[10px] font-mono font-bold text-amber-600 uppercase flex items-center gap-1"><Key className="w-3 h-3"/> {student.password}</div>
                                </td>
                                <td className="p-4 font-bold text-slate-900">{student.full_name}</td>
                                <td className="p-4 text-center"><span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-lg font-black text-sm">{student.pp_balance || 0} PP</span></td>
                                <td className="p-4 text-right">
                                  <button onClick={() => { setEditingStudent(student); setShowEditStudentModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all mr-1">
                                    <Edit className="w-5 h-5"/>
                                  </button>
                                  <button onClick={() => handleDeleteStudent(student.id, student.full_name)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                    <Trash2 className="w-5 h-5"/>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <h2 className="text-3xl font-black text-slate-900">Maktab Sinflari</h2>
                      <button onClick={() => setShowClassModal(true)} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2">
                        <PlusCircle className="w-5 h-5"/> Yangi Sinf Ochish
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {classes.map(cls => {
                        const count = getStudentsCount(cls.name);
                        const isFull = count >= cls.max_limit;
                        return (
                          <div key={cls.name} className={`bg-white p-8 rounded-[3rem] shadow-sm border transition-all hover:shadow-md ${isFull ? 'border-red-100 bg-red-50/10' : 'border-slate-100'}`}>
                            <div className="flex justify-between items-center mb-6 cursor-pointer group" onClick={() => setSelectedClassView(cls.name)}>
                              <h3 className="text-4xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center">
                                {cls.name} <Search className="w-6 h-6 ml-3 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400"/>
                              </h3>
                              <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${isFull ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                                {isFull ? "TO'LGAN" : "BO'SH JOY BOR"}
                              </div>
                            </div>
                            <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest mb-8">
                              <span>O'quvchilar</span><span>{count} / {cls.max_limit}</span>
                            </div>
                            <button onClick={() => setSelectedClassView(cls.name)} className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl font-black hover:bg-indigo-600 hover:text-white transition-all">
                              SINFNI KO'RISH
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* DARS JADVALI MENU */}
            {activeMenu === "timetable" && (
              <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden min-h-[700px] flex flex-col animate-in fade-in">
                <div className="p-8 border-b border-slate-50 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                   <div>
                     <h2 className="text-2xl font-black text-slate-900">Dars Jadvali Konstruktori</h2>
                     <p className="text-slate-400 font-medium">O'quv rejasi asosida jadval tuzing yoki tahrirlang.</p>
                   </div>
                  
                   <div className="flex flex-wrap gap-4 items-center">
                     <button onClick={() => setShowWorkloadModal(true)} className="px-6 py-3 border border-indigo-100 text-indigo-700 bg-indigo-50 font-black rounded-2xl shadow-sm hover:bg-indigo-100 transition-all flex items-center gap-2">
                       <FileText className="w-5 h-5"/> Yuklamalarni Kiritish
                     </button>
                     <button onClick={handleAutoGenerate} disabled={isGenerating} className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-black rounded-2xl shadow-lg hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-50">
                       <Wand2 className="w-5 h-5"/> {isGenerating ? "Jadval tuzilmoqda..." : "Avtomatik Tuzish"}
                     </button>
                     <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto max-w-sm hide-scrollbar">
                       {classes.map(c => (
                         <button key={c.name} onClick={() => setSelectedClassForTimetable(c.name)} className={`px-5 py-2.5 rounded-xl font-black text-sm whitespace-nowrap transition-all ${selectedClassForTimetable === c.name ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                           {c.name}
                         </button>
                       ))}
                     </div>
                     <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 p-1.5 rounded-2xl">
                        <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className="bg-white px-4 py-2.5 rounded-xl font-black text-sm outline-none text-indigo-700 shadow-sm cursor-pointer">
                           <option value="1-chorak">1-chorak</option>
                           <option value="2-chorak">2-chorak</option>
                           <option value="3-chorak">3-chorak</option>
                           <option value="4-chorak">4-chorak</option>
                        </select>
                     </div>
                   </div>
                </div>

                {!selectedClassForTimetable ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-20 text-slate-300">
                    <Calendar className="w-20 h-20 mb-4 opacity-20"/>
                    <p className="text-xl font-bold italic">Sinfni tanlang</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-x-auto p-8 bg-slate-50/50">
                    <table className="w-full border-collapse bg-white shadow-sm rounded-2xl overflow-hidden border border-slate-100">
                      <thead>
                        <tr>
                          <th className="p-4 bg-slate-50 border-b border-r border-slate-100 w-20"><Clock className="w-5 h-5 mx-auto text-slate-300"/></th>
                          {/* ✅ HAFTA KUNLARI TARJIMASI ISHLATILDI */}
                          {days.map(d => <th key={d} className="p-4 bg-slate-50 border-b border-slate-100 text-slate-400 font-black uppercase text-xs tracking-widest">{fullDayNames[d]}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {lessonNumbers.map(num => (
                          <tr key={num}>
                            <td className="p-4 border-b border-r border-slate-100 text-center font-black text-slate-400 bg-slate-50/30 text-lg">{num}</td>
                            {days.map(day => {
                              const cellLessons = timetableData.filter(t => t.class_name === selectedClassForTimetable && t.day_of_week === day && t.lesson_number === num && t.term === selectedTerm);
                              return (
                                <td key={day+num} onClick={() => { setCurrentCell({day, lesson: num}); setLessonForm({subject: cellLessons[0]?.subject || "", teacher_id: cellLessons[0]?.teacher_id || "", room: cellLessons[0]?.room || "", group_type: "Barchasi"}); setConflictWarning(null); setShowLessonModal(true); }} className={`p-2 border-b border-slate-100 h-32 w-44 cursor-pointer transition-all hover:bg-indigo-50/50 group relative align-top`}>
                                  {cellLessons.length === 0 && (
                                    <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100">
                                      <PlusCircle className="text-indigo-300 w-6 h-6"/>
                                    </div>
                                  )}
                                  {cellLessons.length > 0 && (
                                    <div className="flex h-full gap-1">
                                      {cellLessons.map(lesson => (
                                        <div key={lesson.id} className="flex-1 h-full flex flex-col justify-center bg-indigo-50/80 rounded-xl p-2 border border-indigo-100 relative group/item">
                                          <p className="font-black text-slate-900 text-xs leading-tight line-clamp-2">{lesson.subject}</p>
                                          {lesson.group_type !== 'Barchasi' && (
                                            <span className="text-[8px] bg-indigo-600 text-white px-1.5 py-0.5 rounded mt-1 self-start inline-block">{lesson.group_type}</span>
                                          )}
                                          <p className="text-[9px] font-bold text-indigo-500 mt-1 uppercase line-clamp-1">{teachers.find(t=>t.id === lesson.teacher_id)?.full_name || "Noma'lum"}</p>
                                          <button onClick={(e) => { e.stopPropagation(); deleteLessonItem(lesson.id); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/item:opacity-100 shadow-md">
                                            <X className="w-3 h-3"/>
                                          </button>
                                        </div>
                                      ))}
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
                )}
              </div>
            )}

            {/* ALGORITM MENU */}
            {activeMenu === "algorithm" && (
              <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10"><Calculator className="w-64 h-64"/></div>
                <div className="relative z-10 max-w-2xl">
                  <h2 className="text-5xl font-black italic tracking-tighter mb-6">ELITA IQTISODIYOTI</h2>
                  <p className="text-slate-400 text-lg font-medium leading-relaxed mb-10">Sizning maktabingizda moliya va rag'batlantirish tizimi to'liq avtomatlashtirilgan. Har oyning birinchi sanasida tizim sinflar o'rnini aniqlaydi va **100,000 PP** jamg'armani o'quvchilarning o'rtacha bahosiga qarab taqsimlaydi.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ======================================= */}
      {/* YUKLAMALAR MODALI (MULTI-SELECT BILAN) */}
      {/* ======================================= */}
      {showWorkloadModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowWorkloadModal(false)}>
           <div className="bg-white rounded-[3rem] w-full max-w-5xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]" onClick={e => { e.stopPropagation(); setShowClassDropdown(false); }}>
              <div className="p-8 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                 <div>
                   <h3 className="text-2xl font-black text-indigo-900">O'quv Rejasi (Yuklamalar)</h3>
                   <p className="text-indigo-600 font-bold text-sm mt-1">Sinf va guruhlarga o'qituvchilarni biriktiring.</p>
                 </div>
                 <button onClick={() => setShowWorkloadModal(false)} className="bg-white p-2 rounded-full text-indigo-400 hover:text-indigo-600">
                   <X/>
                 </button>
              </div>
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4 items-end">
               
                <div className="relative flex-[1.5] min-w-[200px]" onClick={e => e.stopPropagation()}>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Sinflarni Tanlang</label>
                  <div className="w-full p-3 rounded-xl border border-slate-200 bg-white cursor-pointer font-bold flex justify-between items-center text-sm" onClick={() => setShowClassDropdown(!showClassDropdown)}>
                    <span className="truncate pr-2">{workloadForm.class_names.length > 0 ? `${workloadForm.class_names.length} ta sinf tanlandi` : "Sinf..."}</span>
                    <ChevronDown className="w-4 h-4 flex-shrink-0" />
                  </div>
                  {showClassDropdown && (
                    <div className="absolute top-[110%] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                       {classes.map(c => (
                         <label key={c.name} className="flex items-center p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0">
                            <input type="checkbox" className="mr-3 w-4 h-4 accent-indigo-600" checked={workloadForm.class_names.includes(c.name)} onChange={() => toggleClassInWorkload(c.name)}/>
                            <span className="font-bold text-sm">{c.name}</span>
                         </label>
                       ))}
                    </div>
                  )}
                </div>

                <div className="flex-[1.5] min-w-[150px]">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Fan</label>
                  <select className="w-full p-3 rounded-xl border border-slate-200 outline-none font-bold text-sm" value={workloadForm.subject} onChange={e=>setWorkloadForm({...workloadForm, subject: e.target.value, teacher_id: "", teacher_id_2: ""})}>
                    <option value="">Fan...</option>
                    {subjectsBase.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
               
                <div className="flex-[1.5] min-w-[150px]">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Qanday o'tiladi?</label>
                  <select className="w-full p-3 rounded-xl border border-slate-200 outline-none font-bold text-sm" value={workloadForm.split_mode} onChange={e=>setWorkloadForm({...workloadForm, split_mode: e.target.value})}>
                    {splitModes.map(g=><option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                {workloadForm.split_mode === "Barchasi" ? (
                  <div className="flex-[2] min-w-[180px]">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">O'qituvchi</label>
                    <select className="w-full p-3 rounded-xl border border-slate-200 outline-none font-bold text-sm" value={workloadForm.teacher_id} onChange={e=>setWorkloadForm({...workloadForm, teacher_id: e.target.value})}>
                      <option value="">Kim o'tadi...</option>
                      {teachers.filter(t => !workloadForm.subject || t.bio === workloadForm.subject).map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}
                    </select>
                  </div>
                ) : (
                  <>
                    <div className="flex-[1.5] min-w-[150px]">
                      <label className="text-[10px] font-black text-indigo-500 uppercase mb-1 block">1-chi O'qituvchi</label>
                      <select className="w-full p-3 rounded-xl border border-indigo-200 bg-indigo-50 outline-none font-bold text-sm" value={workloadForm.teacher_id} onChange={e=>setWorkloadForm({...workloadForm, teacher_id: e.target.value})}>
                        <option value="">Tanlang...</option>
                        {teachers.filter(t => !workloadForm.subject || t.bio === workloadForm.subject).map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}
                      </select>
                    </div>
                    <div className="flex-[1.5] min-w-[150px]">
                      <label className="text-[10px] font-black text-pink-500 uppercase mb-1 block">2-chi O'qituvchi</label>
                      <select className="w-full p-3 rounded-xl border border-pink-200 bg-pink-50 outline-none font-bold text-sm" value={workloadForm.teacher_id_2} onChange={e=>setWorkloadForm({...workloadForm, teacher_id_2: e.target.value})}>
                        <option value="">Tanlang...</option>
                        {teachers.filter(t => !workloadForm.subject || t.bio === workloadForm.subject).map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}
                      </select>
                    </div>
                  </>
                )}
               
                <div className="w-24">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Soat</label>
                  <input type="number" min="1" max="6" className="w-full p-3 rounded-xl border border-slate-200 outline-none font-bold text-center text-sm" value={workloadForm.hours} onChange={e=>setWorkloadForm({...workloadForm, hours: Number(e.target.value)})} />
                </div>
               
                <button onClick={handleAddWorkload} className="p-3 px-6 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md font-black flex items-center justify-center gap-2">
                  QO'SHISH
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-white">
                {workloads.length === 0 ? (
                  <div className="text-center p-10 text-slate-400 font-bold border-2 border-dashed border-slate-100 rounded-3xl">Hali hech qanday dars yuklamasi kiritilmagan. Yuqoridan qo'shing.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {workloads.map(w => (
                      <div key={w.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                        <div className="flex items-center gap-4">
                           <span className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-black text-sm">{w.class_name}</span>
                           <div>
                             <p className="font-black text-slate-900 text-sm">{w.subject} <span className="text-indigo-600 ml-1 text-xs">({w.group_type})</span></p>
                             <p className="text-xs font-bold text-slate-500 mt-1">{teachers.find(t=>t.id===w.teacher_id)?.full_name} | {w.hours} soat</p>
                           </div>
                        </div>
                        <button onClick={() => handleDeleteWorkload(w.id)} className="p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors">
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
           </div>
        </div>
      )}

      {/* QO'LDA DARS QO'SHISH MODALI */}
      {showLessonModal && currentCell && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowLessonModal(false)}>
           <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-8 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-indigo-900">{currentCell.day}, {currentCell.lesson}-soat</h3>
                  <p className="text-indigo-600 font-bold text-xs uppercase tracking-widest mt-1">{selectedClassForTimetable}</p>
                </div>
                <button onClick={() => setShowLessonModal(false)} className="bg-white p-2 rounded-full text-indigo-400 hover:text-indigo-600"><X/></button>
              </div>
              <div className="p-8 space-y-4">
                 {conflictWarning && (
                   <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl text-sm font-bold flex items-start gap-3">
                     <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                     <div>{conflictWarning}</div>
                   </div>
                 )}
                
                 <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-500" value={lessonForm.group_type} onChange={e => setLessonForm({...lessonForm, group_type: e.target.value})}>
                   {groupTypes.map(g => <option key={g} value={g}>{g}</option>)}
                 </select>

                 <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-500" value={lessonForm.subject} onChange={e => {setLessonForm({...lessonForm, subject: e.target.value, teacher_id: ""}); setConflictWarning(null);}}>
                   <option value="">Fanni Tanlang</option>
                   {subjectsBase.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>

                 <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-500" value={lessonForm.teacher_id} onChange={e => {setLessonForm({...lessonForm, teacher_id: e.target.value}); setConflictWarning(null);}}>
                    <option value="">Ustozni Tanlang</option>
                    {teachers.filter(t => !lessonForm.subject || t.bio === lessonForm.subject).map(t => {
                        const isBusy = timetableData.find(time => time.term === selectedTerm && time.day_of_week === currentCell.day && time.lesson_number === currentCell.lesson && time.teacher_id === t.id && time.class_name !== selectedClassForTimetable);
                        return <option key={t.id} value={t.id} className={isBusy ? "text-red-500 font-bold" : "text-green-600 font-bold"}>{t.full_name} {isBusy ? `(🔴 Band: ${isBusy.class_name} da)` : `(🟢 Bo'sh)`}</option>;
                      })}
                 </select>

                 <input type="text" placeholder="Xona (Masalan: 12-xona)" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-500" value={lessonForm.room} onChange={e => setLessonForm({...lessonForm, room: e.target.value})} />
                 <button onClick={handleSaveLesson} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all text-sm">SAQLASH VA QO'SHISH</button>
              </div>
           </div>
        </div>
      )}

      {credentials && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={() => setCredentials(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="credentials-title" className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Key className="h-7 w-7" /></div>
            <h2 id="credentials-title" className="mt-4 text-center text-2xl font-black text-slate-950">{credentials.role} yaratildi</h2>
            <p className="mt-2 text-center text-sm leading-6 text-slate-500">Kirish ma'lumotlarini foydalanuvchiga xavfsiz yetkazing. Parol bu oynani yopgach qayta ko'rsatilmaydi.</p>
            <div className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-4">
              <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Shaxsiy ID</p><p className="mt-1 font-mono text-lg font-black text-slate-900">{credentials.id}</p></div>
              <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Vaqtinchalik parol</p><p className="mt-1 break-all font-mono text-lg font-black text-slate-900">{credentials.password}</p></div>
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => { void navigator.clipboard?.writeText(`ID: ${credentials.id}\nParol: ${credentials.password}`).then(() => showToast("Kirish ma'lumotlari nusxalandi.")); }} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 font-bold text-slate-700 hover:bg-slate-50"><Copy className="h-4 w-4" /> Nusxalash</button>
              <button onClick={() => setCredentials(null)} className="flex-1 rounded-xl bg-slate-950 py-3 font-black text-white hover:bg-indigo-600">Tayyor</button>
            </div>
          </section>
        </div>
      )}

      {/* MUROJAAT JAVOBI MODALI */}
      {replyModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4" onClick={() => setReplyModal(null)}>
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl p-8" onClick={e=>e.stopPropagation()}>
            <h3 className="text-xl font-black mb-4">Javob Yozish</h3>
            <textarea rows={4} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none mb-4 border" value={replyText} onChange={e=>setReplyText(e.target.value)}></textarea>
            <button onClick={handleSendReply} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black">YUBORISH</button>
          </div>
        </div>
      )}

      {/* USTOZ QO'SHISH MODALI */}
      {showTeacherModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4" onClick={() => setShowTeacherModal(false)}>
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl p-8" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between mb-6">
              <h3 className="text-xl font-black">Yangi O'qituvchi</h3>
              <button onClick={() => setShowTeacherModal(false)}><X/></button>
            </div>
            <input type="text" placeholder="F.I.SH" className="w-full p-4 bg-slate-100 rounded-2xl font-bold outline-none mb-4" value={newPerson.fullName} onChange={e=>setNewPerson({...newPerson, fullName: e.target.value})} />
            <select className="w-full p-4 bg-slate-100 rounded-2xl font-bold outline-none mb-4" value={newPerson.subject} onChange={e=>setNewPerson({...newPerson, subject: e.target.value})}>
              <option value="">Fan...</option>
              {subjectsBase.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <select className="w-full p-4 bg-blue-50 text-blue-600 rounded-2xl font-bold outline-none mb-6" value={newPerson.homeroom} onChange={e=>setNewPerson({...newPerson, homeroom: e.target.value})}>
              <option value="">Sinf rahbarligi...</option>
              <option value="">Yo'q</option>
              {classes.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <button onClick={handleAddTeacher} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black">QO'SHISH</button>
          </div>
        </div>
      )}

      {/* SINF QO'SHISH MODALI */}
      {showClassModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4" onClick={() => setShowClassModal(false)}>
          <div className="bg-white rounded-[3rem] w-full max-w-sm shadow-2xl p-8" onClick={e=>e.stopPropagation()}>
            <h3 className="text-xl font-black mb-6">Yangi Sinf</h3>
            <input type="text" placeholder="Nomi (Masalan: 9-A)" className="w-full p-4 bg-slate-100 rounded-2xl font-black text-center mb-4" value={newClassInfo.name} onChange={e=>setNewClassInfo({...newClassInfo, name: e.target.value})} />
            <input type="number" placeholder="O'quvchilar Limiti" className="w-full p-4 bg-slate-100 rounded-2xl font-bold text-center mb-6" value={newClassInfo.limit} onChange={e=>setNewClassInfo({...newClassInfo, limit: Number(e.target.value)})} />
            <button onClick={handleAddClass} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black">YARATISH</button>
          </div>
        </div>
      )}

      {/* O'QUVCHI QO'SHISH MODALI */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4" onClick={() => setShowStudentModal(false)}>
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl p-8" onClick={e=>e.stopPropagation()}>
            <h3 className="text-xl font-black mb-6">Yangi O'quvchi</h3>
            <input type="text" placeholder="F.I.SH" className="w-full p-4 bg-slate-100 rounded-2xl font-bold mb-4" value={newPerson.fullName} onChange={e=>setNewPerson({...newPerson, fullName: e.target.value})} />
            <select className="w-full p-4 bg-slate-100 rounded-2xl font-bold mb-6" value={newPerson.className} onChange={e=>setNewPerson({...newPerson, className: e.target.value})}>
              <option value="">Sinfni tanlang</option>
              {classes.map(classItem => <option key={classItem.name} value={classItem.name}>{classItem.name} ({getStudentsCount(classItem.name)}/{classItem.max_limit || "∞"})</option>)}
            </select>
            <button onClick={handleAddStudent} disabled={!newPerson.fullName.trim() || !newPerson.className} className="w-full rounded-2xl bg-emerald-600 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">O'QUVCHINI QO'SHISH</button>
          </div>
        </div>
      )}

      {/* USTOZ TAHRIRLASH MODALI */}
      {showEditTeacherModal && editingTeacher && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4" onClick={() => setShowEditTeacherModal(false)}>
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl p-8" onClick={e=>e.stopPropagation()}>
            <h3 className="text-xl font-black mb-6">O'qituvchini Tahrirlash</h3>
            <input type="text" className="w-full p-4 bg-slate-100 rounded-2xl font-bold mb-4" value={editingTeacher.full_name} onChange={e=>setEditingTeacher({...editingTeacher, full_name: e.target.value})} />
            <select className="w-full p-4 bg-slate-100 rounded-2xl font-bold mb-4" value={editingTeacher.bio} onChange={e=>setEditingTeacher({...editingTeacher, bio: e.target.value})}>
              <option value="">Fan</option>
              {subjectsBase.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <select className="w-full p-4 bg-blue-50 text-blue-600 rounded-2xl font-bold mb-6" value={editingTeacher.homeroom || ""} onChange={e=>setEditingTeacher({...editingTeacher, homeroom: e.target.value})}>
              <option value="">Sinf rahbarligi...</option>
              <option value="">Yo'q</option>
              {classes.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <button onClick={handleUpdateTeacher} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black">SAQLASH</button>
          </div>
        </div>
      )}

      {/* O'QUVCHI TAHRIRLASH MODALI */}
      {showEditStudentModal && editingStudent && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4" onClick={() => setShowEditStudentModal(false)}>
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl p-8" onClick={e=>e.stopPropagation()}>
            <h3 className="text-xl font-black mb-6">O'quvchini Tahrirlash</h3>
            <input type="text" className="w-full p-4 bg-slate-100 rounded-2xl font-bold mb-4" value={editingStudent.full_name} onChange={e=>setEditingStudent({...editingStudent, full_name: e.target.value})} />
            <select className="w-full p-4 bg-slate-100 rounded-2xl font-bold mb-6" value={editingStudent.class_name} onChange={e=>setEditingStudent({...editingStudent, class_name: e.target.value})}>
              {classes.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <button onClick={handleUpdateStudent} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black">SAQLASH</button>
          </div>
        </div>
      )}

    </div>
  );
}
