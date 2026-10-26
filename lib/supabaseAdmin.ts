const bucket = "appointment-proofs";

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
