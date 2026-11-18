import type { ReactNode } from "react";
import type {
  AppointmentLookupCredentials,
  AppointmentService,
  AppointmentServiceCategoryDefinition,
  AppointmentSettings,
} from "@/app/types";
import type { AppointmentTimeSlot } from "@/lib/googleCalendar";

export type AppointmentHeaderProps = {
  actionLabel: string;
  title: string;
  description?: string | ReactNode;
  backHref?: string;
  showBackButton?: boolean;
};

export type SuccessStateProps = {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  actionLabel?: string;
  actionHref?: string;
  variant?: "success" | "danger";
};

export type TurnSummaryProps = {
  services: AppointmentService[];
  selectedDate: string | null;
  selectedTime: string | null;
  durationMinutes?: number;
  totalPrice?: number;
};

export type AppointmentSearchResult = {
  reservationCode: number;
  appointmentDate: string;
  startTime: string;
  durationMinutes: number;
  serviceIds: string[];
  totalPrice: number;
  customerName: string | null;
};

export type AppointmentSearchCredentials = AppointmentLookupCredentials;

export type SearchAppointmentProps = {
  categories: AppointmentServiceCategoryDefinition[];
  services: AppointmentService[];
  onAppointmentFound: (
    appointment: AppointmentSearchResult,
    credentials: AppointmentSearchCredentials,
  ) => void;
  onSearchAnother?: () => void;
};

export type AppointmentSearchApiResult = {
  error?: unknown;
  appointment?: unknown;
};

export type AppointmentScheduleProps = {
  today: string;
  serviceDuration: number;
  settings: AppointmentSettings;
  selectedDate: string | null;
  selectedTime: string | null;
  appointmentLookup?: AppointmentSearchCredentials;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
  showHeading?: boolean;
};

export type AvailabilityState =
  | {
      key: string;
      status: "success";
      timeSlots: Record<string, AppointmentTimeSlot[]>;
      hasShorterServiceAvailability: Record<string, boolean>;
    }
  | { key: string; status: "error"; message: string };

export type AppointmentApiError = {
  error?: unknown;
};

export type CreateAppointmentApiResult = AppointmentApiError & {
  status?: string;
  appointment_id?: string;
  reservation_code?: number;
};

export type ModifyAppointmentApiResult = AppointmentApiError & {
  modified?: unknown;
};

export type CancelAppointmentApiResult = AppointmentApiError & {
  cancelled?: unknown;
};
