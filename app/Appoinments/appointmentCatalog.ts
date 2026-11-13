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

export type AppointmentSettings = {
  categories: AppointmentServiceCategoryDefinition[];
  services: AppointmentService[];
  openingTime: number;
  closingTime: number;
  workingDays: number[];
};

export const appointmentServiceCategories: AppointmentServiceCategoryDefinition[] = [
  { id: "manicura", name: "Manicura" },
  { id: "pedicura", name: "Pedicura" },
  { id: "cejas-pestanas", name: "Cejas y pestañas" },
  {
    id: "promociones",
    name: "Promociones",
    note: "Las promociones no son acumulables con otros descuentos.",
  },
];

export const appointmentServices: AppointmentService[] = [
  {
    id: "mani-belleza",
    name: "Belleza",
    description: "Manicuría para cuidar y prolijar tus uñas naturales.",
    category: "manicura",
    duration: 60,
    price: 12000,
  },
  {
    id: "mani-semipermanente",
    name: "Semipermanente",
    description: "Color duradero y brillante para tus uñas.",
    category: "manicura",
    duration: 60,
    price: 25000,
  },
  {
    id: "mani-capping",
    name: "Capping",
    description: "Refuerzo para proteger y dar estructura a tus uñas naturales.",
    category: "manicura",
    duration: 60,
    price: 28000,
  },
  {
    id: "mani-esculpidas-gel",
    name: "Esculpidas en Gel",
    description: "Extensión de uñas con gel para lograr el largo que buscás.",
    category: "manicura",
    duration: 60,
    price: 38000,
  },
  {
    id: "mani-soft-gel",
    name: "Soft Gel",
    description: "Extensión de uñas con tips de gel y acabado prolijo.",
    category: "manicura",
    duration: 60,
    price: 32000,
  },
  {
    id: "mani-diseno-extra",
    name: "Diseños elaborados o extras",
    description: "Sumá detalles o diseños especiales a tu servicio. Consultar antes.",
    category: "manicura",
    duration: 60,
    price: 3000,
  },
  {
    id: "pedi-belleza",
    name: "Belleza de pies",
    description: "Cuidado y prolijidad para tus pies y uñas.",
    category: "pedicura",
    duration: 60,
    price: 18000,
  },
  {
    id: "pedi-semipermanente",
    name: "Semipermanente",
    description: "Color duradero y brillante para las uñas de tus pies.",
    category: "pedicura",
    duration: 60,
    price: 25000,
  },
  {
    id: "pedi-combinada",
    name: "Pedicura + Semipermanente",
    description: "Cuidado de pies y uñas con color semipermanente.",
    category: "pedicura",
    duration: 60,
    price: 33000,
  },
  {
    id: "cejas-perfilado",
    name: "Perfilado",
    description: "Diseño y limpieza para definir la forma de tus cejas.",
    category: "cejas-pestanas",
    duration: 60,
    price: 17000,
  },
  {
    id: "cejas-laminado",
    name: "Perfilado + Laminado",
    description: "Cejas definidas y peinadas para un efecto más ordenado.",
    category: "cejas-pestanas",
    duration: 60,
    price: 38000,
  },
  {
    id: "cejas-laminado-tinte",
    name: "Perfilado + Laminado + Tinte",
    description: "Diseño, laminado y tinte para realzar tus cejas.",
    category: "cejas-pestanas",
    duration: 60,
    price: 43000,
  },
  {
    id: "pestanas-lifting",
    name: "Lifting",
    description: "Realza la curvatura natural de tus pestañas.",
    category: "cejas-pestanas",
    duration: 60,
    price: 34000,
  },
  {
    id: "pestanas-lifting-tinte",
    name: "Lifting + Tinte",
    description: "Curvatura y color para destacar tus pestañas naturales.",
    category: "cejas-pestanas",
    duration: 60,
    price: 38000,
  },
  {
    id: "promo-manos-semipermanente",
    name: "Semipermanente manos",
    description: "Un color duradero para lucir tus uñas de las manos.",
    category: "promociones",
    duration: 60,
    price: 22000,
  },
  {
    id: "promo-manos-pies",
    name: "Semipermanente manos + pies",
    description: "Color semipermanente para uñas de manos y pies.",
    category: "promociones",
    duration: 60,
    price: 40000,
  },
  {
    id: "promo-capping-pies",
    name: "Capping manos + semi pies",
    description: "Refuerzo para manos y semipermanente en las uñas de los pies.",
    category: "promociones",
    duration: 60,
    price: 50000,
  },
  {
    id: "promo-laminado-lifting",
    name: "Laminado de cejas + Lifting de pestañas",
    description: "Cejas peinadas y pestañas realzadas en una misma visita.",
    category: "promociones",
    duration: 60,
    price: 55000,
  },
];

export const legacyAppointmentServiceNames: Record<string, string> = {
  "01": "Esmaltado semipermanente",
  "02": "Kapping gel",
  "03": "Soft gel + diseño",
  "04": "Manicuría clásica",
  "05": "Perfilado de cejas",
  "06": "Lifting de pestañas",
};

export const appointmentWorkingDays = [1, 2, 3, 4, 5, 6];
export const appointmentOpeningTime = 8 * 60;
export const appointmentClosingTime = 22 * 60;
export const appointmentBufferMinutes = 15;

export const defaultAppointmentSettings: AppointmentSettings = {
  categories: appointmentServiceCategories,
  services: appointmentServices,
  openingTime: appointmentOpeningTime,
  closingTime: appointmentClosingTime,
  workingDays: appointmentWorkingDays,
};

export function isAppointmentWorkingDay(
  dateKey: string,
  settings: AppointmentSettings = defaultAppointmentSettings,
) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return settings.workingDays.includes(weekday);
}

export function isAppointmentTimeWithinBusinessHours(
  time: string,
  durationMinutes: number,
  settings: AppointmentSettings = defaultAppointmentSettings,
) {
  if (
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 15
  ) {
    return false;
  }

  const [hour, minute] = time.split(":").map(Number);
  const start = hour * 60 + minute;

  return (
    start >= settings.openingTime &&
    start + durationMinutes <= settings.closingTime
  );
}
