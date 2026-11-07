import { hasSameOrigin } from "@/lib/adminSession";
import {
  getAdminAppointmentReservations,
  SupabaseRequestError,
  updateAdminAppointmentStatus,
} from "@/lib/supabaseAdmin";
import { requireAdmin } from "./authorization";

export const runtime = "nodejs";

const appointmentIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const authError = requireAdmin(request);
  if (authError) {
    return authError;
  }

  try {
    const reservations = await getAdminAppointmentReservations();

    return Response.json(
      { appointments: reservations },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("No se pudieron cargar las reservas del panel.", error);
    return Response.json(
      {
        error:
          error instanceof SupabaseRequestError
            ? "No se pudieron cargar las reservas. Verificá la conexión con Supabase."
            : "No se pudieron cargar las reservas.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function PATCH(request: Request) {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Solicitud no válida." }, { status: 403 });
  }

  const authError = requireAdmin(request);
  if (authError) {
    return authError;
  }

  let body: { appointmentId?: unknown; action?: unknown };
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

    body = parsedBody as {
      appointmentId?: unknown;
      action?: unknown;
    };
  } catch {
    return Response.json({ error: "El pedido no tiene un formato válido." }, { status: 400 });
  }

  if (
    typeof body.appointmentId !== "string" ||
    !appointmentIdPattern.test(body.appointmentId) ||
    body.action !== "confirm"
  ) {
    return Response.json({ error: "La acción no es válida." }, { status: 400 });
  }

  try {
    const updated = await updateAdminAppointmentStatus(
      body.appointmentId,
      "confirmed",
    );

    if (!updated) {
      return Response.json(
        { error: "La reserva ya no está pendiente o no existe." },
        { status: 409 },
      );
    }

    return Response.json(
      { updated: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("No se pudo actualizar el estado de la reserva.", error);
    return Response.json(
      {
        error: "No se pudo actualizar la reserva. Intentá nuevamente.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
