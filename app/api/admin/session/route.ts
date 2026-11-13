import {
  clearAdminSessionCookie,
  clearLegacyAdminSessionCookie,
  createAdminSessionCookie,
  hasSameOrigin,
  isAdminPasswordConfigured,
  isValidAdminPassword,
} from "@/lib/adminSession";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Solicitud no válida." }, { status: 403 });
  }

  if (!isAdminPasswordConfigured()) {
    return Response.json(
      { error: "El acceso de administración todavía no está configurado." },
      { status: 503 },
    );
  }

  let body: { password?: unknown };
  try {
    const bodyText = await request.text();
    if (Buffer.byteLength(bodyText) > 4096) {
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

    body = parsedBody as { password?: unknown };
  } catch {
    return Response.json({ error: "El pedido no tiene un formato válido." }, { status: 400 });
  }

  if (typeof body.password !== "string" || !isValidAdminPassword(body.password)) {
    return Response.json(
      { error: "La contraseña no es correcta." },
      { status: 401 },
    );
  }

  try {
    const headers = new Headers({ "Cache-Control": "no-store" });
    headers.append("Set-Cookie", createAdminSessionCookie());
    headers.append("Set-Cookie", clearLegacyAdminSessionCookie());

    return Response.json(
      { authenticated: true },
      { headers },
    );
  } catch (error) {
    console.error("No se pudo crear la sesión de administración.", error);
    return Response.json(
      { error: "No se pudo iniciar sesión. Revisá la configuración del panel." },
      { status: 503 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: "Solicitud no válida." }, { status: 403 });
  }

  const headers = new Headers({ "Cache-Control": "no-store" });
  headers.append("Set-Cookie", clearAdminSessionCookie());
  headers.append("Set-Cookie", clearLegacyAdminSessionCookie());

  return Response.json(
    { authenticated: false },
    { headers },
  );
}
