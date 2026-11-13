import { hasSameOrigin } from "@/lib/adminSession";
import {
  getAppointmentSettings,
  saveAppointmentSettings,
} from "@/lib/appointmentSettings";
import { SupabaseRequestError } from "@/lib/supabaseAdmin";
import { requireAdmin } from "../appointments/authorization";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authError = requireAdmin(request);
  if (authError) {
    return authError;
  }

  try {
    return Response.json(await getAppointmentSettings(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("No se pudo cargar la configuración del panel.", error);
    return Response.json(
      {
        error:
          error instanceof SupabaseRequestError
            ? "No se pudo cargar la configuración. Verificá la conexión con Supabase."
            : "No se pudo cargar la configuración del panel.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function PUT(request: Request) {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Solicitud no válida." }, { status: 403 });
  }

  const authError = requireAdmin(request);
  if (authError) {
    return authError;
  }

  let body: unknown;
  try {
    const bodyText = await request.text();
    if (Buffer.byteLength(bodyText) > 32_768) {
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

  try {
    const settings = await saveAppointmentSettings(body);
    if (!settings) {
      return Response.json(
        { error: "Revisá los servicios y horarios ingresados." },
        { status: 400 },
      );
    }

    return Response.json(settings, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("No se pudo guardar la configuración del panel.", error);
    return Response.json(
      {
        error:
          error instanceof SupabaseRequestError
            ? "No se pudo guardar la configuración. Verificá la conexión con Supabase."
            : "No se pudo guardar la configuración.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
