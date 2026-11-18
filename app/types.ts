export type AppointmentServiceCategory = string;

export type AppointmentServiceCategoryDefinition = {
  id: AppointmentServiceCategory;
  name: string;
  note?: string;
};

export type AppointmentService = {
  id: string;
  name: string;
  description?: string;
  category: AppointmentServiceCategory;
  duration: number;
  price: number;
};

export type AppointmentServiceDraft = Omit<AppointmentService, "id">;

export type Service = AppointmentService;

export type AppointmentDaySchedule = {
  enabled: boolean;
  openingTime: number;
  closingTime: number;
};

export type AppointmentDailySchedule = Record<number, AppointmentDaySchedule>;

export type AppointmentSocialSettings = {
  instagram?: string;
  whatsapp?: string;
  tiktok?: string;
};

export type AppointmentLocationSettings = {
  addressText?: string;
  mapsUrl?: string;
};

export type AppointmentSettings = {
  categories: AppointmentServiceCategoryDefinition[];
  services: AppointmentService[];
  openingTime: number;
  closingTime: number;
  workingDays: number[];
  dailySchedule?: AppointmentDailySchedule;
};

export type ExtendedAppointmentSettings = AppointmentSettings & {
  social?: AppointmentSocialSettings;
  location?: AppointmentLocationSettings;
};

export type AppointmentContact = {
  name: string;
  email: string;
  phone: string;
};

export type AppointmentContactErrors = Partial<
  Record<keyof AppointmentContact, string>
>;

export type AppointmentLookupCredentials = {
  reservationCode: string;
  email: string;
};

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };