import {
  defaultAppointmentSettings,
} from "@/app/Appoinments/appointmentCatalog";
import {
  ADDRESS_MAX_LENGTH,
  APPOINTMENT_ID_MAX_LENGTH,
  CATEGORY_ID_MAX_LENGTH,
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_NOTE_MAX_LENGTH,
  MAX_APPOINTMENT_CATEGORIES,
  MAX_APPOINTMENT_SERVICES,
  MAPS_URL_MAX_LENGTH,
  MIN_APPOINTMENT_CATEGORIES,
  MIN_APPOINTMENT_SERVICES,
  MAX_SCHEDULE_MINUTES,
  MIN_SCHEDULE_MINUTES,
  SCHEDULE_MINUTE_INCREMENT,
  SERVICE_DESCRIPTION_MAX_LENGTH,
  SERVICE_DURATION_MINUTES,
  SERVICE_NAME_MAX_LENGTH,
  SERVICE_PRICE,
  SOCIAL_VALUE_MAX_LENGTH,
  WEEKDAY_KEY_PATTERN,
  WEEKDAY_MAX,
  WEEKDAY_MIN,
} from "@/app/constants";
import type {
  AppointmentService,
  AppointmentServiceCategoryDefinition,
  ExtendedAppointmentSettings,
} from "@/app/types";
import {
  isValidAppointmentId,
  isValidMapsUrl,
  isValidScheduleMinutes,
  validateAdminSettings,
} from "@/app/validations";
import {
  getAppointmentSettingsRecord,
  saveAppointmentSettingsRecord,
} from "@/lib/supabaseAdmin";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseSocialSettings(value: unknown) {
  if (value === undefined) {
    return { instagram: "", whatsapp: "", tiktok: "" };
  }
  if (!isRecord(value)) return null;

  const social: Record<string, string> = {};
  for (const field of ["instagram", "whatsapp", "tiktok"] as const) {
    const entry = value[field] ?? "";
    if (
      typeof entry !== "string" ||
      entry.length > SOCIAL_VALUE_MAX_LENGTH
    ) {
      return null;
    }
    social[field] = entry.trim();
  }
  return social;
}

function parseLocationSettings(value: unknown) {
  if (value === undefined) {
    return { addressText: "", mapsUrl: "" };
  }
  if (!isRecord(value)) return null;

  const addressText = value.addressText ?? "";
  const mapsUrl = value.mapsUrl ?? "";
  if (
    typeof addressText !== "string" ||
    addressText.length > ADDRESS_MAX_LENGTH ||
    (addressText.length > 0 && !addressText.trim()) ||
    typeof mapsUrl !== "string" ||
    mapsUrl.length > MAPS_URL_MAX_LENGTH
  ) {
    return null;
  }

  const trimmedMapsUrl = mapsUrl.trim();
  if (trimmedMapsUrl && !isValidMapsUrl(trimmedMapsUrl)) {
    return null;
  }

  return { addressText: addressText.trim(), mapsUrl: trimmedMapsUrl };
}

export function parseAppointmentSettings(
  value: unknown,
): ExtendedAppointmentSettings | null {
  if (!isRecord(value)) {
    return null;
  }

  const candidate = value;
  if (
    !Array.isArray(candidate.categories) ||
    !Array.isArray(candidate.services) ||
    !Array.isArray(candidate.workingDays) ||
    typeof candidate.openingTime !== "number" ||
    typeof candidate.closingTime !== "number"
  ) {
    return null;
  }

  const categories: AppointmentServiceCategoryDefinition[] = [];
  for (const categoryValue of candidate.categories) {
    if (
      !categoryValue ||
      typeof categoryValue !== "object" ||
      Array.isArray(categoryValue)
    ) {
      return null;
    }

    const category = categoryValue as Record<string, unknown>;
    if (
      typeof category.id !== "string" ||
      category.id.length > CATEGORY_ID_MAX_LENGTH ||
      !isValidAppointmentId(category.id) ||
      typeof category.name !== "string" ||
      category.name.trim().length === 0 ||
      category.name.length > CATEGORY_NAME_MAX_LENGTH ||
      (category.note !== undefined &&
        (typeof category.note !== "string" ||
          category.note.length > CATEGORY_NOTE_MAX_LENGTH))
    ) {
      return null;
    }

    categories.push({
      id: category.id,
      name: category.name.trim(),
      ...(typeof category.note === "string"
        ? { note: category.note.trim() }
        : {}),
    });
  }

  if (
    categories.length < MIN_APPOINTMENT_CATEGORIES ||
    categories.length > MAX_APPOINTMENT_CATEGORIES ||
    new Set(categories.map((category) => category.id)).size !==
      categories.length ||
    new Set(
      categories.map((category) => category.name.trim().toLocaleLowerCase()),
    ).size !== categories.length
  ) {
    return null;
  }

  const categoryIds = new Set(categories.map((category) => category.id));
  const services: AppointmentService[] = [];
  for (const serviceValue of candidate.services) {
    if (!isRecord(serviceValue)) {
      return null;
    }

    const service = serviceValue;
    if (
      typeof service.id !== "string" ||
      service.id.length > APPOINTMENT_ID_MAX_LENGTH ||
      !isValidAppointmentId(service.id) ||
      typeof service.category !== "string" ||
      !categoryIds.has(service.category) ||
      typeof service.name !== "string" ||
      service.name.trim().length === 0 ||
      service.name.length > SERVICE_NAME_MAX_LENGTH ||
      (service.description !== undefined &&
        (typeof service.description !== "string" ||
          service.description.length > SERVICE_DESCRIPTION_MAX_LENGTH)) ||
      typeof service.duration !== "number" ||
      !Number.isInteger(service.duration) ||
      service.duration < SERVICE_DURATION_MINUTES.min ||
      service.duration > SERVICE_DURATION_MINUTES.max ||
      service.duration % SERVICE_DURATION_MINUTES.step !== 0 ||
      typeof service.price !== "number" ||
      !Number.isSafeInteger(service.price) ||
      service.price < SERVICE_PRICE.min ||
      service.price > SERVICE_PRICE.max
    ) {
      return null;
    }

    services.push({
      id: service.id,
      name: service.name.trim(),
      ...(typeof service.description === "string"
        ? { description: service.description.trim() }
        : {}),
      category: service.category,
      duration: service.duration,
      price: service.price,
    });
  }

  if (
    services.length < MIN_APPOINTMENT_SERVICES ||
    services.length > MAX_APPOINTMENT_SERVICES ||
    new Set(services.map((service) => service.id)).size !==
      services.length
  ) {
    return null;
  }

  const { openingTime, closingTime } = candidate;
  if (
    !Number.isInteger(openingTime) ||
    !Number.isInteger(closingTime) ||
    openingTime < MIN_SCHEDULE_MINUTES ||
    closingTime > MAX_SCHEDULE_MINUTES ||
    openingTime >= closingTime ||
    openingTime % SCHEDULE_MINUTE_INCREMENT !== 0 ||
    closingTime % SCHEDULE_MINUTE_INCREMENT !== 0
  ) {
    return null;
  }

  const workingDays = candidate.workingDays;
  if (
    workingDays.length === 0 ||
    workingDays.some(
      (day) =>
        typeof day !== "number" ||
        !Number.isInteger(day) ||
        day < WEEKDAY_MIN ||
        day > WEEKDAY_MAX,
    ) ||
    new Set(workingDays).size !== workingDays.length
  ) {
    return null;
  }

  let dailySchedule: ExtendedAppointmentSettings["dailySchedule"];
  if (
    candidate.dailySchedule === undefined ||
    (isRecord(candidate.dailySchedule) &&
      Object.keys(candidate.dailySchedule).length === 0)
  ) {
    const enabledDays = new Set(workingDays);
    dailySchedule = Object.fromEntries(
      Array.from(
        { length: WEEKDAY_MAX - WEEKDAY_MIN + 1 },
        (_, index) => {
          const day = index + WEEKDAY_MIN;
          return [
            day,
            { enabled: enabledDays.has(day), openingTime, closingTime },
          ];
        },
      ),
    );
  } else {
    if (!isRecord(candidate.dailySchedule)) return null;
    const keys = Object.keys(candidate.dailySchedule);
    if (
      keys.length !== WEEKDAY_MAX - WEEKDAY_MIN + 1 ||
      keys.some((key) => !WEEKDAY_KEY_PATTERN.test(key))
    ) {
      return null;
    }

    dailySchedule = {};
    for (let day = WEEKDAY_MIN; day <= WEEKDAY_MAX; day += 1) {
      const schedule = candidate.dailySchedule[String(day)];
      if (
        !isRecord(schedule) ||
        typeof schedule.enabled !== "boolean" ||
        !isValidScheduleMinutes(schedule.openingTime) ||
        !isValidScheduleMinutes(schedule.closingTime) ||
        schedule.openingTime >= schedule.closingTime
      ) {
        return null;
      }
      dailySchedule[day] = {
        enabled: schedule.enabled,
        openingTime: schedule.openingTime,
        closingTime: schedule.closingTime,
      };
    }
  }

  const scheduleWorkingDays = Object.entries(dailySchedule)
    .filter(([, schedule]) => schedule.enabled)
    .map(([day]) => Number(day))
    .sort((a, b) => a - b);
  if (
    scheduleWorkingDays.length === 0 ||
    scheduleWorkingDays.join(",") !==
      [...workingDays].sort((a, b) => a - b).join(",")
  ) {
    return null;
  }

  const social = parseSocialSettings(candidate.social);
  const location = parseLocationSettings(candidate.location);
  if (!social || !location) return null;

  const settings: ExtendedAppointmentSettings = {
    categories,
    services,
    openingTime: Math.min(
      ...scheduleWorkingDays.map((day) => dailySchedule[day].openingTime),
    ),
    closingTime: Math.max(
      ...scheduleWorkingDays.map((day) => dailySchedule[day].closingTime),
    ),
    workingDays: scheduleWorkingDays,
    dailySchedule,
    social,
    location,
  };

  return validateAdminSettings(settings) ? null : settings;
}

export async function getAppointmentSettings(): Promise<ExtendedAppointmentSettings> {
  const storedSettings = await getAppointmentSettingsRecord();
  if (storedSettings === null) {
    return defaultAppointmentSettings;
  }

  const settings = parseAppointmentSettings(storedSettings);
  if (!settings) {
    throw new Error("La configuración de turnos guardada no es válida.");
  }

  return settings;
}

export async function saveAppointmentSettings(value: unknown) {
  const settings = parseAppointmentSettings(value);
  if (!settings) {
    return null;
  }

  await saveAppointmentSettingsRecord(settings);
  return settings;
}
