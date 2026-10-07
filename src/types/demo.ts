// ============================================================================
// SchoolOS Uzbekistan — domen tiplari (demo rejim; DB ulanganda Supabase
// jadvallari bilan bir xil shakl)
// ============================================================================

export type Role =
  | "DIRECTOR"
  | "ADMIN"
  | "CLASS_TEACHER"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";

export const ROLE_LABELS_UZ: Record<Role, string> = {
  DIRECTOR: "Direktor",
  ADMIN: "Administrator",
  CLASS_TEACHER: "Sinf rahbari",
  TEACHER: "O'qituvchi",
  PARENT: "Ota-ona",
  STUDENT: "O'quvchi",
};

export type AttendanceStatus =
  | "PRESENT"
  | "LATE"
  | "UNEXCUSED"
  | "EXCUSED"
  | "ABSENT";

export const ATTENDANCE_LABELS_UZ: Record<AttendanceStatus, string> = {
  PRESENT: "Keldi",
  LATE: "Kechikdi",
  UNEXCUSED: "Sababsiz",
  EXCUSED: "Sababli",
  ABSENT: "Kelmadi",
};

export type GradeType = "FORMATIV" | "BSB" | "CHSB";

export const GRADE_TYPE_LABELS_UZ: Record<GradeType, string> = {
  FORMATIV: "Kunlik",
  BSB: "BSB (bob bo'yicha)",
  CHSB: "CHSB (chorak bo'yicha)",
};

export interface Subject {
  id: string;
  name: string;
  short: string;
  color: string; // tailwind bg class
}

export interface Teacher {
  id: string;
  name: string;
  subjectIds: string[];
  phone: string;
}

export interface ClassInfo {
  id: string;
  name: string; // "10-A"
  grade: number;
  homeroomTeacherId: string;
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  gender: "M" | "F";
  admissionNumber: string;
}

export interface TimetableSlot {
  classId: string;
  day: number; // 1 = dushanba ... 5 = juma
  period: number; // 1..6
  subjectId: string;
  teacherId: string;
  room: string;
  group?: 1 | 2; // parallel guruh darsi (masalan, ingliz tili)
}

export interface LessonToday {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  period: number;
  topic: string;
  group?: 1 | 2;
}

export interface GradeRecord {
  studentId: string;
  subjectId: string;
  type: GradeType;
  value: number; // 1..10 (formativ), 1..100 (BSB/CHSB)
  date: string; // ISO
  status: "DRAFT" | "PUBLISHED";
}

export interface AttendanceRecord {
  studentId: string;
  date: string;
  status: AttendanceStatus;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;
  scope: "Maktab" | "Sinf";
  pinned: boolean;
  author: string;
}

export interface Homework {
  id: string;
  classId: string;
  subjectId: string;
  title: string;
  description: string;
  dueDate: string;
  createdBy: string;
}

export interface RiskEvent {
  id: string;
  studentId: string;
  severity: "HIGH" | "MEDIUM";
  reasons: string[];
  status: "OPEN" | "ACKNOWLEDGED";
}

export interface ChatThread {
  id: string;
  withName: string;
  withRole: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: { from: "me" | "them"; text: string; time: string }[];
}
