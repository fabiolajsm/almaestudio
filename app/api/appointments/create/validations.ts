import {
  appointmentServices,
  isAppointmentTimeWithinBusinessHours,
  isAppointmentWorkingDay,
} from "@/app/Appoinments/appointmentCatalog";
import { getArgentinaDateKey } from "@/app/Appoinments/appointmentDates";
import { validateAppointmentContactFields } from "@/lib/appointmentContactValidation";

type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type CreateAppointmentInput = {
  date: string;
  time: string;
  serviceIds: string[];
  duration: number;
  totalPrice: number;
  customer: AppointmentContactInput;
};

export type AppointmentContactInput = {
  name: string;
  email: string;
  phone: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function hasSameOrigin(request: Request) {
  const origin = request.headers.get("origin");

  return origin !== null && origin === new URL(request.url).origin;
}

function isValidAppointmentDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date &&
    date >= getArgentinaDateKey(new Date()) &&
    isAppointmentWorkingDay(date)
  );
}

export function validateCreateAppointmentInput(
  value: unknown,
): ValidationResult<CreateAppointmentInput> {
  if (!isRecord(value)) {
    return { success: false, error: "El pedido no tiene un formato válido." };
  }

  const date = typeof value.date === "string" ? value.date : "";
  const time = typeof value.time === "string" ? value.time : "";
  const { serviceIds } = value;
  const contactValidation = validateAppointmentContact(value);

  if (!contactValidation.success) {
    return contactValidation;
  }

  if (!isValidAppointmentDate(date)) {
    return { success: false, error: "Elegí una fecha disponible." };
  }

  if (
    !Array.isArray(serviceIds) ||
    serviceIds.length === 0 ||
    !serviceIds.every((id): id is string => typeof id === "string") ||
    new Set(serviceIds).size !== serviceIds.length
  ) {
    return { success: false, error: "Elegí al menos un servicio válido." };
  }

  const selectedServiceIds = serviceIds;
  const selectedServices = appointmentServices.filter((service) =>
    selectedServiceIds.includes(service.id),
  );

  if (selectedServices.length !== selectedServiceIds.length) {
    return { success: false, error: "La selección de servicios no es válida." };
  }

  const duration = selectedServices.reduce(
    (total, service) => total + service.duration,
    0,
  );
  if (!isAppointmentTimeWithinBusinessHours(time, duration)) {
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
      customer: contactValidation.data,
    },
  };
}

export function validateAppointmentContact(
  value: unknown,
): ValidationResult<AppointmentContactInput> {
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
