import Link from "next/link";
import { ArrowRight, BookOpenCheck, CalendarDays } from "lucide-react";
import type { Homework } from "@/types";
import { formatDateUz } from "@/lib/utils";

export default function RecentActivity({ items = [] }: { items?: Homework[] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">Ta'lim</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">So'nggi uy vazifalari</h2>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><BookOpenCheck className="h-5 w-5" /></span>
      </div>
      {items.length ? (
        <ul className="mt-5 divide-y divide-slate-100">
          {items.slice(0, 3).map((item) => (
            <li key={item.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900">{item.subject}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.topic || item.description || "Vazifa tafsilotlari kiritilmagan."}</p>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-slate-400"><CalendarDays className="h-3.5 w-3.5" />{formatDateUz(item.date)}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Hozircha uy vazifalari yo'q.</div>
      )}
      <Link href="/student/education" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700">
        Barcha vazifalar <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
