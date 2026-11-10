import { createWebhookHandler } from "talo-pay";
import type { PaymentResponse } from "talo-pay";
import { appointmentServices } from "@/app/Appoinments/appointmentCatalog";
import { appointmentDepositAmount } from "@/lib/appointmentPayment";
import { createCalendarAppointment } from "@/lib/googleCalendar";
import {
  getAppointmentPayment,
  saveAppointmentPayment,
} from "@/lib/supabaseAdmin";
import { getTaloConfig } from "@/lib/talo";

export const runtime = "nodejs";

const appointmentIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function handlePaymentUpdate(
  event: { externalId: string; paymentId: string },
  payment: PaymentResponse,
) {
  const config = getTaloConfig();
  if (!appointmentIdPattern.test(event.externalId)) {
    throw new Error("Talo notificó una reserva con un identificador inválido.");
  }

  const appointment = await getAppointmentPayment(event.externalId);
  if (
    !appointment ||
    appointment.talo_payment_id !== payment.id ||
    event.paymentId !== payment.id ||
    payment.external_id !== appointment.id ||
    (payment.user_id && payment.user_id !== config.userId)
  ) {
    throw new Error("Talo notificó un pago que no coincide con la reserva.");
  }

  const expectedAmount = appointment.payment_amount ?? appointmentDepositAmount;
  const paymentAmount = payment.price?.amount;
  if (
    typeof paymentAmount !== "number" ||
    paymentAmount !== expectedAmount ||
    payment.price?.currency !== "ARS"
  ) {
    throw new Error("El importe o la moneda del pago de Talo no coinciden.");
  }

  if (payment.payment_status === "SUCCESS" && appointment.status !== "cancelled") {
    const serviceNames = appointmentServices
      .filter((service) => appointment.service_ids.includes(service.id))
      .map((service) => service.name);
    await createCalendarAppointment({
      appointmentId: appointment.id,
      date: appointment.appointment_date,
      time: appointment.start_time.slice(0, 5),
      durationMinutes: appointment.duration_minutes,
      customerName: appointment.customer_name,
      serviceNames,
    });
  } else if (payment.payment_status === "SUCCESS") {
    console.error(
      "Talo acreditó un pago de una reserva cancelada; requiere revisión manual.",
      { appointmentId: appointment.id },
    );
  }

  await saveAppointmentPayment({
    appointmentId: appointment.id,
    paymentId: payment.id,
    paymentUrl: payment.payment_url ?? null,
    paymentStatus: payment.payment_status,
    paymentAmount,
    paymentExpiresAt: payment.expiration_timestamp ?? null,
  });
}

let handler: ReturnType<typeof createWebhookHandler> | null = null;

export async function POST(request: Request) {
  try {
    handler ??= createWebhookHandler(getTaloConfig(), {
      onPaymentUpdated: async ({ event, payment }) => {
        try {
          await handlePaymentUpdate(event, payment);
        } catch (error) {
          console.error("Falló la actualización del pago notificada por Talo.", error);
          throw error;
        }
      },
    });

    return await handler(request);
  } catch (error) {
    console.error("No se pudo procesar la notificación de pago de Talo.", error);
    return Response.json(
      { error: "No se pudo procesar la notificación de Talo." },
      { status: 503 },
    );
  }
}
