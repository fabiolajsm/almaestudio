import {
  defaultAppointmentSettings,
  isAppointmentTimeWithinBusinessHours,
  isAppointmentWorkingDay,
} from "@/app/Appoinments/appointmentCatalog";
import { getArgentinaDateKey } from "@/app/Appoinments/appointmentDates";
import { MIN_APPOINTMENT_SERVICES } from "@/app/constants";
import {
  isValidAppointmentDateKey,
  validateAppointmentContactFields,
} from "@/app/validations";
import type {
  AppointmentContact,
  AppointmentSettings,
  ValidationResult,
} from "@/app/types";
import type {
  AppointmentSelectionInput,
  CreateAppointmentInput,
} from "../types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function hasSameOrigin(request: Request) {
  const origin = request.headers.get("origin");

  return origin !== null && origin === new URL(request.url).origin;
}

function isValidAppointmentDate(
  date: string,
  settings: AppointmentSettings,
) {
  if (!isValidAppointmentDateKey(date)) {
    return false;
  }

  return (
    date >= getArgentinaDateKey(new Date()) &&
    isAppointmentWorkingDay(date, settings)
  );
}

export function validateCreateAppointmentInput(
  value: unknown,
  settings: AppointmentSettings = defaultAppointmentSettings,
): ValidationResult<CreateAppointmentInput> {
  if (!isRecord(value)) {
    return { success: false, error: "El pedido no tiene un formato válido." };
  }

  const contactValidation = validateAppointmentContact(value);

  if (!contactValidation.success) {
    return contactValidation;
  }

  const selectionValidation = validateAppointmentSelectionInput(value, settings);
  if (!selectionValidation.success) {
    return selectionValidation;
  }

  return {
    success: true,
    data: {
      ...selectionValidation.data,
      customer: contactValidation.data,
    },
  };
}

export function validateAppointmentSelectionInput(
  value: unknown,
  settings: AppointmentSettings = defaultAppointmentSettings,
): ValidationResult<AppointmentSelectionInput> {
  if (!isRecord(value)) {
    return { success: false, error: "El pedido no tiene un formato válido." };
  }

  const date = typeof value.date === "string" ? value.date : "";
  const time = typeof value.time === "string" ? value.time : "";
  const { serviceIds } = value;

  if (!isValidAppointmentDate(date, settings)) {
    return { success: false, error: "Elegí una fecha disponible." };
  }

  if (
    !Array.isArray(serviceIds) ||
    serviceIds.length < MIN_APPOINTMENT_SERVICES ||
    !serviceIds.every((id): id is string => typeof id === "string") ||
    new Set(serviceIds).size !== serviceIds.length
  ) {
    return { success: false, error: "Elegí al menos un servicio válido." };
  }

  const selectedServiceIds = serviceIds;
  const selectedServices = settings.services.filter((service) =>
    selectedServiceIds.includes(service.id),
  );

  if (selectedServices.length !== selectedServiceIds.length) {
    return { success: false, error: "La selección de servicios no es válida." };
  }

  const duration = selectedServices.reduce(
    (total, service) => total + service.duration,
    0,
  );
  if (!isAppointmentTimeWithinBusinessHours(time, duration, settings, date)) {
    return {
      success: false,
      error: "El horario no está dentro del horario de atención.",
    };
  }

  return {
    success: true,
    data: {
      date,
      time,
      serviceIds: selectedServiceIds,
      duration,
      totalPrice: selectedServices.reduce(
        (total, service) => total + service.price,
        0,
      ),
    },
  };
}

export function validateAppointmentContact(
  value: unknown,
): ValidationResult<AppointmentContact> {
  if (!isRecord(value)) {
    return { success: false, error: "El pedido no tiene un formato válido." };
  }

  const { data, errors } = validateAppointmentContactFields(value);
  const error = errors.name ?? errors.email ?? errors.phone;
  if (error) {
    return {
      success: false,
      error,
    };
  }

  return { success: true, data };
}
