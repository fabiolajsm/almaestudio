import {
  appointmentServices,
  availableAppointmentTimes,
} from "@/app/Appoinments/appointmentCatalog";
import { getArgentinaDateKey } from "@/app/Appoinments/appointmentDates";
import {
  callSupabaseRpc,
  SupabaseRequestError,
} from "@/lib/supabaseAdmin";

type HoldRequest = {
  date?: unknown;
  time?: unknown;
  serviceIds?: unknown;
};

type HoldResult = {
  hold_id: string;
  expires_at: string;
};

function hasSameOrigin(request: Request) {
  const origin = request.headers.get("origin");

  return origin !== null && origin === new URL(request.url).origin;
}

function isValidDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date &&
    date >= getArgentinaDateKey(new Date()) &&
    parsed.getUTCDay() !== 0
  );
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Solicitud no válida." }, { status: 403 });
  }

  const accountHolder = process.env.TRANSFER_ACCOUNT_HOLDER?.trim();
  const transferAlias = process.env.TRANSFER_ALIAS?.trim();
  const transferCvu = process.env.TRANSFER_CVU?.trim();

  if (!accountHolder || (!transferAlias && !transferCvu)) {
    return Response.json(
      { error: "La información de pago todavía no está configurada." },
      { status: 503 },
    );
  }

  let body: HoldRequest;
  try {
    body = (await request.json()) as HoldRequest;
  } catch {
    return Response.json({ error: "El pedido no tiene un formato válido." }, { status: 400 });
  }

  const date = typeof body.date === "string" ? body.date : "";
  const time = typeof body.time === "string" ? body.time : "";

  if (!isValidDate(date) || !availableAppointmentTimes.includes(time)) {
    return Response.json(
      { error: "Elegí una fecha y un horario disponibles." },
      { status: 400 },
    );
  }

  if (
    !Array.isArray(body.serviceIds) ||
    body.serviceIds.length === 0 ||
    body.serviceIds.some((id) => typeof id !== "string") ||
    new Set(body.serviceIds).size !== body.serviceIds.length
  ) {
    return Response.json(
      { error: "Elegí al menos un servicio válido." },
      { status: 400 },
    );
  }

  const serviceIds = body.serviceIds as string[];
  const selectedServices = appointmentServices.filter((service) =>
    serviceIds.includes(service.id),
  );

  if (selectedServices.length !== serviceIds.length) {
    return Response.json(
      { error: "La selección de servicios no es válida." },
      { status: 400 },
    );
  }

  const duration = selectedServices.reduce(
    (total, service) => total + service.duration,
    0,
  );
  const totalPrice = selectedServices.reduce(
    (total, service) => total + service.price,
    0,
  );

  try {
    const [hold] = await callSupabaseRpc<HoldResult[]>(
      "create_appointment_hold",
      {
        p_appointment_date: date,
        p_start_time: time,
        p_service_ids: serviceIds,
        p_duration_minutes: duration,
        p_total_price: totalPrice,
      },
    );

    if (!hold?.hold_id || !hold.expires_at) {
      throw new Error("Supabase devolvió una reserva incompleta.");
    }

    return Response.json(hold, { status: 201 });
  } catch (error) {
    if (error instanceof SupabaseRequestError && error.code === "23P01") {
      return Response.json(
        { error: "Ese horario acaba de ser reservado. Elegí otro, por favor." },
        { status: 409 },
      );
    }

    console.error("No se pudo retener el horario de la reserva.", error);
    return Response.json(
      { error: "No se pudo reservar el horario. Intentá nuevamente." },
      { status: 503 },
    );
  }
}
