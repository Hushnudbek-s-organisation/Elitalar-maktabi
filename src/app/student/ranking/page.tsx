"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trophy } from "lucide-react";
import ClassLeaderboard, { type RankedClass } from "@/components/rankings/ClassLeaderboard";
import { getStoredSession } from "@/lib/session";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { formatPP } from "@/lib/utils";
import type { Profile } from "@/types";

export default function StudentRankingPage() {
  const router = useRouter();
  const [student, setStudent] = useState<Profile | null>(null);
  const [classes, setClasses] = useState<RankedClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getStoredSession();
    if (!session.id || session.role !== "student") {
      router.replace("/");
      return;
    }
    if (!isSupabaseConfigured) {
      setError("Platforma bazasi sozlanmagan.");
      setLoading(false);
      return;
    }

    let active = true;
    const load = async () => {
      const { data: profile, error: profileError } = await supabase.from("profiles").select("id, full_name, role, class_name, cp_score").eq("id", session.id).maybeSingle();
      if (!active) return;
      if (profileError || !profile || profile.role !== "student") {
        setError("Profilni yuklab bo'lmadi.");
        setLoading(false);
        return;
      }
      setStudent(profile as Profile);
      const grade = profile.class_name?.match(/^(\d+)/)?.[1];
      if (!grade) {
        setLoading(false);
        return;
      }
      const { data, error: classesError } = await supabase
        .from("classes")
        .select("name, total_cp, homeroom_teacher")
        .like("name", `${grade}-%`)
        .order("total_cp", { ascending: false });
      if (!active) return;
      if (classesError) setError("Sinf reytingini yuklab bo'lmadi.");
      else setClasses((data ?? []) as RankedClass[]);
      setLoading(false);
    };
    void load().catch((loadError) => {
      console.error(loadError);
      if (active) {
        setError("Reyting ma'lumotlarini yuklashda xatolik yuz berdi.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [router]);

  const currentRank = useMemo(() => classes.findIndex((item) => item.name === student?.class_name) + 1, [classes, student?.class_name]);
  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-blue-600" /></div>;
  if (error || !student) return <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center"><p className="font-bold text-slate-900">Reytingni ochib bo'lmadi</p><p className="mt-2 text-sm text-slate-500">{error || "Qayta kirib ko'ring."}</p></div>;

  const grade = student.class_name?.match(/^(\d+)/)?.[1] || "—";
  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 to-blue-600 p-6 text-white shadow-lg shadow-indigo-900/10 sm:p-8">
        <Trophy className="absolute -right-4 -top-4 h-44 w-44 opacity-10" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div><p className="inline-flex rounded-full bg-white/15 px-3 py-1.5 text-xs font-black uppercase tracking-wider">{grade}-sinflar o'rtasida</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">Sinf reytingi</h1><p className="mt-2 text-sm text-blue-100">Eng yuqori CP jamg'argan sinflar yetakchilik qiladi.</p></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3"><p className="text-xs font-semibold text-blue-100">Sinfingiz</p><p className="mt-1 text-xl font-black">{student.class_name || "—"}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3"><p className="text-xs font-semibold text-blue-100">O'rningiz</p><p className="mt-1 text-xl font-black">{currentRank > 0 ? `${currentRank}-o'rin` : "—"}</p></div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="text-xl font-black text-slate-950">{grade}-sinflar chempionati</h2><p className="mt-1 text-sm text-slate-500">Sinf bo'yicha jamlangan CP ballari</p></div><div className="rounded-2xl bg-amber-50 px-4 py-2 text-right"><p className="text-xs font-bold text-amber-700">Sizning balingiz</p><p className="font-black text-amber-950">{formatPP(student.cp_score)} CP</p></div></div>
        <ClassLeaderboard classes={classes} currentClass={student.class_name} />
      </section>
    </div>
  );
}
