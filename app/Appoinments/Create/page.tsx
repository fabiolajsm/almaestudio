import { connection } from "next/server";
import { getArgentinaDateKey } from "../appointmentDates";
import CreateAppointmentClient from "./CreateAppointmentClient";

export default async function CreateAppointmentPage() {
  await connection();
  const today = getArgentinaDateKey(new Date());

  return <CreateAppointmentClient today={today} />;
}
