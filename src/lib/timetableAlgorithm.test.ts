import assert from "node:assert/strict";
import test from "node:test";
import { generateTimetableDetailed } from "./timetableAlgorithm";

function teacherHasConflict(rows: ReturnType<typeof generateTimetableDetailed>["lessons"]) {
  const seen = new Set<string>();
  for (const row of rows) {
    const key = `${row.teacher_id}:${row.day_of_week}:${row.lesson_number}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

test("places split groups into the same lesson period without a teacher conflict", () => {
  const result = generateTimetableDetailed([
    { className: "9-A", subject: "Ingliz tili", teacherId: "T-1", hoursPerWeek: 2, groupType: "1-guruh" },
    { className: "9-A", subject: "Ingliz tili", teacherId: "T-2", hoursPerWeek: 2, groupType: "2-guruh" },
  ]);

  assert.equal(result.errors.length, 0);
  assert.equal(result.unplaced.length, 0);
  assert.equal(result.lessons.length, 4);
  const periods = new Set(result.lessons.map((row) => `${row.day_of_week}:${row.lesson_number}`));
  assert.equal(periods.size, 2);
  assert.equal(teacherHasConflict(result.lessons), false);
});

test("reserves Monday first period for Kelajak soati and keeps class days contiguous", () => {
  const result = generateTimetableDetailed([
    { className: "9-A", subject: "Kelajak soati", teacherId: "T-1", hoursPerWeek: 1 },
    { className: "9-A", subject: "Matematika", teacherId: "T-2", hoursPerWeek: 4 },
  ]);

  assert.equal(result.unplaced.length, 0);
  assert.ok(result.lessons.some((row) => row.day_of_week === "Du" && row.lesson_number === 1 && row.subject === "Kelajak soati"));
  assert.ok(result.lessons.some((row) => row.day_of_week === "Du" && row.lesson_number === 2 && row.subject === "Matematika"));
  for (const day of ["Du", "Se", "Ch", "Pa", "Ju", "Sh"]) {
    const periods = [...new Set(result.lessons.filter((row) => row.day_of_week === day).map((row) => row.lesson_number))].sort((a, b) => a - b);
    if (periods.length < 2) continue;
    for (let index = 1; index < periods.length; index += 1) {
      assert.equal(periods[index] - periods[index - 1], 1);
    }
  }
});

test("reports lessons it cannot place instead of silently dropping workload", () => {
  const result = generateTimetableDetailed([
    { className: "9-A", subject: "Algebra", teacherId: "T-1", hoursPerWeek: 6 },
    { className: "9-B", subject: "Fizika", teacherId: "T-1", hoursPerWeek: 6 },
  ]);

  assert.ok(result.unplaced.length > 0);
  assert.equal(teacherHasConflict(result.lessons), false);
});

test("rejects invalid and overlapping whole-class/split requests", () => {
  const result = generateTimetableDetailed([
    { className: "9-A", subject: "Biologiya", teacherId: "T-1", hoursPerWeek: 0 },
    { className: "9-A", subject: "Kimyo", teacherId: "T-2", hoursPerWeek: 1, groupType: "Barchasi" },
    { className: "9-A", subject: "Kimyo", teacherId: "T-3", hoursPerWeek: 1, groupType: "1-guruh" },
  ]);

  assert.ok(result.errors.length >= 2);
  assert.equal(result.lessons.some((row) => row.subject === "Biologiya"), false);
});
