import {
  hasValidAdminSession,
  isAdminPasswordConfigured,
} from "@/lib/adminSession";

export function requireAdmin(request: Request) {
  if (!isAdminPasswordConfigured()) {
    return Response.json(
      { error: "El acceso de administración todavía no está configurado." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!hasValidAdminSession(request)) {
    return Response.json(
      { error: "Iniciá sesión para continuar." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  return null;
}
