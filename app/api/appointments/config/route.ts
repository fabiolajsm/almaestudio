import { appointmentDeposit } from "@/app/Appoinments/appointmentCatalog";

export async function GET() {
  const accountHolder = process.env.TRANSFER_ACCOUNT_HOLDER?.trim() || null;
  const alias = process.env.TRANSFER_ALIAS?.trim() || null;
  const cbu = process.env.TRANSFER_CVU?.trim() || null;

  return Response.json(
    {
      accountHolder,
      alias,
      cbu,
      deposit: appointmentDeposit,
      configured: Boolean(accountHolder && (alias || cbu)),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
