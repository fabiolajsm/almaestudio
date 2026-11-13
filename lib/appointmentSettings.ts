import {
  appointmentServiceCategories,
  defaultAppointmentSettings,
  type AppointmentSettings,
  type AppointmentServiceCategoryDefinition,
  type AppointmentService,
} from "@/app/Appoinments/appointmentCatalog";
import {
  getAppointmentSettingsRecord,
  saveAppointmentSettingsRecord,
} from "@/lib/supabaseAdmin";

const defaultCategoriesById = new Map(
  appointmentServiceCategories.map((category) => [category.id, category]),
);

export function parseAppointmentSettings(
  value: unknown,
): AppointmentSettings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
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
    const defaultCategory =
      typeof category.id === "string"
        ? defaultCategoriesById.get(category.id)
        : null;
    if (
      !defaultCategory ||
      typeof category.name !== "string" ||
      category.name.trim().length === 0 ||
      category.name.length > 60
    ) {
      return null;
    }

    categories.push({
      ...defaultCategory,
      name: category.name.trim(),
    });
  }

  if (
    categories.length !== appointmentServiceCategories.length ||
    new Set(categories.map((category) => category.id)).size !==
      appointmentServiceCategories.length ||
    new Set(
      categories.map((category) => category.name.trim().toLocaleLowerCase()),
    ).size !== categories.length
  ) {
    return null;
  }

  const categoryIds = new Set(categories.map((category) => category.id));
  const services: AppointmentService[] = [];
  for (const serviceValue of candidate.services) {
    if (!serviceValue || typeof serviceValue !== "object" || Array.isArray(serviceValue)) {
      return null;
    }

    const service = serviceValue as Record<string, unknown>;
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

  return {
    categories,
    services,
    openingTime,
    closingTime,
    workingDays: [...workingDays].sort((a, b) => a - b),
  };
}

export async function getAppointmentSettings() {
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
