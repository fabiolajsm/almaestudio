import {
  callSupabaseRpc,
  SupabaseRequestError,
} from "@/lib/supabaseAdmin";

const holdIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{ holdId: string }>;
};

type BookingRequest = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
};

function hasSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Solicitud no válida." }, { status: 403 });
  }

  const { holdId } = await context.params;
  if (!holdIdPattern.test(holdId)) {
    return Response.json({ error: "La reserva no es válida." }, { status: 400 });
  }

  try {
    await callSupabaseRpc<boolean>("release_appointment_hold", {
      p_hold_id: holdId,
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("No se pudo liberar el horario retenido.", error);
    return Response.json(
      { error: "No se pudo liberar el horario. Volvé a intentar." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Solicitud no válida." }, { status: 403 });
  }

  const { holdId } = await context.params;
  if (!holdIdPattern.test(holdId)) {
    return Response.json({ error: "La reserva no es válida." }, { status: 400 });
  }

  let body: BookingRequest;
  try {
    const parsedBody: unknown = await request.json();
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

    body = parsedBody as BookingRequest;
  } catch {
    return Response.json(
      { error: "El pedido no tiene un formato válido." },
      { status: 400 },
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";

  if (
    name.length < 2 ||
    name.length > 100 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    phone.length < 8 ||
    phone.length > 30
  ) {
    return Response.json(
      { error: "Revisá tu nombre y tus datos de contacto." },
      { status: 400 },
    );
  }

  try {
    const submitted = await callSupabaseRpc<boolean>(
      "submit_appointment_booking",
      {
        p_hold_id: holdId,
        p_customer_name: name,
        p_customer_email: email,
        p_customer_phone: phone,
      },
    );

    if (!submitted) {
      return Response.json(
        { error: "El tiempo para completar la reserva venció. Elegí otro horario." },
        { status: 409 },
      );
    }

    return Response.json({ status: "pending_review" }, { status: 201 });
  } catch (error) {
    if (error instanceof SupabaseRequestError && error.code === "P0001") {
      return Response.json(
        { error: "El tiempo para completar la reserva venció. Elegí otro horario." },
        { status: 409 },
      );
    }

    console.error("No se pudo completar la reserva.", error);
    return Response.json(
      { error: "No se pudo completar la reserva. Intentá nuevamente." },
      { status: 503 },
    );
  }
}
