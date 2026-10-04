import { normalizeDayOfWeek, WEEKDAYS } from "@/lib/utils";

export type LessonRequest = {
  className: string;
  subject: string;
  teacherId: string;
  hoursPerWeek: number;
  groupType?: string;
};

export type ScheduledLesson = {
  class_name: string;
  day_of_week: string;
  lesson_number: number;
  subject: string;
  teacher_id: string;
  group_type: string;
  room: string;
};

export type UnplacedLesson = {
  className: string;
  subject: string;
  groupTypes: string[];
  requestedHours: number;
  placedHours: number;
  reason: string;
};

export type TimetableResult = {
  lessons: ScheduledLesson[];
  unplaced: UnplacedLesson[];
  errors: string[];
};

type LessonPart = { teacherId: string; groupType: string };
type LessonBlock = {
  className: string;
  subject: string;
  hours: number;
  parts: LessonPart[];
  placed: number;
};

const PERIODS = [1, 2, 3, 4, 5, 6] as const;
const FUTURE_LESSON = "kelajak soati";
const DEFAULT_GROUP = "Barchasi";

const slotKey = (day: string, period: number) => `${day}:${period}`;

function normalizeGroupType(value?: string): string {
  return value?.trim() || DEFAULT_GROUP;
}

function isMath(subject: string): boolean {
  const normalized = subject.toLocaleLowerCase("uz-UZ");
  return normalized.includes("algebra") || normalized.includes("geometriya");
}

function subjectIsFuture(subject: string): boolean {
  return subject.trim().toLocaleLowerCase("uz-UZ") === FUTURE_LESSON;
}

function getTeacherPeriods(day: string, teacherId: string, lessons: ScheduledLesson[]): number[] {
  return lessons
    .filter((lesson) => lesson.day_of_week === day && lesson.teacher_id === teacherId)
    .map((lesson) => lesson.lesson_number)
    .sort((a, b) => a - b);
}

function teacherCanTakeSlot(
  day: string,
  period: number,
  teacherId: string,
  lessons: ScheduledLesson[],
): boolean {
  const current = getTeacherPeriods(day, teacherId, lessons);
  if (current.includes(period) || current.length >= 6) return false;
  const proposed = [...current, period].sort((a, b) => a - b);
  for (let index = 0; index < proposed.length - 1; index += 1) {
    const gap = proposed[index + 1] - proposed[index] - 1;
    if (gap > 2) return false;
  }
  return true;
}

function hasClassSlot(className: string, day: string, period: number, lessons: ScheduledLesson[]): boolean {
  return lessons.some(
    (lesson) => lesson.class_name === className && lesson.day_of_week === day && lesson.lesson_number === period,
  );
}

function nextClassPeriod(className: string, day: string, lessons: ScheduledLesson[]): number {
  let period = 1;
  while (period <= PERIODS.length && hasClassSlot(className, day, period, lessons)) period += 1;
  // Monday's first lesson is reserved for Kelajak soati in the school's timetable rules.
  if (day === "Du" && period === 1) return 2;
  return period;
}

function subjectCountForDay(className: string, day: string, subject: string, lessons: ScheduledLesson[]): number {
  return new Set(
    lessons
      .filter((lesson) => lesson.class_name === className && lesson.day_of_week === day && lesson.subject === subject)
      .map((lesson) => lesson.lesson_number),
  ).size;
}

function classDayLoad(className: string, day: string, lessons: ScheduledLesson[]): number {
  return new Set(
    lessons
      .filter((lesson) => lesson.class_name === className && lesson.day_of_week === day)
      .map((lesson) => lesson.lesson_number),
  ).size;
}

function teacherIsAvailableForBlock(day: string, period: number, block: LessonBlock, lessons: ScheduledLesson[]): boolean {
  const teacherIds = block.parts.map((part) => part.teacherId);
  if (new Set(teacherIds).size !== teacherIds.length) return false;
  return teacherIds.every((teacherId) => teacherCanTakeSlot(day, period, teacherId, lessons));
}

function canPlaceBlock(day: string, period: number, block: LessonBlock, lessons: ScheduledLesson[]): boolean {
  if (period < 1 || period > PERIODS.length) return false;
  if (hasClassSlot(block.className, day, period, lessons)) return false;
  if (!teacherIsAvailableForBlock(day, period, block, lessons)) return false;

  const count = subjectCountForDay(block.className, day, block.subject, lessons);
  const limit = isMath(block.subject) ? 1 : 2;
  if (count >= limit) return false;
  // The second weekly occurrence of a non-math subject on a day must be consecutive.
  if (count === 1) {
    const previous = lessons.some(
      (lesson) =>
        lesson.class_name === block.className &&
        lesson.day_of_week === day &&
        lesson.lesson_number === period - 1 &&
        lesson.subject === block.subject,
    );
    if (!previous) return false;
  }
  return true;
}

function placeBlock(day: string, period: number, block: LessonBlock, lessons: ScheduledLesson[]) {
  for (const part of block.parts) {
    lessons.push({
      class_name: block.className,
      day_of_week: day,
      lesson_number: period,
      subject: block.subject,
      teacher_id: part.teacherId,
      group_type: part.groupType,
      room: "Belgilanmagan",
    });
  }
  block.placed += 1;
}

function buildBlocks(requests: LessonRequest[], errors: string[]): LessonBlock[] {
  const grouped = new Map<string, LessonBlock>();
  const duplicateParts = new Map<string, Set<string>>();

  for (const request of requests) {
    const className = request.className?.trim();
    const subject = request.subject?.trim();
    const teacherId = request.teacherId?.trim();
    const hours = Number(request.hoursPerWeek);
    const groupType = normalizeGroupType(request.groupType);

    if (!className || !subject || !teacherId) {
      errors.push("Sinf, fan va o'qituvchi ma'lumotlari to'liq bo'lishi kerak.");
      continue;
    }
    if (!Number.isInteger(hours) || hours < 1 || hours > PERIODS.length) {
      errors.push(`${className} — ${subject}: haftalik soat 1 dan 6 gacha butun son bo'lishi kerak.`);
      continue;
    }

    // Equal weekly hours for split groups make one shared class period with one row per group.
    const key = `${className}\u0000${subject}\u0000${hours}`;
    const block = grouped.get(key) ?? { className, subject, hours, parts: [], placed: 0 };
    const partKey = `${groupType}\u0000${teacherId}`;
    const seen = duplicateParts.get(key) ?? new Set<string>();
    if (seen.has(partKey)) {
      errors.push(`${className} — ${subject}: ${groupType} guruhi yuklamada takrorlangan.`);
      continue;
    }
    seen.add(partKey);
    duplicateParts.set(key, seen);
    block.parts.push({ teacherId, groupType });
    grouped.set(key, block);
  }

  for (const block of grouped.values()) {
    const groups = block.parts.map((part) => part.groupType);
    if (groups.includes(DEFAULT_GROUP) && groups.length > 1) {
      errors.push(`${block.className} — ${block.subject}: "Barchasi" yuklamasini alohida guruhlar bilan birlashtirib bo'lmaydi.`);
    }
    if (new Set(groups).size !== groups.length) {
      errors.push(`${block.className} — ${block.subject}: guruhlar bir xil vaqtda dars o'tishi uchun alohida guruh turlari kerak.`);
    }
  }

  return [...grouped.values()];
}

/** Builds a schedule and reports any lesson hours that could not be placed. */
export function generateTimetableDetailed(requests: LessonRequest[]): TimetableResult {
  const errors: string[] = [];
  const blocks = buildBlocks(requests, errors);
  const lessons: ScheduledLesson[] = [];
  const futureBlocks = blocks.filter((block) => subjectIsFuture(block.subject));
  const normalBlocks = blocks.filter((block) => !subjectIsFuture(block.subject));
  const unplaced: UnplacedLesson[] = [];

  for (const block of futureBlocks) {
    if (block.hours !== 1) {
      errors.push(`${block.className} — Kelajak soati haftasiga faqat 1 soat bo'lishi kerak.`);
    }
    if (canPlaceBlock("Du", 1, block, lessons)) placeBlock("Du", 1, block, lessons);
    if (block.placed < block.hours) {
      unplaced.push({
        className: block.className,
        subject: block.subject,
        groupTypes: block.parts.map((part) => part.groupType),
        requestedHours: block.hours,
        placedHours: block.placed,
        reason: "Dushanba 1-soatda Kelajak soati uchun joy yoki o'qituvchi topilmadi.",
      });
    }
  }

  normalBlocks.sort((a, b) => b.parts.length - a.parts.length || b.hours - a.hours || a.className.localeCompare(b.className));

  for (const block of normalBlocks) {
    for (let occurrence = 0; occurrence < block.hours; occurrence += 1) {
      const days = [...WEEKDAYS].sort((dayA, dayB) => {
        const subjectA = subjectCountForDay(block.className, dayA, block.subject, lessons);
        const subjectB = subjectCountForDay(block.className, dayB, block.subject, lessons);
        if (subjectA !== subjectB) return subjectA - subjectB;
        const futureReservedA = dayA === "Du" && lessons.some((lesson) =>
          lesson.class_name === block.className && lesson.day_of_week === "Du" && lesson.lesson_number === 1 && subjectIsFuture(lesson.subject),
        );
        const futureReservedB = dayB === "Du" && lessons.some((lesson) =>
          lesson.class_name === block.className && lesson.day_of_week === "Du" && lesson.lesson_number === 1 && subjectIsFuture(lesson.subject),
        );
        if (futureReservedA !== futureReservedB) return futureReservedA ? -1 : 1;
        const loadA = classDayLoad(block.className, dayA, lessons);
        const loadB = classDayLoad(block.className, dayB, lessons);
        return loadA - loadB || WEEKDAYS.indexOf(dayA) - WEEKDAYS.indexOf(dayB);
      });

      let placed = false;
      for (const day of days) {
        const period = nextClassPeriod(block.className, day, lessons);
        if (!canPlaceBlock(day, period, block, lessons)) continue;
        placeBlock(day, period, block, lessons);
        placed = true;
        break;
      }
      if (!placed) {
        // Continue trying later occurrences: a busy teacher may only affect one slot/day.
        continue;
      }
    }

    if (block.placed < block.hours) {
      unplaced.push({
        className: block.className,
        subject: block.subject,
        groupTypes: block.parts.map((part) => part.groupType),
        requestedHours: block.hours,
        placedHours: block.placed,
        reason: "Sinf, o'qituvchi bandligi yoki dars oralig'i qoidalari sabab joy topilmadi.",
      });
    }
  }

  lessons.sort(
    (a, b) =>
      WEEKDAYS.indexOf(normalizeDayOfWeek(a.day_of_week) ?? "Du") - WEEKDAYS.indexOf(normalizeDayOfWeek(b.day_of_week) ?? "Du") ||
      a.lesson_number - b.lesson_number ||
      a.class_name.localeCompare(b.class_name) ||
      a.group_type.localeCompare(b.group_type),
  );

  return { lessons, unplaced, errors: [...new Set(errors)] };
}

/** Backwards-compatible convenience wrapper for consumers that only need the rows. */
export function generateTimetable(requests: LessonRequest[]): ScheduledLesson[] {
  return generateTimetableDetailed(requests).lessons;
}
