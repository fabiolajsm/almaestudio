import { randomUUID } from "node:crypto";
import {
  callSupabaseRpc,
  getAppointmentReservation,
  SupabaseRequestError,
} from "@/lib/supabaseAdmin";
import {
  GoogleCalendarIntegrationError,
  createCalendarAppointment,
  getCalendarEventId,
  isAppointmentSlotAvailable,
} from "@/lib/googleCalendar";
import { getAppointmentSettings } from "@/lib/appointmentSettings";
import {
  hasSameOrigin,
  validateCreateAppointmentInput,
} from "./validations";

type CreateAppointmentResult = {
  appointment_id: string;
  reservation_code: number;
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

  let settings: Awaited<ReturnType<typeof getAppointmentSettings>>;
  try {
    settings = await getAppointmentSettings();
  } catch (error) {
    console.error("No se pudo validar la configuración de turnos.", error);
    return Response.json(
      { error: "No se pudo consultar la configuración de turnos." },
      { status: 503 },
    );
  }

  const validation = validateCreateAppointmentInput(body, settings);
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

    let appointmentId = existingAppointment?.id;
    let reservationCode = existingAppointment?.reservation_code;

    if (!appointmentId) {
      if (!(await isAppointmentSlotAvailable(date, time, duration, settings))) {
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
        reservationCode = existingAppointment.reservation_code;
        isRetry = true;
      }

      if (!appointmentId) {
        if (
          !appointment ||
          appointment.appointment_id !== newAppointmentId ||
          !Number.isSafeInteger(appointment.reservation_code) ||
          appointment.reservation_code <= 0
        ) {
          throw new Error("Supabase no confirmó la creación del turno.");
        }
        appointmentId = newAppointmentId;
        reservationCode = appointment.reservation_code;
      }
    }

    if (
      typeof reservationCode !== "number" ||
      !Number.isSafeInteger(reservationCode) ||
      reservationCode <= 0
    ) {
      throw new Error("Supabase no devolvió un código de reserva válido.");
    }

    if (
      existingAppointment &&
      existingAppointment.calendar_event_id !== getCalendarEventId(appointmentId)
    ) {
      throw new Error("El ID del evento guardado no coincide con el turno.");
    }

    const serviceNames = settings.services
      .filter((service) => serviceIds.includes(service.id))
      .map((service) => service.name);
    await createCalendarAppointment({
      appointmentId,
      reservationCode,
      date,
      time,
      durationMinutes: duration,
      customerName: customer.name,
      serviceNames,
    });

    return Response.json(
      {
        status: "confirmed",
        appointment_id: appointmentId,
        reservation_code: reservationCode,
      },
      { status: isRetry ? 200 : 201 },
    );
  } catch (error) {
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
        {
          error:
            "Ese horario se superpone con otro turno o ya no está disponible. Volvé a consultar la agenda y elegí otro horario.",
        },
        { status: 409 },
      );
    }

    console.error("No se pudo completar la creación del turno.", error);
    return Response.json(
      {
        error: "No se pudo completar la reserva. Intentá nuevamente.",
      },
      { status: 503 },
    );
  }
}
