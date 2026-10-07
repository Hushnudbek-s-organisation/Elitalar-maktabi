// ============================================================================
// SchoolOS Uzbekistan — DEMO MA'LUMOTLAR
// 004_seed_dev.sql bilan uzluksizlik: xuddi shu maktab, o'qituvchilar, sinflar.
// Supabase ulanganda bu fayl o'rnini real DataSource egallaydi.
// ============================================================================

import type {
  Announcement,
  AttendanceRecord,
  ChatThread,
  ClassInfo,
  GradeRecord,
  Homework,
  LessonToday,
  RiskEvent,
  Student,
  Subject,
  Teacher,
  TimetableSlot,
} from "@/types/demo";
import { todayISO } from "@/lib/utils";

export const SCHOOL = {
  name: "1-sonli DEMO umumiy o'rta ta'lim maktabi",
  year: "2026/2027",
  quarter: "1-chorak",
  city: "Toshkent",
};

export const SUBJECTS: Subject[] = [
  { id: "mat", name: "Matematika", short: "MAT", color: "bg-indigo-500" },
  { id: "ont", name: "Ona tili va adabiyot", short: "ONT", color: "bg-rose-500" },
  { id: "ing", name: "Ingliz tili", short: "ING", color: "bg-sky-500" },
  { id: "fiz", name: "Fizika", short: "FIZ", color: "bg-amber-500" },
  { id: "kim", name: "Kimyo", short: "KIM", color: "bg-emerald-500" },
  { id: "tar", name: "Tarix", short: "TAR", color: "bg-orange-500" },
  { id: "jit", name: "Jismoniy tarbiya", short: "JT", color: "bg-teal-500" },
  { id: "bio", name: "Biologiya", short: "BIO", color: "bg-lime-600" },
];

export const TEACHERS: Teacher[] = [
  { id: "t1", name: "Hakimov Hushnudbek Alisherovich", subjectIds: ["mat"], phone: "+998 90 111-01-01" },
  { id: "t2", name: "Karimova Dilnoza Anvarovna", subjectIds: ["ing"], phone: "+998 90 111-01-02" },
  { id: "t3", name: "Nazarova Zulfiya Bahodirovna", subjectIds: ["ont", "ing"], phone: "+998 90 111-01-03" },
  { id: "t4", name: "Rahimov Alisher To'lqinovich", subjectIds: ["fiz", "kim"], phone: "+998 90 111-01-04" },
  { id: "t5", name: "Yusupova Malika Shavkatovna", subjectIds: ["ont"], phone: "+998 90 111-01-05" },
  { id: "t6", name: "Tursunov Bekzod Murodovich", subjectIds: ["tar", "jit"], phone: "+998 90 111-01-06" },
  { id: "t7", name: "Sultonova Feruza Umidovna", subjectIds: ["bio", "mat"], phone: "+998 90 111-01-07" },
];

export const CLASSES: ClassInfo[] = [
  { id: "c10a", name: "10-A", grade: 10, homeroomTeacherId: "t1" },
  { id: "c10b", name: "10-B", grade: 10, homeroomTeacherId: "t5" },
  { id: "c7a", name: "7-A", grade: 7, homeroomTeacherId: "t6" },
];

const s = (id: string, name: string, classId: string, gender: "M" | "F", n: number): Student => ({
  id,
  name,
  classId,
  gender,
  admissionNumber: `2026-${String(n).padStart(4, "0")}`,
});

export const STUDENTS: Student[] = [
  // 10-A (12) — 004 seed'dagi ro'yxat davomi
  s("s01", "Olimov Jasur Alisherovich", "c10a", "M", 1),
  s("s02", "Esonova Malika Rustamovna", "c10a", "F", 2),
  s("s03", "Qodirov Sardar Bekzodovich", "c10a", "M", 3),
  s("s04", "Yusupova Zilola Anvarovna", "c10a", "F", 4),
  s("s05", "Tursunov Aziz Ismoilovich", "c10a", "M", 5),
  s("s06", "Karimova Nodira Bahodirovna", "c10a", "F", 6),
  s("s07", "Rahimov Doston Alisherovich", "c10a", "M", 7),
  s("s08", "Islomova Mohira To'lqinovna", "c10a", "F", 8),
  s("s09", "Bekmurodov Sanjar O'tkirovich", "c10a", "M", 9),
  s("s10", "Xolmatova Sevinch Islomovna", "c10a", "F", 10),
  s("s11", "Abdullayev Jasurbek Rustamovich", "c10a", "M", 11),
  s("s12", "Sultonova Kamola Umidovna", "c10a", "F", 12),
  // 10-B (12)
  s("s13", "Ahmedov Bexruz Dilshodovich", "c10b", "M", 13),
  s("s14", "Xasanova Madina Shavkatovna", "c10b", "F", 14),
  s("s15", "Olimov Umid Karimovich", "c10b", "M", 15),
  s("s16", "Ergasheva Nilufar Anvarovna", "c10b", "F", 16),
  s("s17", "Yo'ldoshev Bekzod Alisherovich", "c10b", "M", 17),
  s("s18", "Qosimova Dilnoza Rahimovna", "c10b", "F", 18),
  s("s19", "Sobirov Jahongir Ismoilovich", "c10b", "M", 19),
  s("s20", "Toshpulatova Zuhra Baxtiyorovna", "c10b", "F", 20),
  s("s21", "Normatov Ilhom To'lqinovich", "c10b", "M", 21),
  s("s22", "G'ulomova Shahnoza Rustamovna", "c10b", "F", 22),
  s("s23", "Zokirov Farruh Bekmurodovich", "c10b", "M", 23),
  s("s24", "Usmonova Nargiza Dilshodovna", "c10b", "F", 24),
  // 7-A (10)
  s("s25", "Olimov Bekzod Alisherovich", "c7a", "M", 25),
  s("s26", "Esonova Dilnoza Rustamovna", "c7a", "F", 26),
  s("s27", "Qodirov Muhammad Bekzodovich", "c7a", "M", 27),
  s("s28", "Yusupova Malika Anvarovna", "c7a", "F", 28),
  s("s29", "Tursunov Isroil Murodovich", "c7a", "M", 29),
  s("s30", "Karimova Zahro Bahodirovna", "c7a", "F", 30),
  s("s31", "Rahimov Sarvar Alisherovich", "c7a", "M", 31),
  s("s32", "Islomova Sultonachat To'lqinovna", "c7a", "F", 32),
  s("s33", "Bekmurodov Muhammad O'tkirovich", "c7a", "M", 33),
  s("s34", "Xolmatova Ozoda Islomovna", "c7a", "F", 34),
];

// ---------------------------------------------------------------------------
// Dars jadvali (1-smena, 5 kun, 6 dars). Jadval generatori natijasining
// statik ko'rinishi (004'da: 60/60 slot, score=100).
// ---------------------------------------------------------------------------
const tt = (
  classId: string,
  day: number,
  period: number,
  subjectId: string,
  teacherId: string,
  room: string,
  group?: 1 | 2,
): TimetableSlot => ({ classId, day, period, subjectId, teacherId, room, group });

export const TIMETABLE: TimetableSlot[] = [
  // 10-A
  tt("c10a", 1, 1, "mat", "t1", "301"), tt("c10a", 1, 2, "ont", "t3", "301"),
  tt("c10a", 1, 3, "ing", "t2", "302", 1), tt("c10a", 1, 3, "ing", "t3", "303", 2),
  tt("c10a", 1, 4, "fiz", "t4", "Lab-1"), tt("c10a", 1, 5, "tar", "t6", "301"),
  tt("c10a", 2, 1, "mat", "t1", "301"), tt("c10a", 2, 2, "kim", "t4", "Lab-2"),
  tt("c10a", 2, 3, "ont", "t3", "301"), tt("c10a", 2, 4, "ing", "t2", "302", 1),
  tt("c10a", 2, 4, "ing", "t3", "303", 2), tt("c10a", 2, 5, "bio", "t7", "301"),
  tt("c10a", 3, 1, "fiz", "t4", "Lab-1"), tt("c10a", 3, 2, "mat", "t1", "301"),
  tt("c10a", 3, 3, "ont", "t3", "301"), tt("c10a", 3, 4, "jit", "t6", "Sport zali"),
  tt("c10a", 3, 5, "tar", "t6", "301"),
  tt("c10a", 4, 1, "mat", "t1", "301"), tt("c10a", 4, 2, "ing", "t2", "302", 1),
  tt("c10a", 4, 2, "ing", "t3", "303", 2), tt("c10a", 4, 3, "bio", "t7", "301"),
  tt("c10a", 4, 4, "kim", "t4", "Lab-2"), tt("c10a", 4, 5, "ont", "t3", "301"),
  tt("c10a", 5, 1, "mat", "t1", "301"), tt("c10a", 5, 2, "fiz", "t4", "Lab-1"),
  tt("c10a", 5, 3, "tar", "t6", "301"), tt("c10a", 5, 4, "ont", "t3", "301"),
  // 10-B
  tt("c10b", 1, 1, "ont", "t5", "304"), tt("c10b", 1, 2, "mat", "t1", "304"),
  tt("c10b", 1, 3, "ing", "t2", "302"), tt("c10b", 1, 4, "bio", "t7", "304"),
  tt("c10b", 1, 5, "kim", "t4", "Lab-2"),
  tt("c10b", 2, 1, "mat", "t1", "304"), tt("c10b", 2, 2, "tar", "t6", "304"),
  tt("c10b", 2, 3, "ont", "t5", "304"), tt("c10b", 2, 4, "fiz", "t4", "Lab-1"),
  tt("c10b", 2, 5, "ing", "t2", "302"),
  tt("c10b", 3, 1, "ing", "t2", "302"), tt("c10b", 3, 2, "mat", "t1", "304"),
  tt("c10b", 3, 3, "kim", "t4", "Lab-2"), tt("c10b", 3, 4, "ont", "t5", "304"),
  tt("c10b", 3, 5, "jit", "t6", "Sport zali"),
  tt("c10b", 4, 1, "bio", "t7", "304"), tt("c10b", 4, 2, "ont", "t5", "304"),
  tt("c10b", 4, 3, "mat", "t1", "304"), tt("c10b", 4, 4, "tar", "t6", "304"),
  tt("c10b", 5, 1, "ont", "t5", "304"), tt("c10b", 5, 2, "fiz", "t4", "Lab-1"),
  tt("c10b", 5, 3, "ing", "t2", "302"), tt("c10b", 5, 4, "mat", "t1", "304"),
  // 7-A
  tt("c7a", 1, 1, "ont", "t6", "203"), tt("c7a", 1, 2, "mat", "t7", "203"),
  tt("c7a", 1, 3, "tar", "t6", "203"), tt("c7a", 1, 4, "jit", "t6", "Sport zali"),
  tt("c7a", 2, 1, "mat", "t7", "203"), tt("c7a", 2, 2, "ont", "t6", "203"),
  tt("c7a", 2, 3, "ing", "t2", "302"), tt("c7a", 2, 4, "bio", "t7", "203"),
  tt("c7a", 3, 1, "tar", "t6", "203"), tt("c7a", 3, 2, "ing", "t2", "302"),
  tt("c7a", 3, 3, "mat", "t7", "203"), tt("c7a", 3, 4, "ont", "t6", "203"),
  tt("c7a", 4, 1, "bio", "t7", "203"), tt("c7a", 4, 2, "mat", "t7", "203"),
  tt("c7a", 4, 3, "jit", "t6", "Sport zali"), tt("c7a", 4, 4, "ing", "t2", "302"),
  tt("c7a", 5, 1, "ont", "t6", "203"), tt("c7a", 5, 2, "ing", "t2", "302"),
  tt("c7a", 5, 3, "tar", "t6", "203"),
];

// Bugungi darslar (demo uchun har doim "dushanba" to'plami)
export const TODAY_LESSONS: LessonToday[] = [
  { id: "l1", classId: "c10a", subjectId: "mat", teacherId: "t1", period: 1, topic: "Kvadrat tenglamalar va Viyet teoremasi" },
  { id: "l2", classId: "c10a", subjectId: "ont", teacherId: "t3", period: 2, topic: "Alisher Navoiy g'azallari tahlili" },
  { id: "l3", classId: "c10a", subjectId: "ing", teacherId: "t2", period: 3, topic: "Past Simple: affirmative", group: 1 },
  { id: "l4", classId: "c10a", subjectId: "ing", teacherId: "t3", period: 3, topic: "Past Simple: affirmative", group: 2 },
  { id: "l5", classId: "c10b", subjectId: "mat", teacherId: "t1", period: 2, topic: "Trigonometrik funksiyalar" },
];

// Bugungi davomat (matematika darsi, 10-A): 10 keldi, 1 kechikdi, 1 sababsiz
export const TODAY_ATTENDANCE: AttendanceRecord[] = [
  { studentId: "s02", date: todayISO(), status: "UNEXCUSED" },
  { studentId: "s07", date: todayISO(), status: "LATE" },
];

// Baholar — 10-A matematika (formativ, 10-ball) + BSB
export const GRADES: GradeRecord[] = [
  { studentId: "s01", subjectId: "mat", type: "FORMATIV", value: 9, date: todayISO(), status: "PUBLISHED" },
  { studentId: "s02", subjectId: "mat", type: "FORMATIV", value: 6, date: todayISO(), status: "PUBLISHED" },
  { studentId: "s03", subjectId: "mat", type: "FORMATIV", value: 8, date: todayISO(), status: "PUBLISHED" },
  { studentId: "s04", subjectId: "mat", type: "FORMATIV", value: 10, date: todayISO(), status: "PUBLISHED" },
  { studentId: "s05", subjectId: "mat", type: "FORMATIV", value: 7, date: todayISO(), status: "PUBLISHED" },
  { studentId: "s06", subjectId: "mat", type: "FORMATIV", value: 9, date: todayISO(), status: "PUBLISHED" },
  { studentId: "s07", subjectId: "mat", type: "FORMATIV", value: 5, date: todayISO(), status: "PUBLISHED" },
  { studentId: "s08", subjectId: "mat", type: "FORMATIV", value: 8, date: todayISO(), status: "PUBLISHED" },
  { studentId: "s09", subjectId: "mat", type: "FORMATIV", value: 6, date: todayISO(), status: "PUBLISHED" },
  { studentId: "s10", subjectId: "mat", type: "FORMATIV", value: 9, date: todayISO(), status: "PUBLISHED" },
  { studentId: "s11", subjectId: "mat", type: "FORMATIV", value: 7, date: todayISO(), status: "PUBLISHED" },
  { studentId: "s12", subjectId: "mat", type: "FORMATIV", value: 10, date: todayISO(), status: "PUBLISHED" },
  // O'tgan hafta BSB (100-ball)
  { studentId: "s01", subjectId: "mat", type: "BSB", value: 88, date: "2026-09-28", status: "PUBLISHED" },
  { studentId: "s04", subjectId: "mat", type: "BSB", value: 92, date: "2026-09-28", status: "PUBLISHED" },
  { studentId: "s12", subjectId: "mat", type: "BSB", value: 95, date: "2026-09-28", status: "PUBLISHED" },
  { studentId: "s02", subjectId: "mat", type: "BSB", value: 61, date: "2026-09-28", status: "PUBLISHED" },
  // Ona tili formativ
  { studentId: "s01", subjectId: "ont", type: "FORMATIV", value: 8, date: todayISO(), status: "PUBLISHED" },
  { studentId: "s03", subjectId: "ont", type: "FORMATIV", value: 9, date: todayISO(), status: "PUBLISHED" },
];

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "a1",
    title: "Ota-onalar yig'ilishi",
    body: "15-oktabr, soat 15:00 da maktab bo'yicha ota-onalar yig'ilishi bo'lib o'tadi. Barcha ota-onalarni taklif qilamiz.",
    date: "2026-10-05",
    scope: "Maktab",
    pinned: true,
    author: "Direktorat",
  },
  {
    id: "a2",
    title: "10-A: matematika fanidan BSB",
    body: "Dushanba kuni matematika fanidan bob bo'yicha summativ baholash (BSB) bo'lib o'tadi. Tayyorlaning!",
    date: "2026-10-06",
    scope: "Sinf",
    pinned: false,
    author: "Hakimov H.A.",
  },
  {
    id: "a3",
    title: "Kuz bayrami tadbiri",
    body: "20-oktabr kuni maktab hududida kuz bayrami tadbiri o'tkaziladi. Har sinf o'z stendini tayyorlaydi.",
    date: "2026-10-03",
    scope: "Maktab",
    pinned: false,
    author: "Direktorat",
  },
];

export const HOMEWORK: Homework[] = [
  {
    id: "h1",
    classId: "c10a",
    subjectId: "mat",
    title: "Kvadrat tenglamalarni yechish",
    description: "Darslikdagi 45–48-mashqlarni yeching, Viyet teoremasini qo'llang.",
    dueDate: todayISO(),
    createdBy: "Hakimov H.A.",
  },
  {
    id: "h2",
    classId: "c10a",
    subjectId: "ing",
    title: "Past Simple — 2-guruh",
    description: "Workbook b. 34, exercise 1–3. Affirmative sentences.",
    dueDate: todayISO(),
    createdBy: "Nazarova Z.B.",
  },
  {
    id: "h3",
    classId: "c10b",
    subjectId: "mat",
    title: "Trigonometriya formulalari",
    description: "Asosiy trigonometrik ayniyatlarni yod olish, 12–15-mashq.",
    dueDate: todayISO(),
    createdBy: "Hakimov H.A.",
  },
];

// Risk dvigateli chiqishi (izohlanadigan sabablar bilan)
export const RISK_EVENTS: RiskEvent[] = [
  {
    id: "r1",
    studentId: "s02",
    severity: "HIGH",
    status: "OPEN",
    reasons: [
      "Oxirgi 2 haftada 3 kun sababsiz qoldirildi",
      "Matematika o'rtacha bahosi 6.0 (o'tgan chorakda 8.2 edi)",
      "2 marta uy vazifasi topshirilmagan",
    ],
  },
];

export const CHAT_THREADS: ChatThread[] = [
  {
    id: "th1",
    withName: "Olimova Nilufar",
    withRole: "Ota-ona (Jasur, 10-A)",
    lastMessage: "Rahmat! Jasurga ko'rsataman.",
    lastTime: "12:40",
    unread: 0,
    messages: [
      { from: "me", text: "Assalomu alaykum! Jasur bugun darsda juda faol ishtirok etdi.", time: "12:30" },
      { from: "them", text: "Juda yaxshi! Uy vazifasini ham bajaribdi.", time: "12:36" },
      { from: "me", text: "Ajoyib. Matematikadan BSB dushanba kuni, tayyorlansin.", time: "12:38" },
      { from: "them", text: "Rahmat! Jasurga ko'rsataman.", time: "12:40" },
    ],
  },
  {
    id: "th2",
    withName: "Esonova Rustam",
    withRole: "Ota-ona (Malika, 10-A)",
    lastMessage: "Ertaga kelib gaplasharmiz.",
    lastTime: "11:05",
    unread: 2,
    messages: [
      { from: "me", text: "Assalomu alaykum! Malika bugun darsga kelmadi. Sababini bilib qo'ysangiz.", time: "10:50" },
      { from: "them", text: "Salom. Uning sog'lig'ida muammo bor edi, hujjat beramiz.", time: "11:03" },
      { from: "them", text: "Ertaga kelib gaplasharmiz.", time: "11:05" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Yordamchi funksiyalar
// ---------------------------------------------------------------------------
export const subjectById = (id: string): Subject =>
  SUBJECTS.find((x) => x.id === id) ?? { id, name: id, short: id.toUpperCase(), color: "bg-slate-500" };

export const teacherById = (id: string): Teacher | undefined =>
  TEACHERS.find((x) => x.id === id);

export const classById = (id: string): ClassInfo | undefined =>
  CLASSES.find((x) => x.id === id);

export const studentById = (id: string): Student | undefined =>
  STUDENTS.find((x) => x.id === id);

export const studentsOfClass = (classId: string): Student[] =>
  STUDENTS.filter((x) => x.classId === classId);

export const classOfStudent = (studentId: string): ClassInfo | undefined =>
  classById(studentById(studentId)?.classId ?? "");

export function gradesOfStudent(studentId: string): GradeRecord[] {
  return GRADES.filter((g) => g.studentId === studentId);
}

export function avgGradeOfStudent(studentId: string, subjectId?: string): number {
  const list = gradesOfStudent(studentId).filter(
    (g) => g.type === "FORMATIV" && (!subjectId || g.subjectId === subjectId),
  );
  if (list.length === 0) return 0;
  return Math.round((list.reduce((a, g) => a + g.value, 0) / list.length) * 10) / 10;
}

export function attendanceRateOfStudent(studentId: string): number {
  // Demo: bazadagi holatdan hisoblanadi (realda attendance jadvalidan)
  if (studentId === "s02") return 82;
  if (studentId === "s07") return 91;
  const seed = studentId.charCodeAt(1) ?? 0;
  return 93 + (seed % 7); // 93..99
}

export const directorStats = {
  students: STUDENTS.length,
  teachers: TEACHERS.length,
  classes: CLASSES.length,
  attendanceToday: 94, // %
  openRisks: RISK_EVENTS.filter((r) => r.status === "OPEN").length,
};
