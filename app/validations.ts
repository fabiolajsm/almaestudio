import {
  ADDRESS_MAX_LENGTH,
  APPOINTMENT_DATE_KEY_LENGTH,
  APPOINTMENT_DATE_KEY_PATTERN,
  APPOINTMENT_ID_PATTERN,
  APPOINTMENT_NAME_PATTERN,
  CATEGORY_NOTE_MAX_LENGTH,
  CATEGORY_NAME_MAX_LENGTH,
  CONTACT_NAME_MAX_LENGTH,
  CONTACT_NAME_MIN_LENGTH,
  EMAIL_DOMAIN_LABEL_MAX_LENGTH,
  EMAIL_DOMAIN_LABEL_PATTERN,
  EMAIL_DOMAIN_MAX_LENGTH,
  EMAIL_LOCAL_PART_MAX_LENGTH,
  EMAIL_LOCAL_PART_PATTERN,
  EMAIL_MAX_LENGTH,
  EMAIL_TOP_LEVEL_DOMAIN_PATTERN,
  INSTAGRAM_USERNAME_MAX_LENGTH,
  MAPS_URL_MAX_LENGTH,
  MIN_SCHEDULE_MINUTES,
  MAX_APPOINTMENT_CATEGORIES,
  MAX_APPOINTMENT_SERVICES,
  MIN_APPOINTMENT_CATEGORIES,
  MIN_APPOINTMENT_SERVICES,
  PHONE_MAX_DIGITS,
  PHONE_MIN_DIGITS,
  PHONE_PATTERN,
  RESERVATION_CODE_PATTERN,
  NON_DIGIT_PATTERN,
  REPEATED_WHITESPACE_PATTERN,
  SCHEDULE_MINUTE_INCREMENT,
  SCHEDULE_MINUTES_PER_DAY,
  SERVICE_DESCRIPTION_MAX_LENGTH,
  SERVICE_DURATION_MINUTES,
  SERVICE_NAME_MAX_LENGTH,
  SERVICE_PRICE,
  SOCIAL_USERNAME_PATTERN,
  SOCIAL_VALUE_MAX_LENGTH,
  TIME_STRING_PATTERN,
  TIKTOK_USERNAME_MAX_LENGTH,
  WHITESPACE_PATTERN,
} from "@/app/constants";
import type { AdminSettingsValidationError } from "@/app/admin/types";
import type {
  AppointmentContact,
  AppointmentContactErrors,
  AppointmentLookupCredentials,
  AppointmentServiceDraft,
  AppointmentServiceCategoryDefinition,
  ExtendedAppointmentSettings,
  ValidationResult,
} from "@/app/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isValidEmailAddress(value: string) {
  const email = value.trim();
  const [localPart, domain, ...extraParts] = email.split("@");
  if (
    !localPart ||
    !domain ||
    extraParts.length > 0 ||
    email.length > EMAIL_MAX_LENGTH ||
    localPart.length > EMAIL_LOCAL_PART_MAX_LENGTH ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    !EMAIL_LOCAL_PART_PATTERN.test(localPart) ||
    WHITESPACE_PATTERN.test(email)
  ) {
    return false;
  }

  const labels = domain.split(".");
  return (
    domain.length <= EMAIL_DOMAIN_MAX_LENGTH &&
    labels.length > 1 &&
    labels.every(
      (label) =>
        label.length > 0 &&
        label.length <= EMAIL_DOMAIN_LABEL_MAX_LENGTH &&
        EMAIL_DOMAIN_LABEL_PATTERN.test(label),
    ) &&
    EMAIL_TOP_LEVEL_DOMAIN_PATTERN.test(labels[labels.length - 1])
  );
}

export function isValidPhoneNumber(value: string) {
  const phone = value.trim();
  const digitCount = phone.replace(NON_DIGIT_PATTERN, "").length;
  return (
    PHONE_PATTERN.test(phone) &&
    digitCount >= PHONE_MIN_DIGITS &&
    digitCount <= PHONE_MAX_DIGITS
  );
}

export function validateAppointmentContactFields(value: Record<string, unknown>) {
  const data: AppointmentContact = {
    name:
      typeof value.name === "string"
        ? value.name.trim().replace(REPEATED_WHITESPACE_PATTERN, " ")
        : "",
    email: typeof value.email === "string" ? value.email.trim() : "",
    phone: typeof value.phone === "string" ? value.phone.trim() : "",
  };
  const errors: AppointmentContactErrors = {};

  if (
    data.name.length < CONTACT_NAME_MIN_LENGTH ||
    data.name.length > CONTACT_NAME_MAX_LENGTH ||
    data.name.split(" ").length < 2 ||
    !APPOINTMENT_NAME_PATTERN.test(data.name)
  ) {
    errors.name =
      "Ingresá nombre y apellido válidos. Podés usar tildes, puntos, guiones y apóstrofes.";
  }

  if (!isValidEmailAddress(data.email)) {
    errors.email = "Ingresá un email válido, por ejemplo nombre@email.com.";
  }

  if (!isValidPhoneNumber(data.phone)) {
    errors.phone =
      "Ingresá un teléfono válido con código de área (entre 8 y 15 números).";
  }

  return { data, errors };
}

export function validateAppointmentLookupCredentials(
  value: unknown,
): ValidationResult<AppointmentLookupCredentials> {
  if (!isRecord(value)) {
    return {
      success: false,
      error: "Ingresá un código de reserva y un email válidos.",
    };
  }

  const reservationCode =
    typeof value.reservationCode === "string"
      ? value.reservationCode.trim()
      : typeof value.reservationCode === "number" &&
          Number.isSafeInteger(value.reservationCode)
        ? String(value.reservationCode)
        : "";
  const email =
    typeof value.email === "string" ? value.email.trim().toLocaleLowerCase() : "";
  const numericCode = Number(reservationCode);

  if (
    !RESERVATION_CODE_PATTERN.test(reservationCode) ||
    !Number.isSafeInteger(numericCode) ||
    numericCode <= 0 ||
    !isValidEmailAddress(email)
  ) {
    return {
      success: false,
      error: "Ingresá un código de reserva y un email válidos.",
    };
  }

  return {
    success: true,
    data: { reservationCode, email },
  };
}

export function isValidScheduleMinutes(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_SCHEDULE_MINUTES &&
    value < SCHEDULE_MINUTES_PER_DAY &&
    value % SCHEDULE_MINUTE_INCREMENT === 0
  );
}

export function isValidAppointmentId(value: unknown): value is string {
  return typeof value === "string" && APPOINTMENT_ID_PATTERN.test(value);
}

export function isValidTimeString(value: string) {
  return TIME_STRING_PATTERN.test(value);
}

export function isValidAppointmentDateKey(value: string) {
  if (!APPOINTMENT_DATE_KEY_PATTERN.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, APPOINTMENT_DATE_KEY_LENGTH) === value
  );
}

function isValidSocialProfile(value: string, platform: "instagram" | "tiktok") {
  const profile = value.trim();
  const host =
    platform === "instagram" ? "instagram.com" : "tiktok.com";
  const usernameLength =
    platform === "instagram"
      ? INSTAGRAM_USERNAME_MAX_LENGTH
      : TIKTOK_USERNAME_MAX_LENGTH;

  const normalizedProfile = profile.toLocaleLowerCase();
  const hasProtocol =
    normalizedProfile.startsWith("https://") ||
    normalizedProfile.startsWith("http://");
  const isBarePlatformUrl =
    normalizedProfile.startsWith(`${host}/`) ||
    normalizedProfile.startsWith(`www.${host}/`);

  if (hasProtocol || isBarePlatformUrl) {
    try {
      const url = new URL(
        hasProtocol ? profile : `https://${profile}`,
      );
      const normalizedHost = url.hostname.toLocaleLowerCase();
      const isPlatformHost =
        normalizedHost === host || normalizedHost === `www.${host}`;
      return (
        (url.protocol === "https:" || url.protocol === "http:") &&
        isPlatformHost &&
        url.pathname !== "/" &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }

  const username = profile.startsWith("@") ? profile.slice(1) : profile;
  return (
    username.length > 0 &&
    username.length <= usernameLength &&
    SOCIAL_USERNAME_PATTERN.test(username) &&
    !username.startsWith(".") &&
    !username.endsWith(".") &&
    !username.includes("..")
  );
}

export function isValidMapsUrl(value: string) {
  const mapsUrl = value.trim();
  if (!mapsUrl || mapsUrl.length > MAPS_URL_MAX_LENGTH) {
    return false;
  }

  try {
    const url = new URL(mapsUrl);
    return (
      url.protocol === "https:" &&
      (url.hostname === "google.com" ||
        url.hostname.endsWith(".google.com"))
    );
  } catch {
    return false;
  }
}

export function validateAppointmentServiceDraft(
  service: AppointmentServiceDraft,
  categories: AppointmentServiceCategoryDefinition[],
) {
  const name = service.name.trim();
  if (!name || name.length > SERVICE_NAME_MAX_LENGTH) {
    return `El servicio debe tener un nombre de entre 1 y ${SERVICE_NAME_MAX_LENGTH} caracteres.`;
  }
  if (
    service.description !== undefined &&
    service.description.length > SERVICE_DESCRIPTION_MAX_LENGTH
  ) {
    return `La descripción del servicio admite hasta ${SERVICE_DESCRIPTION_MAX_LENGTH} caracteres.`;
  }
  if (!categories.some((category) => category.id === service.category)) {
    return "El servicio debe estar asignado a una categoría existente.";
  }
  if (
    !Number.isInteger(service.duration) ||
    service.duration < SERVICE_DURATION_MINUTES.min ||
    service.duration > SERVICE_DURATION_MINUTES.max ||
    service.duration % SERVICE_DURATION_MINUTES.step !== 0
  ) {
    return `La duración debe estar entre ${SERVICE_DURATION_MINUTES.min} y ${SERVICE_DURATION_MINUTES.max} minutos, en incrementos de ${SERVICE_DURATION_MINUTES.step}.`;
  }
  if (
    !Number.isSafeInteger(service.price) ||
    service.price < SERVICE_PRICE.min ||
    service.price > SERVICE_PRICE.max
  ) {
    return `El precio debe estar entre ${SERVICE_PRICE.min} y ${SERVICE_PRICE.max}.`;
  }

  return null;
}

export function validateAdminSettings(
  settings: ExtendedAppointmentSettings,
): AdminSettingsValidationError | null {
  const { categories, services } = settings;

  if (categories.length < MIN_APPOINTMENT_CATEGORIES) {
    return {
      section: "services",
      message: "Debe existir al menos una categoría.",
    };
  }
  if (categories.length > MAX_APPOINTMENT_CATEGORIES) {
    return {
      section: "services",
      message: `No puede haber más de ${MAX_APPOINTMENT_CATEGORIES} categorías.`,
    };
  }
  if (services.length < MIN_APPOINTMENT_SERVICES) {
    return {
      section: "services",
      message: "Debe existir al menos un servicio.",
    };
  }
  if (services.length > MAX_APPOINTMENT_SERVICES) {
    return {
      section: "services",
      message: `No puede haber más de ${MAX_APPOINTMENT_SERVICES} servicios.`,
    };
  }

  const categoryIds = new Set(categories.map((category) => category.id));
  if (categoryIds.size !== categories.length) {
    return {
      section: "services",
      message: "Los identificadores de las categorías no pueden repetirse.",
    };
  }

  const categoryNames = new Set<string>();
  for (const category of categories) {
    const name = category.name.trim();
    if (
      !APPOINTMENT_ID_PATTERN.test(category.id) ||
      !name ||
      name.length > CATEGORY_NAME_MAX_LENGTH ||
      (category.note !== undefined &&
        category.note.length > CATEGORY_NOTE_MAX_LENGTH)
    ) {
      return {
        section: "services",
        message: `Cada categoría debe tener un identificador válido, un nombre de entre 1 y ${CATEGORY_NAME_MAX_LENGTH} caracteres y una nota de hasta ${CATEGORY_NOTE_MAX_LENGTH} caracteres.`,
      };
    }
    const normalizedName = name.toLocaleLowerCase();
    if (categoryNames.has(normalizedName)) {
      return {
        section: "services",
        message: "Los nombres de las categorías no pueden repetirse.",
      };
    }
    categoryNames.add(normalizedName);
  }

  const categoryServiceCounts = new Map<string, number>();
  const serviceIds = new Set<string>();
  for (const service of services) {
    const name = service.name.trim();
    if (
      !APPOINTMENT_ID_PATTERN.test(service.id) ||
      serviceIds.has(service.id)
    ) {
      return {
        section: "services",
        message: `El servicio «${name}» tiene un identificador inválido o duplicado.`,
      };
    }
    serviceIds.add(service.id);
    const serviceError = validateAppointmentServiceDraft(service, categories);
    if (serviceError) {
      return {
        section: "services",
        message: serviceError,
      };
    }

    categoryServiceCounts.set(
      service.category,
      (categoryServiceCounts.get(service.category) ?? 0) + 1,
    );
  }

  if (categories.some((category) => !categoryServiceCounts.has(category.id))) {
    return {
      section: "services",
      message: "Cada categoría debe tener al menos un servicio asociado.",
    };
  }

  const activeSchedules = Object.values(settings.dailySchedule ?? {}).filter(
    (schedule) => schedule.enabled,
  );
  if (activeSchedules.length === 0) {
    return {
      section: "schedule",
      message: "Debe haber al menos un día de atención habilitado.",
    };
  }

  for (const schedule of activeSchedules) {
    if (
      !isValidScheduleMinutes(schedule.openingTime) ||
      !isValidScheduleMinutes(schedule.closingTime) ||
      schedule.closingTime <= schedule.openingTime
    ) {
      return {
        section: "schedule",
        message: "La hora de cierre debe ser posterior a la hora de apertura.",
      };
    }
  }

  const social = settings.social ?? {};
  const whatsapp = social.whatsapp?.trim() ?? "";
  if (
    whatsapp &&
    (whatsapp.length > SOCIAL_VALUE_MAX_LENGTH ||
      !isValidPhoneNumber(whatsapp))
  ) {
    return {
      section: "social",
      message: "Ingresá un WhatsApp válido con código de país.",
    };
  }

  const instagram = social.instagram?.trim() ?? "";
  if (
    instagram &&
    (instagram.length > SOCIAL_VALUE_MAX_LENGTH ||
      !isValidSocialProfile(instagram, "instagram"))
  ) {
    return {
      section: "social",
      message: "Ingresá un usuario o enlace válido de Instagram.",
    };
  }

  const tiktok = social.tiktok?.trim() ?? "";
  if (
    tiktok &&
    (tiktok.length > SOCIAL_VALUE_MAX_LENGTH ||
      !isValidSocialProfile(tiktok, "tiktok"))
  ) {
    return {
      section: "social",
      message: "Ingresá un usuario o enlace válido de TikTok.",
    };
  }

  const addressText = settings.location?.addressText ?? "";
  if (
    typeof addressText !== "string" ||
    addressText.length > ADDRESS_MAX_LENGTH ||
    (addressText.length > 0 && !addressText.trim())
  ) {
    return {
      section: "location",
      message: `La dirección debe contener texto y admitir hasta ${ADDRESS_MAX_LENGTH} caracteres.`,
    };
  }

  const mapsUrl = settings.location?.mapsUrl?.trim() ?? "";
  if (
    mapsUrl.length > 0 &&
    (mapsUrl.length > MAPS_URL_MAX_LENGTH || !isValidMapsUrl(mapsUrl))
  ) {
    return {
      section: "location",
      message: "Ingresá un enlace HTTPS válido de Google Maps.",
    };
  }

  return null;
}