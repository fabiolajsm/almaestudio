import { randomUUID } from "node:crypto";
import {
  callSupabaseRpc,
  getAppointmentReservation,
  SupabaseRequestError,
  saveAppointmentPayment,
} from "@/lib/supabaseAdmin";
import {
  GoogleCalendarIntegrationError,
  createCalendarAppointment,
  getCalendarEventId,
  isAppointmentSlotAvailable,
} from "@/lib/googleCalendar";
import { appointmentServices } from "@/app/Appoinments/appointmentCatalog";
import { appointmentDepositAmount } from "@/lib/appointmentPayment";
import {
  getTaloClient,
  getTaloConfig,
  TaloConfigurationError,
} from "@/lib/talo";
import {
  hasSameOrigin,
  validateCreateAppointmentInput,
} from "./validations";

type CreateAppointmentResult = {
  appointment_id: string;
};

function matchesExistingAppointment(
  existing: NonNullable<Awaited<ReturnType<typeof getAppointmentReservation>>>,
  appointment: {
    serviceIds: string[];
    duration: number;
    totalPrice: number;
    customer: { name: string; email: string; phone: string };
  },
) {
  return (
    existing.duration_minutes === appointment.duration &&
    existing.total_price === appointment.totalPrice &&
    existing.customer_name?.trim().toLocaleLowerCase() ===
      appointment.customer.name.toLocaleLowerCase() &&
    existing.customer_email?.trim().toLocaleLowerCase() ===
      appointment.customer.email.toLocaleLowerCase() &&
    existing.customer_phone?.trim() === appointment.customer.phone &&
    existing.service_ids.length === appointment.serviceIds.length &&
    appointment.serviceIds.every((id) => existing.service_ids.includes(id))
  );
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Solicitud no válida." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "El pedido no tiene un formato válido." },
      { status: 400 },
    );
  }

  const validation = validateCreateAppointmentInput(body);
  if (!validation.success) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const {
    date,
    time,
    serviceIds,
    duration,
    totalPrice,
    customer,
  } = validation.data;
  try {
    const taloConfig = getTaloConfig();
    let existingAppointment = await getAppointmentReservation(date, time);
    let isRetry = existingAppointment !== null;

    if (
      existingAppointment &&
      !matchesExistingAppointment(existingAppointment, {
        serviceIds,
        duration,
        totalPrice,
        customer,
      })
    ) {
      return Response.json(
        { error: "Ese horario ya no está disponible. Elegí otro, por favor." },
        { status: 409 },
      );
    }

    if (
      existingAppointment &&
      existingAppointment.payment_status === null &&
      existingAppointment.payment_expires_at === null
    ) {
      return Response.json(
        {
          error:
            "Ese turno ya estaba reservado antes de habilitar los pagos. Contactanos para confirmar su estado.",
        },
        { status: 409 },
      );
    }

    let appointmentId = existingAppointment?.id;

    if (!appointmentId) {
      if (!(await isAppointmentSlotAvailable(date, time, duration))) {
        return Response.json(
          { error: "Ese horario ya no está disponible. Elegí otro, por favor." },
          { status: 409 },
        );
      }

      const newAppointmentId = randomUUID();
      const calendarEventId = getCalendarEventId(newAppointmentId);
      let appointment: CreateAppointmentResult | undefined;

      try {
        [appointment] = await callSupabaseRpc<CreateAppointmentResult[]>(
          "createAppoinment",
          {
            p_appointment_id: newAppointmentId,
            p_appointment_date: date,
            p_start_time: time,
            p_service_ids: serviceIds,
            p_duration_minutes: duration,
            p_total_price: totalPrice,
            p_customer_name: customer.name,
            p_customer_email: customer.email,
            p_customer_phone: customer.phone,
            p_calendar_event_id: calendarEventId,
          },
        );
      } catch (error) {
        if (!(error instanceof SupabaseRequestError) || error.code !== "23P01") {
          throw error;
        }

        existingAppointment = await getAppointmentReservation(date, time);
        if (
          !existingAppointment ||
          !matchesExistingAppointment(existingAppointment, {
            serviceIds,
            duration,
            totalPrice,
            customer,
          })
        ) {
          throw error;
        }

        appointmentId = existingAppointment.id;
        isRetry = true;
      }

      if (!appointmentId) {
        if (appointment?.appointment_id !== newAppointmentId) {
          throw new Error("Supabase no confirmó la creación del turno.");
        }
        appointmentId = newAppointmentId;
      }
    }

    if (
      existingAppointment &&
      existingAppointment.calendar_event_id !== getCalendarEventId(appointmentId)
    ) {
      throw new Error("El ID del evento guardado no coincide con el turno.");
    }

    const serviceNames = appointmentServices
      .filter((service) => serviceIds.includes(service.id))
      .map((service) => service.name);
    const [firstName, ...lastName] = customer.name.split(/\s+/);
    const payment = await getTaloClient().payments.create({
      user_id: taloConfig.userId,
      price: { amount: appointmentDepositAmount, currency: "ARS" },
      payment_options: ["transfer"],
      external_id: appointmentId,
      webhook_url: taloConfig.webhookUrl,
      motive: `Seña de turno: ${serviceNames.join(", ")}`,
      client_data: {
        first_name: firstName,
        last_name: lastName.join(" "),
        email: customer.email,
        phone: customer.phone,
      },
    });

    const expirationTime = payment.expiration_timestamp
      ? Date.parse(payment.expiration_timestamp)
      : Number.NaN;
    const paymentUrl = payment.payment_url;
    const responseAmount = payment.price?.amount;
    if (
      !paymentUrl ||
      !Number.isFinite(expirationTime) ||
      (payment.payment_status !== "SUCCESS" && expirationTime <= Date.now()) ||
      (payment.external_id && payment.external_id !== appointmentId) ||
      (payment.user_id && payment.user_id !== taloConfig.userId) ||
      (payment.price &&
        (payment.price.currency !== "ARS" ||
          responseAmount !== appointmentDepositAmount))
    ) {
      throw new Error("Talo devolvió datos de pago incompletos o inconsistentes.");
    }

    await saveAppointmentPayment({
      appointmentId,
      paymentId: payment.id,
      paymentUrl,
      paymentStatus: payment.payment_status,
      paymentAmount:
        typeof responseAmount === "number"
          ? responseAmount
          : appointmentDepositAmount,
      paymentExpiresAt: payment.expiration_timestamp ?? null,
    });

    if (payment.payment_status === "SUCCESS") {
      await createCalendarAppointment({
        appointmentId,
        date,
        time,
        durationMinutes: duration,
        customerName: customer.name,
        serviceNames,
      });
    }

    return Response.json(
      {
        status:
          payment.payment_status === "SUCCESS"
            ? "payment_success"
            : "payment_pending",
        appointment_id: appointmentId,
        payment_url: paymentUrl,
        payment_expires_at: payment.expiration_timestamp,
        payment_status: payment.payment_status,
      },
      { status: isRetry ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof TaloConfigurationError) {
      return Response.json(
        {
          error:
            "La conexión con Talo no está configurada. Contactanos para completar la reserva.",
        },
        { status: 503 },
      );
    }

    if (error instanceof GoogleCalendarIntegrationError) {
      if (error.code === "unavailable") {
        console.error(
          "No se pudo completar la operación con Google Calendar.",
          error,
        );
      }

      return Response.json(
        {
          error:
            error.code === "not_configured"
              ? "La conexión con Google Calendar todavía no está configurada."
              : "El turno se guardó, pero no se pudo crear su evento en Google Calendar. Contactanos para resolverlo.",
        },
        { status: 503 },
      );
    }

    if (error instanceof SupabaseRequestError && error.code === "23P01") {
      return Response.json(
        { error: "Ese horario acaba de ser reservado. Elegí otro, por favor." },
        { status: 409 },
      );
    }

    console.error("No se pudo completar la creación del turno.", error);
    return Response.json(
      {
        error:
          "No se pudo iniciar el pago. El horario quedó reservado; intentá enviar los mismos datos nuevamente.",
      },
      { status: 503 },
    );
  }
}
