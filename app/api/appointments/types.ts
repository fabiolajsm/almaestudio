import type { AppointmentContact } from "@/app/types";

export type CreateAppointmentInput = {
  date: string;
  time: string;
  serviceIds: string[];
  duration: number;
  totalPrice: number;
  customer: AppointmentContact;
};

export type AppointmentSelectionInput = {
  date: string;
  time: string;
  serviceIds: string[];
  duration: number;
  totalPrice: number;
};

export type CreateAppointmentResult = {
  appointment_id: string;
  reservation_code: number;
};
