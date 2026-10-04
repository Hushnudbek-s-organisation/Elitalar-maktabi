export type UserRole = "student" | "teacher" | "director" | "admin" | "parent" | "seller";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  class_name?: string | null;
  homeroom?: string | null;
  bio?: string | null;
  pp_balance?: number | null;
  cp_score?: number | null;
  avatar_url?: string | null;
  username?: string | null;
  created_at?: string | null;
}

export interface TimetableLesson {
  id: string | number;
  class_name: string;
  day_of_week: string;
  lesson_number: number;
  subject: string;
  teacher_id?: string | null;
  group_type?: string | null;
  room?: string | null;
  term?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface Homework {
  id: string | number;
  class_name: string;
  subject: string;
  topic?: string | null;
  description?: string | null;
  deadline?: string | null;
  date?: string | null;
}

export interface Transaction {
  id: string | number;
  sender_id: string;
  receiver_id: string;
  amount: number;
  created_at: string;
}

export interface Notification {
  id: string | number;
  user_id: string;
  title: string;
  message: string;
  is_read?: boolean;
  created_at?: string;
}
