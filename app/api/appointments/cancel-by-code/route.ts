import { hasSameOrigin } from "@/lib/adminSession";
import {
  deleteAppointmentReservation,
  getAppointmentForCustomerCancellation,
  SupabaseRequestError,
} from "@/lib/supabaseAdmin";
import {
  deleteCalendarAppointment,
  GoogleCalendarIntegrationError,
} from "@/lib/googleCalendar";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Solicitud no válida." }, { status: 403 });
  }

  let body: unknown;
  try {
    const bodyText = await request.text();
    if (Buffer.byteLength(bodyText) > 1024) {
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

  const reservationCode =
    typeof body.reservationCode === "string" &&
    /^\d{1,15}$/.test(body.reservationCode)
      ? Number(body.reservationCode)
      : Number.NaN;
  const email =
    typeof body.email === "string" ? body.email.trim().toLocaleLowerCase() : "";
  const action = body.action;

  if (
    (action !== "lookup" && action !== "cancel") ||
    !Number.isSafeInteger(reservationCode) ||
    reservationCode <= 0 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return Response.json(
      { error: "Ingresá un código de reserva y un email válidos." },
      { status: 400 },
    );
  }

  try {
    const appointment =
      await getAppointmentForCustomerCancellation(reservationCode);
    if (
      !appointment ||
      appointment.customer_email?.trim().toLocaleLowerCase() !== email
    ) {
      return Response.json(
        { error: "No encontramos una reserva activa con esos datos." },
        { status: 404 },
      );
    }

    if (action === "lookup") {
      return Response.json(
        {
          appointment: {
            reservationCode: appointment.reservation_code,
            appointmentDate: appointment.appointment_date,
            startTime: appointment.start_time,
            durationMinutes: appointment.duration_minutes,
            serviceIds: appointment.service_ids,
            totalPrice: appointment.total_price,
            customerName: appointment.customer_name,
          },
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (appointment.calendar_event_id) {
      await deleteCalendarAppointment(appointment.calendar_event_id);
    }

    const deleted = await deleteAppointmentReservation(appointment.id);
    if (!deleted) {
      return Response.json(
        { error: "El turno ya no se puede cancelar o no existe." },
        { status: 409 },
      );
    }

    return Response.json(
      { cancelled: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("No se pudo cancelar el turno con el código de reserva.", error);
    return Response.json(
      {
        error:
          error instanceof GoogleCalendarIntegrationError
            ? "No se pudo eliminar el evento de Google Calendar. El turno sigue guardado."
            : error instanceof SupabaseRequestError
              ? "No se pudo eliminar la reserva. Intentá nuevamente."
              : "No se pudo cancelar el turno. Intentá nuevamente.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
