import { connection } from "next/server";
import {
  getArgentinaDateKey,
  getNextAppointmentDate,
} from "../appointmentDates";
import ModifyAppointmentClient from "./ModifyAppointmentClient";

export default async function ModifyAppointmentPage() {
  await connection();
  const today = getArgentinaDateKey(new Date());
  const initialDate = getNextAppointmentDate(today);

  return <ModifyAppointmentClient today={today} initialDate={initialDate} />;
}
