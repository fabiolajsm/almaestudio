import {
  expirePendingAppointmentPayments,
  getAppointmentPayment,
} from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const appointmentIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const appointmentId = new URL(request.url).searchParams.get("id") ?? "";
  if (!appointmentIdPattern.test(appointmentId)) {
    return Response.json(
      { error: "El identificador del turno no es válido." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    await expirePendingAppointmentPayments();
    const appointment = await getAppointmentPayment(appointmentId);
    if (!appointment) {
      return Response.json(
        { error: "No se encontró el turno." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    return Response.json(
      {
        status: appointment.status,
        reservation_status: appointment.status,
        payment_status:
          appointment.status === "cancelled" &&
          appointment.payment_status !== "SUCCESS"
            ? "EXPIRED"
            : appointment.payment_status ?? "PENDING",
        payment_expires_at: appointment.payment_expires_at,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("No se pudo consultar el estado del pago.", error);
    return Response.json(
      { error: "No se pudo consultar el estado del pago." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
