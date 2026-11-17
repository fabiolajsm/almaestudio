import { AdminSection } from "./types";

export const WEEKDAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

export const SECTION_OPTIONS: { value: AdminSection; label: string }[] = [
  { value: "services", label: "Servicios" },
  { value: "schedule", label: "Horarios y días de atención" },
  { value: "social", label: "Redes sociales y contacto" },
  { value: "location", label: "Ubicación" },
];
