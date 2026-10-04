import Link from "next/link";
import { ArrowUpRight, Wallet } from "lucide-react";
import { formatPP } from "@/lib/utils";

export default function BalanceCard({ balance = 0, className }: { balance?: number | null; className?: string | null }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-6 text-white shadow-xl shadow-blue-950/10 sm:p-7">
      <div className="absolute -right-10 -top-12 h-44 w-44 rounded-full border-[24px] border-white/5" aria-hidden="true" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-blue-100"><Wallet className="h-4 w-4" /> Shaxsiy hamyon</p>
          <p className="mt-5 text-4xl font-black tracking-tight">{formatPP(balance)} <span className="text-lg font-bold text-blue-200">PP</span></p>
          <p className="mt-2 text-sm text-blue-100/80">{className || "Sinf biriktirilmagan"} sinfi</p>
        </div>
        <span className="rounded-2xl bg-white/10 p-3 backdrop-blur"><Wallet className="h-6 w-6" /></span>
      </div>
      <Link href="/student/wallet" className="relative mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-blue-950 transition hover:bg-blue-50">
        Hamyonni ochish <ArrowUpRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
