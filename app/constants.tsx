import type { AdminSection } from "./admin/types";
import type { AppointmentSettings } from "./types";

export const CARDS_ACTIONS = [
  {
    number: "01",
    title: "Sacar turno",
    description:
      "Elegí servicios, día y horario. Te lleva menos de cinco minutos.",
    href: "/Appoinments/Create",
    label: "Agendar un turno",
  },
  {
    number: "02",
    title: "Modificar turno",
    description: "Encontrá una nueva fecha o un horario que te quede mejor.",
    href: "/Appoinments/Modify",
    label: "Modificar turno",
  },
  {
    number: "03",
    title: "Cancelar turno",
    description: "Cancelá tu reserva de forma simple.",
    href: "/Appoinments/Delete",
    label: "Cancelar turno",
  },
];

export const ERROR_MESSAGES = {
  INVALID_RESERVATION_CODE: "El código de reserva ingresado no es válido.",
  APPOINTMENT_NOT_FOUND:
    "Lo sentimos. No se pudo encontrar el turno. Intentá nuevamente.",
};

export const CREATE_STEPS = ["Servicio", "Día y hora", "Contacto"];

export const WEEKDAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
] as const;

export const SECTION_OPTIONS: { value: AdminSection; label: string }[] = [
  { value: "services", label: "Servicios" },
  { value: "schedule", label: "Horarios y días de atención" },
  { value: "social", label: "Redes sociales y contacto" },
  { value: "location", label: "Ubicación" },
];

export const CALENDAR_WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];
export const CALENDAR_MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
export const CALENDAR_WEEKDAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export const DEFAULT_ADMIN_OPENING_TIME = 540;
export const DEFAULT_ADMIN_CLOSING_TIME = 1080;
export const DEFAULT_SERVICE_DURATION = 60;
export const DEFAULT_SERVICE_PRICE = 0;
export const APPOINTMENT_OPENING_TIME = 8 * 60;
export const APPOINTMENT_CLOSING_TIME = 22 * 60;
export const APPOINTMENT_WORKING_DAYS = [1, 2, 3, 4, 5, 6];
export const APPOINTMENT_BUFFER_MINUTES = 15;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const SCHEDULE_MINUTES_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR;
export const SCHEDULE_MINUTE_INCREMENT = 15;
export const SCHEDULE_INPUT_STEP_SECONDS = SCHEDULE_MINUTE_INCREMENT * 60;
export const MAX_SCHEDULE_MINUTES =
  SCHEDULE_MINUTES_PER_DAY - SCHEDULE_MINUTE_INCREMENT;
export const WEEKDAY_MIN = 0;
export const WEEKDAY_MAX = 6;
export const MIN_SCHEDULE_MINUTES = 0;
export const DAYS_TO_ADVANCE_FOR_NEXT_APPOINTMENT = 1;
export const CALENDAR_MONTH_INDEX_OFFSET = 1;
export const DATE_PART_PAD_LENGTH = 2;
export const MILLISECONDS_PER_SECOND = 1000;
export const SECONDS_PER_MINUTE = 60;
export const MILLISECONDS_PER_DAY =
  HOURS_PER_DAY *
  SECONDS_PER_MINUTE *
  SECONDS_PER_MINUTE *
  MILLISECONDS_PER_SECOND;
export const MAX_AVAILABILITY_RANGE_DAYS = 62;
export const MAX_LOOKUP_REQUEST_BYTES = 1024;
export const MAX_CREATE_APPOINTMENT_REQUEST_BYTES = 8192;
export const MAX_ADMIN_SETTINGS_REQUEST_BYTES = 32_768;

export const CATEGORY_NAME_MAX_LENGTH = 60;
export const CATEGORY_NOTE_MAX_LENGTH = 240;
export const CATEGORY_ID_MAX_LENGTH = 64;
export const MIN_APPOINTMENT_CATEGORIES = 1;
export const MAX_APPOINTMENT_CATEGORIES = 30;
export const SERVICE_NAME_MAX_LENGTH = 100;
export const SERVICE_DESCRIPTION_MAX_LENGTH = 240;
export const SERVICE_DURATION_MINUTES = {
  min: 15,
  max: 600,
  step: 15,
} as const;
export const SERVICE_PRICE = {
  min: 0,
  max: 10_000_000,
  step: 500,
} as const;
export const MAX_APPOINTMENT_SERVICES = 100;
export const MIN_APPOINTMENT_SERVICES = 1;
export const APPOINTMENT_ID_MAX_LENGTH = 64;
export const CONTACT_NAME_MIN_LENGTH = 2;
export const CONTACT_NAME_MAX_LENGTH = 100;
export const EMAIL_MAX_LENGTH = 254;
export const EMAIL_LOCAL_PART_MAX_LENGTH = 64;
export const EMAIL_DOMAIN_MAX_LENGTH = 253;
export const EMAIL_DOMAIN_LABEL_MAX_LENGTH = 63;
export const PHONE_MIN_DIGITS = 8;
export const PHONE_MAX_DIGITS = 15;
export const PHONE_INPUT_MAX_LENGTH = 30;
export const SOCIAL_VALUE_MAX_LENGTH = 500;
export const INSTAGRAM_USERNAME_MAX_LENGTH = 30;
export const TIKTOK_USERNAME_MAX_LENGTH = 24;
export const ADDRESS_MAX_LENGTH = 300;
export const MAPS_URL_MAX_LENGTH = 2000;
export const RESERVATION_CODE_MAX_LENGTH = 15;
export const APPOINTMENT_DATE_KEY_LENGTH = 10;

export const APPOINTMENT_NAME_PATTERN = /^\p{L}+(?:[ '.\u2019-]\p{L}+)*$/u;
export const EMAIL_LOCAL_PART_PATTERN = /^[\p{L}\p{N}!#$%&'*+/=?^_`{|}~.-]+$/u;
export const EMAIL_DOMAIN_LABEL_PATTERN =
  /^[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?$/u;
export const EMAIL_TOP_LEVEL_DOMAIN_PATTERN = /^\p{L}{2,}$/u;
export const PHONE_PATTERN = /^\+?[0-9\s().-]+$/;
export const TIME_STRING_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
export const APPOINTMENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const RESERVATION_CODE_PATTERN = /^\d{1,15}$/;
export const APPOINTMENT_DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const WEEKDAY_KEY_PATTERN = /^[0-6]$/;
export const SOCIAL_USERNAME_PATTERN = /^[A-Za-z0-9._]+$/;
export const WHITESPACE_PATTERN = /\s/;
export const REPEATED_WHITESPACE_PATTERN = /\s+/g;
export const NON_DIGIT_PATTERN = /\D/g;

export const appointmentBufferMinutes = APPOINTMENT_BUFFER_MINUTES;

export const defaultAppointmentSettings: AppointmentSettings = {
  categories: [],
  services: [],
  openingTime: APPOINTMENT_OPENING_TIME,
  closingTime: APPOINTMENT_CLOSING_TIME,
  workingDays: APPOINTMENT_WORKING_DAYS,
};
