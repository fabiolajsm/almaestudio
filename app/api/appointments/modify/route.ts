import {
  hasSameOrigin,
  validateAppointmentSelectionInput,
} from "../create/validations";
import {
  getAppointmentForCustomer,
  SupabaseRequestError,
  updateAppointmentReservation,
} from "@/lib/supabaseAdmin";
import {
  GoogleCalendarIntegrationError,
  isAppointmentSlotAvailable,
  updateCalendarAppointment,
} from "@/lib/googleCalendar";
import { appointmentServices } from "@/app/Appoinments/appointmentCatalog";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getServiceNames(serviceIds: string[]) {
  return serviceIds.map(
    (id) => appointmentServices.find((service) => service.id === id)?.name ?? id,
  );
}

function getCalendarUpdate(
  appointment: NonNullable<Awaited<ReturnType<typeof getAppointmentForCustomer>>>,
  date: string,
  time: string,
  durationMinutes: number,
  serviceIds: string[],
) {
  if (!appointment.customer_name) {
    throw new Error("La reserva no tiene un nombre de cliente válido.");
  }

  return {
    appointmentId: appointment.id,
    reservationCode: appointment.reservation_code,
    date,
    time,
    durationMinutes,
    customerName: appointment.customer_name,
    serviceNames: getServiceNames(serviceIds),
  };
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

  if (
    (body.action !== "lookup" && body.action !== "modify") ||
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
    const appointment = await getAppointmentForCustomer(reservationCode);
    if (
      !appointment ||
      appointment.customer_email?.trim().toLocaleLowerCase() !== email
    ) {
      return Response.json(
        { error: "No encontramos una reserva activa con esos datos." },
        { status: 404 },
      );
    }

    if (body.action === "lookup") {
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

    if (
      !appointment.customer_name ||
      !appointment.customer_email ||
      !appointment.customer_phone
    ) {
      return Response.json(
        { error: "No se pudieron validar los datos de esta reserva." },
        { status: 409 },
      );
    }

    const validation = validateAppointmentSelectionInput({
      date: body.date,
      time: body.time,
      serviceIds: body.serviceIds,
    });
    if (!validation.success) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    const updatedAppointment = validation.data;
    if (
      !(await isAppointmentSlotAvailable(
        updatedAppointment.date,
        updatedAppointment.time,
        updatedAppointment.duration,
        {
          appointmentId: appointment.id,
          calendarEventId: appointment.calendar_event_id,
        },
      ))
    ) {
      return Response.json(
        { error: "Ese horario ya no está disponible. Elegí otro, por favor." },
        { status: 409 },
      );
    }

    const currentCalendarUpdate = getCalendarUpdate(
      appointment,
      appointment.appointment_date,
      appointment.start_time.slice(0, 5),
      appointment.duration_minutes,
      appointment.service_ids,
    );
    const newCalendarUpdate = getCalendarUpdate(
      appointment,
      updatedAppointment.date,
      updatedAppointment.time,
      updatedAppointment.duration,
      updatedAppointment.serviceIds,
    );

    await updateCalendarAppointment(newCalendarUpdate);
    try {
      const updated = await updateAppointmentReservation(appointment.id, {
        appointment_date: updatedAppointment.date,
        start_time: `${updatedAppointment.time}:00`,
        duration_minutes: updatedAppointment.duration,
        service_ids: updatedAppointment.serviceIds,
        total_price: updatedAppointment.totalPrice,
      });

      if (!updated) {
        await updateCalendarAppointment(currentCalendarUpdate);
        return Response.json(
          { error: "La reserva ya no está activa. Volvé a buscarla." },
          { status: 409 },
        );
      }
    } catch (error) {
      try {
        await updateCalendarAppointment(currentCalendarUpdate);
      } catch (rollbackError) {
        console.error(
          "No se pudo restaurar el evento de Calendar después de fallar la modificación.",
          rollbackError,
        );
      }

      if (error instanceof SupabaseRequestError && error.code === "23P01") {
        return Response.json(
          { error: "Ese horario se superpone con otro turno. Elegí otro." },
          { status: 409 },
        );
      }
      throw error;
    }

    return Response.json(
      { modified: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("No se pudo modificar el turno.", error);
    return Response.json(
      {
        error:
          error instanceof GoogleCalendarIntegrationError
            ? "No se pudo actualizar el evento de Google Calendar. El turno no se modificó."
            : error instanceof SupabaseRequestError
              ? "No se pudo guardar la modificación. Intentá nuevamente."
              : "No se pudo modificar el turno. Intentá nuevamente.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
