import type {
  AppointmentDailySchedule,
  AppointmentDaySchedule,
  ExtendedAppointmentSettings as SharedExtendedAppointmentSettings,
  AppointmentLocationSettings,
  AppointmentSettings,
  AppointmentSocialSettings,
  AppointmentService,
  AppointmentServiceCategoryDefinition,
} from "@/app/types";

export type AdminSection = "services" | "schedule" | "social" | "location";

export type DaySchedule = AppointmentDaySchedule;
export type DailyScheduleMap = AppointmentDailySchedule;
export type SocialSettings = AppointmentSocialSettings;
export type LocationSettings = AppointmentLocationSettings;

export type ExtendedAppointmentSettings = SharedExtendedAppointmentSettings;

export type AdminDashboardProps = {
  initialSettings: AppointmentSettings;
  onSignedOut: (reasonMessage?: string) => void;
};

export type ServicesEditorProps = {
  categories: AppointmentServiceCategoryDefinition[];
  services: AppointmentService[];
  onChange: (
    categories: AppointmentServiceCategoryDefinition[],
    services: AppointmentService[],
  ) => void;
};

export type ScheduleEditorProps = {
  dailySchedule?: DailyScheduleMap;
  defaultOpening: number;
  defaultClosing: number;
  onChange: (dailySchedule: DailyScheduleMap, workingDays: number[]) => void;
};

export type SocialEditorProps = {
  social?: SocialSettings;
  onChange: (social: SocialSettings) => void;
};

export type LocationEditorProps = {
  location?: LocationSettings;
  onChange: (location: LocationSettings) => void;
};

export type AdminSettingsValidationError = {
  section: AdminSection;
  message: string;
};