"use client";

import { Award, AlertCircle, Send, X } from "lucide-react";

export type PointsModalMode = "today" | "past" | "bsb" | "future";
export type AttendanceCode = "keldi" | "dq" | "k";

interface ManagePointsModalProps {
  studentName: string;
  dateLabel: string;
  mode: PointsModalMode;
  attendance: AttendanceCode;
  classwork: string;
  homework: string;
  pointsRequest: string;
  correctionCount: number;
  isSubmitting: boolean;
  onAttendanceChange: (value: AttendanceCode) => void;
  onClassworkChange: (value: string) => void;
  onHomeworkChange: (value: string) => void;
  onPointsRequestChange: (value: string) => void;
  onSaveGrade: () => void;
  onRequestPoints: () => void;
  onClose: () => void;
}

export default function ManagePointsModal({
  studentName,
  dateLabel,
  mode,
  attendance,
  classwork,
  homework,
  pointsRequest,
  correctionCount,
  isSubmitting,
  onAttendanceChange,
  onClassworkChange,
  onHomeworkChange,
  onPointsRequestChange,
  onSaveGrade,
  onRequestPoints,
  onClose,
}: ManagePointsModalProps) {
  const correctionCost = correctionCount === 0 ? 500 : correctionCount === 1 ? 700 : 1000;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="points-modal-title" className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-blue-100 bg-blue-50 p-6 sm:p-8">
          <div><h2 id="points-modal-title" className="text-xl font-black text-blue-950 sm:text-2xl">{studentName}</h2><p className="mt-1 text-xs font-bold uppercase tracking-widest text-blue-600">Sana: {dateLabel}</p></div>
          <button type="button" aria-label="Yopish" onClick={onClose} disabled={isSubmitting} className="rounded-full bg-white p-2 text-blue-400 hover:text-blue-700 disabled:opacity-50"><X className="h-5 w-5" /></button>
        </header>

        <div className="space-y-5 p-6 sm:p-8">
          {mode === "today" && (
            <>
              <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1.5">
                {(["keldi", "dq", "k"] as const).map((value) => {
                  const label = value === "keldi" ? "Keldi" : value === "dq" ? "Sababsiz" : "Kasal";
                  return <button key={value} type="button" onClick={() => onAttendanceChange(value)} className={`rounded-xl px-2 py-3 text-xs font-black transition ${attendance === value ? value === "dq" ? "bg-rose-500 text-white" : value === "k" ? "bg-amber-500 text-white" : "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>{label}</button>;
                })}
              </div>
              {attendance === "keldi" ? (
                <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-sm font-black text-slate-800">10 ballik baholash</p>
                  {[{ label: "Dars ishtiroki", value: classwork, update: onClassworkChange }, { label: "Uy vazifasi", value: homework, update: onHomeworkChange }].map((item) => (
                    <label key={item.label} className="flex items-center justify-between gap-4 text-sm font-semibold text-slate-600">
                      {item.label}
                      <input type="number" min="1" max="10" step="1" inputMode="numeric" value={item.value} onChange={(event) => item.update(event.target.value)} className="w-20 rounded-xl border border-slate-200 bg-white p-2.5 text-center text-lg font-black text-slate-900 outline-none focus:border-blue-500" />
                    </label>
                  ))}
                  <p className="text-xs text-slate-400">Bahoni 1 dan 10 gacha kiriting. Bir maydon bo'sh qolishi mumkin.</p>
                </div>
              ) : (
                <div className={`rounded-2xl border p-5 text-center ${attendance === "dq" ? "border-rose-100 bg-rose-50 text-rose-700" : "border-amber-100 bg-amber-50 text-amber-700"}`}>
                  <AlertCircle className="mx-auto mb-2 h-5 w-5" />
                  <p className="text-sm font-bold">{attendance === "dq" ? "Sababsiz qoldirilgan dars uchun −5 CP." : "Kasal bo'lgani uchun CP o'zgarmaydi."}</p>
                </div>
              )}
              <button type="button" onClick={onSaveGrade} disabled={isSubmitting} className="w-full rounded-xl bg-blue-600 py-3.5 font-black text-white shadow-lg transition hover:bg-blue-700 disabled:opacity-50">{isSubmitting ? "SAQLANMOQDA..." : "JURNALGA SAQLASH"}</button>
            </>
          )}

          {mode === "past" && (
            <>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
                <Award className="mx-auto mb-3 h-10 w-10 text-amber-500" />
                <h3 className="font-black text-amber-950">Eski bahoni to'g'rilash</h3>
                <p className="mt-2 text-sm text-amber-800">So'rov narxi: <strong>{correctionCost.toLocaleString("uz-UZ")} PP</strong></p>
              </div>
              <button type="button" onClick={onRequestPoints} disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 font-black text-white transition hover:bg-amber-600 disabled:opacity-50">{isSubmitting ? "YUBORILMOQDA..." : <><Send className="h-4 w-4" /> SO'ROV YUBORISH</>}</button>
            </>
          )}

          {mode === "bsb" && (
            <>
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-center">
                <Award className="mx-auto mb-3 h-10 w-10 text-indigo-500" />
                <h3 className="font-black text-indigo-950">BSB / CHSB uchun ball so'rovi</h3>
                <select value={pointsRequest} onChange={(event) => onPointsRequestChange(event.target.value)} className="mt-4 w-full rounded-xl border border-indigo-200 bg-white p-3 font-bold text-indigo-900 outline-none focus:border-indigo-500">
                  <option value="+1">+1 ball · 10 000 PP</option>
                  <option value="+2">+2 ball · 20 000 PP</option>
                </select>
              </div>
              <button type="button" onClick={onRequestPoints} disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 font-black text-white transition hover:bg-indigo-700 disabled:opacity-50">{isSubmitting ? "YUBORILMOQDA..." : <><Send className="h-4 w-4" /> PP SO'ROV YUBORISH</>}</button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
