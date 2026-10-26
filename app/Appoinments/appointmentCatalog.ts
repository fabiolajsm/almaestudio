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

export const availableAppointmentTimes = [
  "10:00",
  "14:00",
  "15:30",
  "18:30",
];

export const appointmentDeposit = 5000;
