import {
  APPOINTMENT_WORKING_DAYS,
  CALENDAR_MONTH_INDEX_OFFSET,
  DATE_PART_PAD_LENGTH,
  DAYS_TO_ADVANCE_FOR_NEXT_APPOINTMENT,
} from "@/app/constants";

const argentinaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getArgentinaDateKey(date: Date) {
  const parts = argentinaDateFormatter.formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export function getNextAppointmentDate(
  today: string,
  workingDays: number[] = APPOINTMENT_WORKING_DAYS,
) {
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(
    Date.UTC(
      year,
      month - CALENDAR_MONTH_INDEX_OFFSET,
      day + DAYS_TO_ADVANCE_FOR_NEXT_APPOINTMENT,
    ),
  );

  while (!workingDays.includes(date.getUTCDay())) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + CALENDAR_MONTH_INDEX_OFFSET).padStart(
      DATE_PART_PAD_LENGTH,
      "0",
    ),
    String(date.getUTCDate()).padStart(DATE_PART_PAD_LENGTH, "0"),
  ].join("-");
}
