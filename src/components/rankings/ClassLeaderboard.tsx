import { Medal, Trophy } from "lucide-react";

export interface RankedClass {
  name: string;
  total_cp?: number | null;
  homeroom_teacher?: string | null;
}

export default function ClassLeaderboard({ classes, currentClass }: { classes: RankedClass[]; currentClass?: string | null }) {
  if (!classes.length) {
    return <div className="rounded-2xl bg-slate-50 px-5 py-12 text-center text-sm font-medium text-slate-500">Hozircha reyting ma'lumotlari yo'q.</div>;
  }

  return (
    <ol className="space-y-3">
      {classes.map((item, index) => {
        const isCurrent = item.name === currentClass;
        const isFirst = index === 0;
        return (
          <li key={item.name} className={`flex items-center gap-4 rounded-2xl border p-4 transition ${isCurrent ? "border-blue-200 bg-blue-50/70" : "border-slate-100 bg-white hover:border-slate-200"}`}>
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isFirst ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
              {isFirst ? <Trophy className="h-5 w-5" /> : index === 1 || index === 2 ? <Medal className="h-5 w-5" /> : <span className="font-black">{index + 1}</span>}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-black text-slate-900">{item.name}</p>
                {isCurrent && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-blue-700">Sizning sinfingiz</span>}
              </div>
              <p className="mt-1 truncate text-xs text-slate-500">{item.homeroom_teacher || "Sinf rahbari belgilanmagan"}</p>
            </div>
            <p className={`shrink-0 text-lg font-black ${isFirst ? "text-amber-600" : "text-slate-800"}`}>{(item.total_cp ?? 0).toLocaleString("uz-UZ")} <span className="text-xs font-bold text-slate-400">CP</span></p>
          </li>
        );
      })}
    </ol>
  );
}
