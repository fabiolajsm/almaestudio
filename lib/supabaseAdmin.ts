import { getArgentinaDateKey } from "@/app/Appoinments/appointmentDates";
import type { AppointmentSettings } from "@/app/Appoinments/appointmentCatalog";

export type AdminAppointmentReservation = {
  id: string;
  reservation_code: number;
  appointment_date: string;
  start_time: string;
  duration_minutes: number;
  service_ids: string[];
  total_price: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  calendar_event_id: string | null;
  status: "pending_review" | "confirmed";
  created_at: string;
};

export class SupabaseRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "SupabaseRequestError";
  }
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  }

  return { url, serviceRoleKey };
}

async function getErrorDetails(response: Response) {
  const responseText = await response.text();

  try {
    const body: unknown = JSON.parse(responseText);

    if (body && typeof body === "object") {
      const details = body as { code?: unknown; message?: unknown };

      return {
        code: typeof details.code === "string" ? details.code : undefined,
        message:
          typeof details.message === "string"
            ? details.message
            : response.statusText,
      };
    }
  } catch {
    return { message: response.statusText };
  }

  return { message: response.statusText };
}

function parseDatabaseTime(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/.exec(
    value,
  );
  if (!match) {
    throw new Error("Supabase devolvió un horario de atención inválido.");
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export async function getAppointmentSettingsRecord(): Promise<unknown | null> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const headers = {
    apikey: serviceRoleKey,
    Authorization: "Bearer " + serviceRoleKey,
  };
  const hoursQuery = new URLSearchParams({
    select: "opening_time,closing_time,working_days",
    id: "eq.default",
    limit: "1",
  });
  const servicesQuery = new URLSearchParams({
    select: "id,name,description,category,duration_minutes,price",
    order: "sort_order.asc",
  });
  const categoriesQuery = new URLSearchParams({
    select: "id,name,note",
    order: "sort_order.asc",
  });
  const [hoursResponse, servicesResponse, categoriesResponse] =
    await Promise.all([
    fetch(
      `${url}/rest/v1/appointment_business_hours?${hoursQuery.toString()}`,
      {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    ),
    fetch(`${url}/rest/v1/appointment_services?${servicesQuery.toString()}`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    }),
    fetch(
      `${url}/rest/v1/appointment_service_categories?${categoriesQuery.toString()}`,
      {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    ),
  ]);

  if (!hoursResponse.ok) {
    const error = await getErrorDetails(hoursResponse);
    throw new SupabaseRequestError(
      error.message,
      hoursResponse.status,
      error.code,
    );
  }
  if (!servicesResponse.ok) {
    const error = await getErrorDetails(servicesResponse);
    throw new SupabaseRequestError(
      error.message,
      servicesResponse.status,
      error.code,
    );
  }
  if (!categoriesResponse.ok) {
    const error = await getErrorDetails(categoriesResponse);
    throw new SupabaseRequestError(
      error.message,
      categoriesResponse.status,
      error.code,
    );
  }

  const hours = (
    (await hoursResponse.json()) as Array<{
      opening_time: string;
      closing_time: string;
      working_days: number[];
    }>
  )[0];
  const services = (await servicesResponse.json()) as Array<{
    id: string;
    name: string;
    description: string | null;
    category: string;
    duration_minutes: number;
    price: number;
  }>;
  const categories = (await categoriesResponse.json()) as Array<{
    id: string;
    name: string;
    note: string | null;
  }>;

  if (!hours && services.length === 0 && categories.length === 0) {
    return null;
  }
  if (!hours || services.length === 0 || categories.length === 0) {
    throw new Error("Supabase devolvió una configuración de turnos incompleta.");
  }

  return {
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      ...(category.note === null ? {} : { note: category.note }),
    })),
    services: services.map((service) => ({
      id: service.id,
      name: service.name,
      ...(service.description === null
        ? {}
        : { description: service.description }),
      category: service.category,
      duration: service.duration_minutes,
      price: service.price,
    })),
    openingTime: parseDatabaseTime(hours.opening_time),
    closingTime: parseDatabaseTime(hours.closing_time),
    workingDays: hours.working_days,
  };
}

function formatDatabaseTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;
}

export async function saveAppointmentSettingsRecord(
  settings: AppointmentSettings,
) {
  const result = await callSupabaseRpc<boolean>("save_appointment_settings", {
    p_categories: settings.categories,
    p_services: settings.services,
    p_opening_time: formatDatabaseTime(settings.openingTime),
    p_closing_time: formatDatabaseTime(settings.closingTime),
    p_working_days: settings.workingDays,
  });
  if (result !== true) {
    throw new Error("Supabase no confirmó los cambios de configuración.");
  }
}

export async function callSupabaseRpc<T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(
    `${url}/rest/v1/rpc/${encodeURIComponent(functionName)}`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: "Bearer " + serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const error = await getErrorDetails(response);
    throw new SupabaseRequestError(error.message, response.status, error.code);
  }

  return (await response.json()) as T;
}

export async function getAdminAppointmentReservations() {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const query = new URLSearchParams({
    select:
      "id,reservation_code,appointment_date,start_time,duration_minutes,service_ids,total_price,customer_name,customer_email,customer_phone,calendar_event_id,status,created_at",
    status: "in.(pending_review,confirmed)",
    appointment_date: `gte.${getArgentinaDateKey(new Date())}`,
    order: "appointment_date.asc,start_time.asc",
    limit: "100",
  });
  const response = await fetch(
    `${url}/rest/v1/appointment_reservations?${query.toString()}`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: "Bearer " + serviceRoleKey,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    const error = await getErrorDetails(response);
    throw new SupabaseRequestError(error.message, response.status, error.code);
  }

  return (await response.json()) as AdminAppointmentReservation[];
}

export async function getAppointmentCalendarEventId(appointmentId: string) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const query = new URLSearchParams({
    select: "calendar_event_id",
    id: `eq.${appointmentId}`,
    limit: "1",
  });
  const response = await fetch(
    `${url}/rest/v1/appointment_reservations?${query.toString()}`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: "Bearer " + serviceRoleKey,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    const error = await getErrorDetails(response);
    throw new SupabaseRequestError(error.message, response.status, error.code);
  }

  const rows = (await response.json()) as Array<{
    calendar_event_id: string | null;
  }>;
  return rows[0]?.calendar_event_id ?? null;
}

export async function getAppointmentForCustomer(reservationCode: number) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const query = new URLSearchParams({
    select:
      "id,reservation_code,appointment_date,start_time,duration_minutes,service_ids,total_price,customer_name,customer_email,customer_phone,calendar_event_id",
    reservation_code: `eq.${reservationCode}`,
    status: "in.(pending_review,confirmed)",
    limit: "1",
  });
  const response = await fetch(
    `${url}/rest/v1/appointment_reservations?${query.toString()}`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: "Bearer " + serviceRoleKey,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    const error = await getErrorDetails(response);
    throw new SupabaseRequestError(error.message, response.status, error.code);
  }

  const rows = (await response.json()) as Array<{
    id: string;
    reservation_code: number;
    appointment_date: string;
    start_time: string;
    duration_minutes: number;
    service_ids: string[];
    total_price: number;
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
    calendar_event_id: string | null;
  }>;
  return rows[0] ?? null;
}

export async function updateAppointmentReservation(
  appointmentId: string,
  appointment: {
    appointment_date: string;
    start_time: string;
    duration_minutes: number;
    service_ids: string[];
    total_price: number;
  },
) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const query = new URLSearchParams({
    id: `eq.${appointmentId}`,
    status: "in.(pending_review,confirmed)",
    select: "id",
  });
  const response = await fetch(
    `${url}/rest/v1/appointment_reservations?${query.toString()}`,
    {
      method: "PATCH",
      headers: {
        apikey: serviceRoleKey,
        Authorization: "Bearer " + serviceRoleKey,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(appointment),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    const error = await getErrorDetails(response);
    throw new SupabaseRequestError(error.message, response.status, error.code);
  }

  const rows = (await response.json()) as Array<{ id: string }>;
  return rows[0] ?? null;
}

export async function deleteAppointmentReservation(appointmentId: string) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const query = new URLSearchParams({
    id: `eq.${appointmentId}`,
    status: "in.(pending_review,confirmed)",
    select: "id",
  });
  const response = await fetch(
    `${url}/rest/v1/appointment_reservations?${query.toString()}`,
    {
      method: "DELETE",
      headers: {
        apikey: serviceRoleKey,
        Authorization: "Bearer " + serviceRoleKey,
        Prefer: "return=representation",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    const error = await getErrorDetails(response);
    throw new SupabaseRequestError(error.message, response.status, error.code);
  }

  const rows = (await response.json()) as Array<{ id: string }>;
  return rows[0] ?? null;
}

export async function getAppointmentReservation(date: string, time: string) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const query = new URLSearchParams({
    select:
      "id,reservation_code,duration_minutes,service_ids,total_price,customer_name,customer_email,customer_phone,calendar_event_id",
    appointment_date: `eq.${date}`,
    start_time: `eq.${time}:00`,
    status: "in.(pending_review,confirmed)",
    limit: "1",
  });
  const response = await fetch(
    `${url}/rest/v1/appointment_reservations?${query.toString()}`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: "Bearer " + serviceRoleKey,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    const error = await getErrorDetails(response);
    throw new SupabaseRequestError(error.message, response.status, error.code);
  }

  const rows = (await response.json()) as Array<{
    id: string;
    reservation_code: number;
    duration_minutes: number;
    service_ids: string[];
    total_price: number;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    calendar_event_id: string;
  }>;
  return rows[0] ?? null;
}

export async function getActiveAppointmentReservations(
  startDate: string,
  endDate: string,
  excludeAppointmentId?: string,
) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const query = new URLSearchParams({
    select: "appointment_date,start_time,duration_minutes",
    status: "in.(pending_review,confirmed)",
    order: "appointment_date.asc,start_time.asc",
  });
  query.set("and", `(appointment_date.gte.${startDate},appointment_date.lte.${endDate})`);
  if (excludeAppointmentId) {
    query.set("id", `not.eq.${excludeAppointmentId}`);
  }

  const response = await fetch(
    `${url}/rest/v1/appointment_reservations?${query.toString()}`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: "Bearer " + serviceRoleKey,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    const error = await getErrorDetails(response);
    throw new SupabaseRequestError(error.message, response.status, error.code);
  }

  return (await response.json()) as Array<{
    appointment_date: string;
    start_time: string;
    duration_minutes: number;
  }>;
}

export async function updateAdminAppointmentStatus(
  appointmentId: string,
  status: "confirmed" | "cancelled",
) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const query = new URLSearchParams({
    id: `eq.${appointmentId}`,
    status:
      status === "confirmed"
        ? "eq.pending_review"
        : "in.(pending_review,confirmed)",
    select: "id,calendar_event_id",
  });
  const response = await fetch(
    `${url}/rest/v1/appointment_reservations?${query.toString()}`,
    {
      method: "PATCH",
      headers: {
        apikey: serviceRoleKey,
        Authorization: "Bearer " + serviceRoleKey,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ status }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    const error = await getErrorDetails(response);
    throw new SupabaseRequestError(error.message, response.status, error.code);
  }

  const updatedRows = (await response.json()) as Array<{
    id: string;
    calendar_event_id: string | null;
  }>;
  return updatedRows[0] ?? null;
}
