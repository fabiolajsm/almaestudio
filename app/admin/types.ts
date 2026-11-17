import type {
  AppointmentSettings,
  AppointmentService,
  AppointmentServiceCategoryDefinition,
} from "@/app/Appoinments/appointmentCatalog";

export type AdminSection = "services" | "schedule" | "social" | "location";

export interface DaySchedule {
  enabled: boolean;
  openingTime: number;
  closingTime: number;
}

export type DailyScheduleMap = Record<number, DaySchedule>;

export interface SocialSettings {
  instagram?: string;
  whatsapp?: string;
  tiktok?: string;
}

export interface LocationSettings {
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  mapsUrl?: string;
  notes?: string;
}

export type ExtendedAppointmentSettings = AppointmentSettings & {
  dailySchedule?: DailyScheduleMap;
  social?: SocialSettings;
  location?: LocationSettings;
};

export type AdminDashboardProps = {
  initialSettings: AppointmentSettings;
  onSignedOut: (reasonMessage?: string) => void;
};