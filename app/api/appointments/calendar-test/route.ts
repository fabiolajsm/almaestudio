import { getArgentinaDateKey } from "@/app/Appoinments/appointmentDates";
import {
  getGoogleCalendarAvailabilityByDate,
  GoogleCalendarIntegrationError,
} from "@/lib/googleCalendar";
import { getAppointmentSettings } from "@/lib/appointmentSettings";
import {
  MAX_AVAILABILITY_RANGE_DAYS,
  MILLISECONDS_PER_DAY,
  SERVICE_DURATION_MINUTES,
} from "@/app/constants";
import { isValidAppointmentDateKey } from "@/app/validations";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }

  const params = new URL(request.url).searchParams;
  const startDate = params.get("start") ?? "";
  const endDate = params.get("end") ?? "";
  const durationMinutes = Number(params.get("duration"));
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
    return Response.json(
      { error: "El rango de fechas o la duración no son válidos." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const result = await getGoogleCalendarAvailabilityByDate(
      startDate,
      endDate,
      durationMinutes,
      await getAppointmentSettings(),
    );

    return Response.json(
      { timeZone: "America/Argentina/Buenos_Aires", ...result },
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

    console.error("No se pudo completar la prueba local de Google Calendar.", error);
    return Response.json(
      { error: "No se pudo consultar la agenda. Revisá la terminal de desarrollo." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
