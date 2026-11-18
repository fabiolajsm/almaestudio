import {
  CALENDAR_MONTH_INDEX_OFFSET,
  MINUTES_PER_HOUR,
  defaultAppointmentSettings,
  SERVICE_DURATION_MINUTES,
} from "@/app/constants";
import type { AppointmentSettings } from "@/app/types";
import { isValidTimeString } from "@/app/validations";

export {
  appointmentBufferMinutes,
  defaultAppointmentSettings,
} from "@/app/constants";
export type {
  AppointmentDailySchedule,
  AppointmentDaySchedule,
  AppointmentLocationSettings,
  AppointmentService,
  AppointmentServiceCategory,
  AppointmentServiceCategoryDefinition,
  AppointmentSettings,
  AppointmentSocialSettings,
  ExtendedAppointmentSettings,
} from "@/app/types";

export function isAppointmentWorkingDay(
  dateKey: string,
  settings: AppointmentSettings = defaultAppointmentSettings,
) {
  return getAppointmentScheduleForDate(dateKey, settings) !== null;
}

export function getAppointmentScheduleForDate(
  dateKey: string,
  settings: AppointmentSettings = defaultAppointmentSettings,
) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const weekday = new Date(
    Date.UTC(year, month - CALENDAR_MONTH_INDEX_OFFSET, day),
  ).getUTCDay();
  const dailySchedule = settings.dailySchedule?.[weekday];

  if (dailySchedule) {
    return dailySchedule.enabled
      ? {
          openingTime: dailySchedule.openingTime,
          closingTime: dailySchedule.closingTime,
        }
      : null;
  }

  return settings.workingDays.includes(weekday)
    ? {
        openingTime: settings.openingTime,
        closingTime: settings.closingTime,
      }
    : null;
}

export function isAppointmentTimeWithinBusinessHours(
  time: string,
  durationMinutes: number,
  settings: AppointmentSettings = defaultAppointmentSettings,
  dateKey?: string,
) {
  if (
    !isValidTimeString(time) ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes < SERVICE_DURATION_MINUTES.min
  ) {
    return false;
  }

  const [hour, minute] = time.split(":").map(Number);
  const start = hour * MINUTES_PER_HOUR + minute;
  const schedule = dateKey
    ? getAppointmentScheduleForDate(dateKey, settings)
    : {
        openingTime: settings.openingTime,
        closingTime: settings.closingTime,
      };

  if (!schedule) return false;
  return (
    start >= schedule.openingTime &&
    start + durationMinutes <= schedule.closingTime
  );
}
