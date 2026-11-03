export type AppointmentService = {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
};

export const appointmentServices: AppointmentService[] = [
  {
    id: "01",
    name: "Esmaltado semipermanente",
    description: "Color duradero y brillante para lucir uñas prolijas por semanas.",
    duration: 60,
    price: 18500,
  },
  {
    id: "02",
    name: "Kapping gel",
    description: "Refuerzo con gel para proteger tus uñas naturales.",
    duration: 75,
    price: 22000,
  },
  {
    id: "03",
    name: "Soft gel + diseño",
    description: "Extensión con tips soft gel y diseño a tu gusto.",
    duration: 105,
    price: 28500,
  },
  {
    id: "04",
    name: "Manicuría clásica",
    description: "Cuidado y prolijidad para tus uñas con un acabado natural.",
    duration: 45,
    price: 13000,
  },
  {
    id: "05",
    name: "Perfilado de cejas",
    description: "Diseño y limpieza para definir la forma de tus cejas.",
    duration: 30,
    price: 8500,
  },
  {
    id: "06",
    name: "Lifting de pestañas",
    description: "Realza tus pestañas naturales con una curvatura más abierta.",
    duration: 60,
    price: 16500,
  },
];

export const maximumAppointmentDuration = 300;

export const appointmentWorkingDays = [1, 2, 3, 4, 5, 6];
export const appointmentOpeningTime = 9 * 60;
export const appointmentClosingTime = 22 * 60;
export const appointmentBufferMinutes = 15;

export function isAppointmentWorkingDay(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return appointmentWorkingDays.includes(weekday);
}

export function isAppointmentTimeWithinBusinessHours(
  time: string,
  durationMinutes: number,
) {
  if (
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 15 ||
    durationMinutes > maximumAppointmentDuration
  ) {
    return false;
  }

  const [hour, minute] = time.split(":").map(Number);
  const start = hour * 60 + minute;

  return (
    start >= appointmentOpeningTime &&
    start + durationMinutes <= appointmentClosingTime
  );
}

export const appointmentDeposit = 5000;
