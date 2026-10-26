import {
  appointmentDeposit,
} from "@/app/Appoinments/appointmentCatalog";
import {
  callSupabaseRpc,
  deleteAppointmentProof,
  SupabaseRequestError,
  uploadAppointmentProof,
} from "@/lib/supabaseAdmin";

const maxProofSize = 5 * 1024 * 1024;
const holdIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{ holdId: string }>;
};

function hasSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

function getImageExtension(file: File) {
  if (file.type !== "image/jpeg" && file.type !== "image/png" && file.type !== "image/webp") {
    return null;
  }

  return file.type === "image/jpeg"
    ? "jpg"
    : file.type === "image/png"
      ? "png"
      : "webp";
}

async function hasValidImageSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (file.type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (file.type === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  return (
    file.type === "image/webp" &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  );
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "No se pudo leer el formulario." }, { status: 400 });
  }

  const name = formData.get("name");
  const email = formData.get("email");
  const phone = formData.get("phone");
  const proof = formData.get("proof");

  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 100 ||
    typeof email !== "string" ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof phone !== "string" ||
    phone.trim().length < 8 ||
    phone.trim().length > 30
  ) {
    return Response.json(
      { error: "Revisá tu nombre y tus datos de contacto." },
      { status: 400 },
    );
  }

  if (!(proof instanceof File) || proof.size === 0) {
    return Response.json(
      { error: "Adjuntá la imagen del comprobante." },
      { status: 400 },
    );
  }

  const extension = getImageExtension(proof);
  if (
    !extension ||
    proof.size > maxProofSize ||
    !(await hasValidImageSignature(proof))
  ) {
    return Response.json(
      {
        error:
          "El comprobante debe ser una imagen JPG, PNG o WEBP de hasta 5 MB.",
      },
      { status: 400 },
    );
  }

  const proofPath = `${holdId}/${crypto.randomUUID()}.${extension}`;

  try {
    await uploadAppointmentProof(proofPath, proof);
  } catch (error) {
    console.error("No se pudo guardar el comprobante.", error);
    return Response.json(
      { error: "No se pudo subir el comprobante. Intentá nuevamente." },
      { status: 503 },
    );
  }

  try {
    const confirmed = await callSupabaseRpc<boolean>(
      "submit_appointment_proof",
      {
        p_hold_id: holdId,
        p_customer_name: name.trim(),
        p_customer_email: email.trim(),
        p_customer_phone: phone.trim(),
        p_proof_path: proofPath,
        p_deposit_amount: appointmentDeposit,
      },
    );

    if (!confirmed) {
      await deleteAppointmentProof(proofPath);
      return Response.json(
        { error: "El tiempo para completar la reserva venció. Elegí otro horario." },
        { status: 409 },
      );
    }

    return Response.json({ status: "pending_review" }, { status: 201 });
  } catch (error) {
    try {
      await deleteAppointmentProof(proofPath);
    } catch (cleanupError) {
      console.error("No se pudo borrar el comprobante huérfano.", cleanupError);
    }

    if (error instanceof SupabaseRequestError && error.code === "P0001") {
      return Response.json(
        { error: "El tiempo para completar la reserva venció. Elegí otro horario." },
        { status: 409 },
      );
    }

    console.error("No se pudo confirmar el comprobante de la reserva.", error);
    return Response.json(
      { error: "No se pudo completar la reserva. Intentá nuevamente." },
      { status: 503 },
    );
  }
}
