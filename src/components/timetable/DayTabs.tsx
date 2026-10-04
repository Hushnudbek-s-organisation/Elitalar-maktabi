"use client";

import { WEEKDAYS, WEEKDAY_LABELS, type WeekdayCode } from "@/lib/utils";

export default function DayTabs({ activeDay, onChange }: { activeDay: WeekdayCode; onChange: (day: WeekdayCode) => void }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm hide-scrollbar">
      <div role="tablist" aria-label="Hafta kunlari" className="flex min-w-max gap-1">
        {WEEKDAYS.map((day) => {
          const active = activeDay === day;
          return (
            <button
              key={day}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(day)}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition sm:px-5 ${active ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
            >
              <span className="sm:hidden">{day}</span>
              <span className="hidden sm:inline">{WEEKDAY_LABELS[day]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
