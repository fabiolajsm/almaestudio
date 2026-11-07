import { hasSameOrigin } from "@/lib/adminSession";
import {
  getAppointmentCalendarEventId,
  SupabaseRequestError,
  updateAdminAppointmentStatus,
} from "@/lib/supabaseAdmin";
import {
  deleteCalendarAppointment,
  GoogleCalendarIntegrationError,
} from "@/lib/googleCalendar";
import { requireAdmin } from "@/app/api/admin/appointments/authorization";

const appointmentIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Solicitud no válida." }, { status: 403 });
  }

  const authError = requireAdmin(request);
  if (authError) {
    return authError;
  }

  let body: { appointmentId?: unknown };
  try {
    const bodyText = await request.text();
    if (Buffer.byteLength(bodyText) > 1024) {
      return Response.json(
        { error: "La solicitud es demasiado grande." },
        { status: 413 },
      );
    }

    const parsedBody: unknown = JSON.parse(bodyText);
    if (
      !parsedBody ||
      typeof parsedBody !== "object" ||
      Array.isArray(parsedBody)
    ) {
      return Response.json(
        { error: "El pedido no tiene un formato válido." },
        { status: 400 },
      );
    }

    body = parsedBody as { appointmentId?: unknown };
  } catch {
    return Response.json(
      { error: "El pedido no tiene un formato válido." },
      { status: 400 },
    );
  }

  if (
    typeof body.appointmentId !== "string" ||
    !appointmentIdPattern.test(body.appointmentId)
  ) {
    return Response.json({ error: "El turno no es válido." }, { status: 400 });
  }

  try {
    const calendarEventId = await getAppointmentCalendarEventId(
      body.appointmentId,
    );
    if (calendarEventId) {
      await deleteCalendarAppointment(calendarEventId);
    }

    const cancelled = await updateAdminAppointmentStatus(
      body.appointmentId,
      "cancelled",
    );

    if (!cancelled) {
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
    console.error("No se pudo cancelar el turno.", error);
    return Response.json(
      {
        error:
          error instanceof GoogleCalendarIntegrationError &&
          error.code === "not_configured"
            ? "Google Calendar no está configurado para eliminar el evento."
            : error instanceof SupabaseRequestError
              ? "No se pudo actualizar el turno. Intentá nuevamente."
              : "No se pudo cancelar el turno. Intentá nuevamente.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
