import { getArgentinaDateKey } from "@/app/Appoinments/appointmentDates";

const bucket = "appointment-proofs";
const appointmentIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AdminAppointmentReservation = {
  id: string;
  appointment_date: string;
  start_time: string;
  duration_minutes: number;
  service_ids: string[];
  total_price: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  proof_path: string | null;
  status: "pending_review" | "confirmed";
  created_at: string;
};

export class SupabaseRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "SupabaseRequestError";
  }
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  }

  return { url, serviceRoleKey };
}

async function getErrorDetails(response: Response) {
  const responseText = await response.text();

  try {
    const body: unknown = JSON.parse(responseText);

    if (body && typeof body === "object") {
      const details = body as { code?: unknown; message?: unknown };

      return {
        code: typeof details.code === "string" ? details.code : undefined,
        message:
          typeof details.message === "string"
            ? details.message
            : response.statusText,
      };
    }
  } catch {
    return { message: response.statusText };
  }

  return { message: response.statusText };
}

export async function callSupabaseRpc<T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(
    `${url}/rest/v1/rpc/${encodeURIComponent(functionName)}`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const error = await getErrorDetails(response);
    throw new SupabaseRequestError(
      error.message,
      response.status,
      error.code,
    );
  }

  return (await response.json()) as T;
}

export async function getAdminAppointmentReservations() {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const query = new URLSearchParams({
    select:
      "id,appointment_date,start_time,duration_minutes,service_ids,total_price,customer_name,customer_email,customer_phone,proof_path,status,created_at",
    or: `(status.eq.confirmed,and(status.eq.pending_review,expires_at.gt.${new Date().toISOString()}))`,
    appointment_date: `gte.${getArgentinaDateKey(new Date())}`,
    order: "appointment_date.asc,start_time.asc",
    limit: "100",
  });
  const response = await fetch(
    `${url}/rest/v1/appointment_reservations?${query.toString()}`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: "Bearer " + serviceRoleKey,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    const error = await getErrorDetails(response);
    throw new SupabaseRequestError(error.message, response.status, error.code);
  }

  return (await response.json()) as AdminAppointmentReservation[];
}

export async function createAppointmentProofSignedUrl(path: string) {
  const pathSegments = path.split("/");
  if (
    pathSegments.length !== 2 ||
    !appointmentIdPattern.test(pathSegments[0]) ||
    !/^[0-9a-f-]{36}\.(?:jpg|png|webp)$/i.test(pathSegments[1]) ||
    pathSegments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error("La ruta del comprobante no es válida.");
  }

  const { url, serviceRoleKey } = getSupabaseConfig();
  const objectPath = pathSegments.map(encodeURIComponent).join("/");
  const response = await fetch(
    `${url}/storage/v1/object/sign/${bucket}/${objectPath}`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: "Bearer " + serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: 300 }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    const error = await getErrorDetails(response);
    throw new SupabaseRequestError(error.message, response.status, error.code);
  }

  const result = (await response.json()) as { signedURL?: unknown };
  if (typeof result.signedURL !== "string") {
    throw new Error("Supabase no devolvió un enlace seguro para el comprobante.");
  }

  const signedPath = result.signedURL.startsWith("/storage/v1/")
    ? result.signedURL
    : `/storage/v1${result.signedURL.startsWith("/") ? result.signedURL : `/${result.signedURL}`}`;
  const signedUrl = new URL(signedPath, `${url}/`);
  if (
    signedUrl.origin !== new URL(url).origin ||
    !signedUrl.pathname.startsWith(`/storage/v1/object/sign/${bucket}/`)
  ) {
    throw new Error("Supabase devolvió un enlace de comprobante no válido.");
  }

  return signedUrl.toString();
}

export async function updateAdminAppointmentStatus(
  appointmentId: string,
  status: "confirmed" | "cancelled",
) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const query = new URLSearchParams({
    id: `eq.${appointmentId}`,
    status:
      status === "confirmed"
        ? "eq.pending_review"
        : "in.(pending_review,confirmed)",
    ...(status === "confirmed"
      ? { expires_at: `gt.${new Date().toISOString()}` }
      : {}),
    select: "id",
  });
  const response = await fetch(
    `${url}/rest/v1/appointment_reservations?${query.toString()}`,
    {
      method: "PATCH",
      headers: {
        apikey: serviceRoleKey,
        Authorization: "Bearer " + serviceRoleKey,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ status, expires_at: null }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    const error = await getErrorDetails(response);
    throw new SupabaseRequestError(error.message, response.status, error.code);
  }

  const updatedRows = (await response.json()) as Array<{ id: string }>;
  return updatedRows.length > 0;
}

export async function uploadAppointmentProof(
  path: string,
  file: File,
) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const objectPath = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(
    `${url}/storage/v1/object/${bucket}/${objectPath}`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": file.type,
        "x-upsert": "false",
      },
      body: file,
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const error = await getErrorDetails(response);
    throw new SupabaseRequestError(
      error.message,
      response.status,
      error.code,
    );
  }
}

export async function deleteAppointmentProof(path: string) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: [path] }),
    cache: "no-store",
  });

  if (!response.ok) {
    const error = await getErrorDetails(response);
    throw new SupabaseRequestError(
      error.message,
      response.status,
      error.code,
    );
  }
}
