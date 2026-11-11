import { getArgentinaDateKey } from "@/app/Appoinments/appointmentDates";
import {
  getAvailableTimesByDate,
  GoogleCalendarIntegrationError,
} from "@/lib/googleCalendar";

export const runtime = "nodejs";

const dayInMilliseconds = 24 * 60 * 60 * 1000;

function isValidDateKey(dateKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return false;
  }

  const date = new Date(`${dateKey}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === dateKey;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const startDate = params.get("start") ?? "";
  const endDate = params.get("end") ?? "";
  const durationMinutes = Number(params.get("duration"));
  const dateRange =
    Date.parse(`${endDate}T00:00:00.000Z`) -
    Date.parse(`${startDate}T00:00:00.000Z`);

  if (
    !isValidDateKey(startDate) ||
    !isValidDateKey(endDate) ||
    startDate < getArgentinaDateKey(new Date()) ||
    endDate < startDate ||
    dateRange > 62 * dayInMilliseconds ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 15
  ) {
    return Response.json(
      { error: "El rango de fechas o la duración no son válidos." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const availability = await getAvailableTimesByDate(
      startDate,
      endDate,
      durationMinutes,
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
