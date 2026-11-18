import type {
  AppointmentDailySchedule,
  AppointmentDaySchedule,
  AppointmentLocationSettings,
  AppointmentSettings,
  AppointmentSocialSettings,
} from "@/app/Appoinments/appointmentCatalog";

export type AdminSection = "services" | "schedule" | "social" | "location";

export type DaySchedule = AppointmentDaySchedule;
export type DailyScheduleMap = AppointmentDailySchedule;
export type SocialSettings = AppointmentSocialSettings;
export type LocationSettings = AppointmentLocationSettings;

export type ExtendedAppointmentSettings = AppointmentSettings & {
  dailySchedule?: DailyScheduleMap;
  social?: SocialSettings;
  location?: LocationSettings;
};

export type AdminDashboardProps = {
  initialSettings: AppointmentSettings;
  onSignedOut: (reasonMessage?: string) => void;
};