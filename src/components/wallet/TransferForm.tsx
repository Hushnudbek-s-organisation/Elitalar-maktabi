"use client";

import type { FormEvent } from "react";
import { ArrowRight, AlertCircle, CheckCircle2, Send } from "lucide-react";
import { formatPP } from "@/lib/utils";

interface TransferFormProps {
  recipientId: string;
  amount: string;
  balance: number;
  error?: string;
  success?: string;
  disabled?: boolean;
  onRecipientChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function TransferForm({
  recipientId,
  amount,
  balance,
  error,
  success,
  disabled,
  onRecipientChange,
  onAmountChange,
  onSubmit,
}: TransferFormProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Send className="h-5 w-5" /></span>
        <div><h2 className="text-xl font-black text-slate-950">PP o'tkazish</h2><p className="text-sm text-slate-500">Joriy balans: {formatPP(balance)} PP</p></div>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="recipient-id" className="mb-2 block text-sm font-bold text-slate-700">Qabul qiluvchi ID raqami</label>
          <input id="recipient-id" value={recipientId} onChange={(event) => onRecipientChange(event.target.value.toUpperCase())} placeholder="Masalan: S-8393" required maxLength={40} autoComplete="off" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-mono font-bold uppercase outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
        </div>
        <div>
          <label htmlFor="transfer-amount" className="mb-2 block text-sm font-bold text-slate-700">Miqdor (PP)</label>
          <input id="transfer-amount" type="number" inputMode="numeric" min="1" step="1" max={balance} value={amount} onChange={(event) => onAmountChange(event.target.value)} placeholder="0" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-mono font-bold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
        </div>
        {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
        {success && <p role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{success}</p>}
        <button type="submit" disabled={disabled} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 font-black text-white shadow-lg shadow-blue-600/15 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
          Davom etish <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}
