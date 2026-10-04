import { ArrowDownLeft, ArrowUpRight, History } from "lucide-react";
import type { Transaction } from "@/types";
import { formatDateUz, formatPP } from "@/lib/utils";

export default function TransactionTable({ transactions, userId }: { transactions: Transaction[]; userId: string }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><History className="h-5 w-5" /></span>
        <div><h2 className="text-xl font-black text-slate-950">O'tkazmalar tarixi</h2><p className="text-sm text-slate-500">Oxirgi operatsiyalar</p></div>
      </div>
      <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {transactions.length ? transactions.map((item) => {
          const sent = item.sender_id === userId;
          return (
            <article key={item.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3.5 transition hover:bg-slate-50 sm:gap-4">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${sent ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                {sent ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800">{sent ? `Yuborildi · ${item.receiver_id}` : `Qabul qilindi · ${item.sender_id}`}</p>
                <p className="mt-1 text-xs text-slate-400">{formatDateUz(item.created_at)} · {new Date(item.created_at).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <p className={`shrink-0 text-sm font-black sm:text-base ${sent ? "text-slate-800" : "text-emerald-600"}`}>{sent ? "−" : "+"}{formatPP(item.amount)} <span className="text-xs">PP</span></p>
            </article>
          );
        }) : <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Hozircha tranzaksiyalar yo'q.</div>}
      </div>
    </section>
  );
}
