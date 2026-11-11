import { getArgentinaDateKey } from "@/app/Appoinments/appointmentDates";

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
) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const query = new URLSearchParams({
    select: "appointment_date,start_time,duration_minutes",
    status: "in.(pending_review,confirmed)",
    order: "appointment_date.asc,start_time.asc",
  });
  query.set("and", `(appointment_date.gte.${startDate},appointment_date.lte.${endDate})`);

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
