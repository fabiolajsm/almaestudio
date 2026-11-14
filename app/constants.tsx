export const CARDS_ACTIONS = [
  {
    number: "01",
    title: "Sacar turno",
    description:
      "Elegí servicios, día y horario. Te lleva menos de cinco minutos.",
    href: "/Appoinments/Create",
    label: "Agendar un turno",
  },
  {
    number: "02",
    title: "Modificar turno",
    description: "Encontrá una nueva fecha o un horario que te quede mejor.",
    href: "/Appoinments/Modify",
    label: "Modificar turno",
  },
  {
    number: "03",
    title: "Cancelar turno",
    description: "Cancelá tu reserva de forma simple.",
    href: "/Appoinments/Delete",
    label: "Cancelar turno",
  },
];

export const ERROR_MESSAGES = {
  INVALID_RESERVATION_CODE: "El código de reserva ingresado no es válido.",
  APPOINTMENT_NOT_FOUND: "Lo sentimos. No se pudo encontrar el turno. Intentá nuevamente.",
}

export const CREATE_STEPS = ["Servicio", "Día y hora", "Contacto"];