import {
  defaultAppointmentSettings,
  type ExtendedAppointmentSettings,
  type AppointmentServiceCategoryDefinition,
  type AppointmentService,
} from "@/app/Appoinments/appointmentCatalog";
import {
  getAppointmentSettingsRecord,
  saveAppointmentSettingsRecord,
} from "@/lib/supabaseAdmin";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isValidScheduleTime(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < 24 * 60 &&
    value % 15 === 0
  );
}

function parseSocialSettings(value: unknown) {
  if (value === undefined) {
    return { instagram: "", whatsapp: "", tiktok: "" };
  }
  if (!isRecord(value)) return null;

  const social: Record<string, string> = {};
  for (const field of ["instagram", "whatsapp", "tiktok"] as const) {
    const entry = value[field] ?? "";
    if (typeof entry !== "string" || entry.length > 500) return null;
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
    addressText.length > 300 ||
    typeof mapsUrl !== "string" ||
    mapsUrl.length > 2000
  ) {
    return null;
  }

  const trimmedMapsUrl = mapsUrl.trim();
  if (trimmedMapsUrl) {
    try {
      const url = new URL(trimmedMapsUrl);
      if (
        url.protocol !== "https:" ||
        (url.hostname !== "google.com" &&
          !url.hostname.endsWith(".google.com"))
      ) {
        return null;
      }
    } catch {
      return null;
    }
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
      !/^[a-z0-9][a-z0-9-]{0,63}$/.test(category.id) ||
      typeof category.name !== "string" ||
      category.name.trim().length === 0 ||
      category.name.length > 60 ||
      (category.note !== undefined &&
        (typeof category.note !== "string" || category.note.length > 240))
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
    categories.length === 0 ||
    categories.length > 30 ||
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
      !/^[a-z0-9][a-z0-9-]{0,63}$/.test(service.id) ||
      typeof service.category !== "string" ||
      !categoryIds.has(service.category) ||
      typeof service.name !== "string" ||
      service.name.trim().length === 0 ||
      service.name.length > 100 ||
      (service.description !== undefined &&
        (typeof service.description !== "string" ||
          service.description.length > 240)) ||
      typeof service.duration !== "number" ||
      !Number.isInteger(service.duration) ||
      service.duration < 15 ||
      service.duration > 600 ||
      typeof service.price !== "number" ||
      !Number.isSafeInteger(service.price) ||
      service.price < 0 ||
      service.price > 10_000_000
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
    services.length === 0 ||
    services.length > 100 ||
    new Set(services.map((service) => service.id)).size !==
      services.length
  ) {
    return null;
  }

  const { openingTime, closingTime } = candidate;
  if (
    !Number.isInteger(openingTime) ||
    !Number.isInteger(closingTime) ||
    openingTime < 0 ||
    closingTime > 23 * 60 + 45 ||
    openingTime >= closingTime ||
    openingTime % 15 !== 0 ||
    closingTime % 15 !== 0
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
        day < 0 ||
        day > 6,
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
      Array.from({ length: 7 }, (_, day) => [
        day,
        { enabled: enabledDays.has(day), openingTime, closingTime },
      ]),
    );
  } else {
    if (!isRecord(candidate.dailySchedule)) return null;
    const keys = Object.keys(candidate.dailySchedule);
    if (
      keys.length !== 7 ||
      keys.some((key) => !/^[0-6]$/.test(key))
    ) {
      return null;
    }

    dailySchedule = {};
    for (let day = 0; day <= 6; day += 1) {
      const schedule = candidate.dailySchedule[String(day)];
      if (
        !isRecord(schedule) ||
        typeof schedule.enabled !== "boolean" ||
        !isValidScheduleTime(schedule.openingTime) ||
        !isValidScheduleTime(schedule.closingTime) ||
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

  return {
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

  const categoriesWithServices = new Set(
    settings.services.map((service) => service.category),
  );
  if (
    settings.categories.some(
      (category) => !categoriesWithServices.has(category.id),
    )
  ) {
    return null;
  }

  await saveAppointmentSettingsRecord(settings);
  return settings;
}
