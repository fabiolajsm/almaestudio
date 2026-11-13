import { getAppointmentSettings } from "@/lib/appointmentSettings";

export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json(await getAppointmentSettings(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("No se pudo cargar la configuración de turnos.", error);
    return Response.json(
      { error: "No se pudo cargar la configuración de turnos." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
