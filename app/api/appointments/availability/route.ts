import { getArgentinaDateKey } from "@/app/Appoinments/appointmentDates";
import {
  getAvailableTimesByDate,
  GoogleCalendarIntegrationError,
} from "@/lib/googleCalendar";
import { getAppointmentForCustomer } from "@/lib/supabaseAdmin";
import { getAppointmentSettings } from "@/lib/appointmentSettings";
import { hasSameOrigin } from "../create/validations";
import {
  MAX_AVAILABILITY_RANGE_DAYS,
  MAX_LOOKUP_REQUEST_BYTES,
  MILLISECONDS_PER_DAY,
  SERVICE_DURATION_MINUTES,
} from "@/app/constants";
import {
  isValidAppointmentDateKey,
  validateAppointmentLookupCredentials,
} from "@/app/validations";

export const runtime = "nodejs";

function getAvailabilityRange(
  startDate: string,
  endDate: string,
  durationMinutes: number,
) {
  const dateRange =
    Date.parse(`${endDate}T00:00:00.000Z`) -
    Date.parse(`${startDate}T00:00:00.000Z`);

  if (
    !isValidAppointmentDateKey(startDate) ||
    !isValidAppointmentDateKey(endDate) ||
    startDate < getArgentinaDateKey(new Date()) ||
    endDate < startDate ||
    dateRange > MAX_AVAILABILITY_RANGE_DAYS * MILLISECONDS_PER_DAY ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes < SERVICE_DURATION_MINUTES.min
  ) {
    return null;
  }

  return { startDate, endDate, durationMinutes };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const startDate = params.get("start") ?? "";
  const endDate = params.get("end") ?? "";
  const durationMinutes = Number(params.get("duration"));

  const range = getAvailabilityRange(startDate, endDate, durationMinutes);
  if (!range) {
    return Response.json(
      { error: "El rango de fechas o la duración no son válidos." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const settings = await getAppointmentSettings();
    const availability = await getAvailableTimesByDate(
      range.startDate,
      range.endDate,
      range.durationMinutes,
      undefined,
      settings,
    );

    return Response.json(
      availability,
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (
      error instanceof GoogleCalendarIntegrationError &&
      error.code === "not_configured"
    ) {
      return Response.json(
        { error: "La conexión con Google Calendar todavía no está configurada." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    console.error("No se pudo consultar la disponibilidad de Google Calendar.", error);
    return Response.json(
      { error: "No se pudo consultar la agenda. Intentá nuevamente más tarde." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Solicitud no válida." }, { status: 403 });
  }

  let body: unknown;
  try {
    const bodyText = await request.text();
    if (Buffer.byteLength(bodyText) > MAX_LOOKUP_REQUEST_BYTES) {
      return Response.json(
        { error: "La solicitud es demasiado grande." },
        { status: 413 },
      );
    }

    body = JSON.parse(bodyText);
  } catch {
    return Response.json(
      { error: "El pedido no tiene un formato válido." },
      { status: 400 },
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { error: "El pedido no tiene un formato válido." },
      { status: 400 },
    );
  }

  const credentials = validateAppointmentLookupCredentials(body);
  const range = getAvailabilityRange(
    typeof body.startDate === "string" ? body.startDate : "",
    typeof body.endDate === "string" ? body.endDate : "",
    typeof body.durationMinutes === "number" ? body.durationMinutes : Number.NaN,
  );

  if (
    !credentials.success ||
    !range
  ) {
    return Response.json(
      { error: "Los datos para consultar la disponibilidad no son válidos." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const reservationCode = Number(credentials.data.reservationCode);
  const { email } = credentials.data;

  try {
    const settings = await getAppointmentSettings();
    const appointment = await getAppointmentForCustomer(reservationCode);
    if (
      !appointment ||
      appointment.customer_email?.trim().toLocaleLowerCase() !== email
    ) {
      return Response.json(
        { error: "No encontramos una reserva activa con esos datos." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    const availability = await getAvailableTimesByDate(
      range.startDate,
      range.endDate,
      range.durationMinutes,
      {
        appointmentId: appointment.id,
        calendarEventId: appointment.calendar_event_id,
      },
      settings,
    );

    return Response.json(availability, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (
      error instanceof GoogleCalendarIntegrationError &&
      error.code === "not_configured"
    ) {
      return Response.json(
        { error: "La conexión con Google Calendar todavía no está configurada." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    console.error(
      "No se pudo consultar la disponibilidad durante la modificación del turno.",
      error,
    );
    return Response.json(
      { error: "No se pudo consultar la agenda. Intentá nuevamente más tarde." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
