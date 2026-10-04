"use client";

import { useEffect, useRef } from "react";
import { Loader2, ShieldCheck, X } from "lucide-react";
import { formatPP } from "@/lib/utils";

interface PinModalProps {
  open: boolean;
  amount: number;
  pin: string;
  error?: string;
  processing?: boolean;
  onPinChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export default function PinModal({ open, amount, pin, error, processing, onPinChange, onSubmit, onClose }: PinModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !processing) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="pin-modal-title" className="w-full max-w-sm rounded-3xl border border-white/60 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><ShieldCheck className="h-6 w-6" /></span>
          <button type="button" aria-label="Yopish" disabled={processing} onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"><X className="h-5 w-5" /></button>
        </div>
        <h2 id="pin-modal-title" className="text-xl font-black text-slate-950">O'tkazmani tasdiqlang</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500"><strong className="text-slate-800">{formatPP(amount)} PP</strong> o'tkazish uchun parolingizni kiriting.</p>
        <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }} className="mt-5 space-y-4">
          <label className="sr-only" htmlFor="transfer-pin">Parol</label>
          <input ref={inputRef} id="transfer-pin" type="password" autoComplete="current-password" value={pin} onChange={(event) => onPinChange(event.target.value)} required placeholder="Parol" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-center text-lg font-bold tracking-widest outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
          {error && <p role="alert" className="text-sm font-semibold text-rose-600">{error}</p>}
          <button type="submit" disabled={!pin || processing} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Tekshirilmoqda...</> : "Tasdiqlash"}
          </button>
        </form>
      </section>
    </div>
  );
}
