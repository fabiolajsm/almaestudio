"use client";

import { FiCheck, FiPlus } from "react-icons/fi";
import styles from "./Services.module.css";

export type Service = {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
};

export const services: Service[] = [
  {
    id: "semi-permanent-polish",
    name: "Esmaltado semipermanente",
    description: "Color duradero y brillante para lucir uñas prolijas por semanas.",
    duration: 60,
    price: 18500,
  },
  {
    id: "kapping-gel",
    name: "Kapping gel",
    description: "Refuerzo con gel para proteger tus uñas naturales.",
    duration: 75,
    price: 22000,
  },
  {
    id: "soft-gel-design",
    name: "Soft gel + diseño",
    description: "Extensión con tips soft gel y diseño a tu gusto.",
    duration: 105,
    price: 28500,
  },
  {
    id: "classic-manicure",
    name: "Manicuría clásica",
    description: "Cuidado y prolijidad para tus uñas con un acabado natural.",
    duration: 45,
    price: 13000,
  },
  {
    id: "eyebrow-shaping",
    name: "Perfilado de cejas",
    description: "Diseño y limpieza para definir la forma de tus cejas.",
    duration: 30,
    price: 8500,
  },
  {
    id: "eyelash-lifting",
    name: "Lifting de pestañas",
    description: "Realza tus pestañas naturales con una curvatura más abierta.",
    duration: 60,
    price: 16500,
  },
];

const currencyFormatter = new Intl.NumberFormat("es-AR");

type ServicesProps = {
  selectedServiceIds: string[];
  onToggleService: (serviceId: string) => void;
  showHeading?: boolean;
};

export default function Services({
  selectedServiceIds,
  onToggleService,
  showHeading = true,
}: ServicesProps) {
  const selectedServices = selectedServiceIds;
  const selectedCount = selectedServices.length;
  const selectionLabel =
    selectedCount === 1
      ? "1 servicio seleccionado"
      : `${selectedCount} servicios seleccionados`;

  return (
    <section
      className={styles.services}
      aria-label={showHeading ? undefined : "Servicios disponibles"}
      aria-labelledby={showHeading ? "services-title" : undefined}
    >
      {showHeading && (
        <div className={styles.heading}>
          <h2 id="services-title">Servicios</h2>
          <p>Podés sumar o quitar opciones</p>
        </div>
      )}

      <ul className={styles.list}>
        {services.map((service) => {
          const isSelected = selectedServices.includes(service.id);

          return (
            <li key={service.id}>
              <button
                type="button"
                className={`${styles.service} ${isSelected ? styles.selected : ""}`}
                aria-pressed={isSelected}
                aria-label={`${isSelected ? "Quitar" : "Agregar"} ${service.name}. ${service.description} ${service.duration} minutos, $ ${currencyFormatter.format(service.price)}`}
                onClick={() => onToggleService(service.id)}
              >
                <span className={styles.details}>
                  <span className={styles.name}>{service.name}</span>
                  <span className={styles.description}>{service.description}</span>
                  <span className={styles.duration}>{service.duration} min</span>
                </span>
                <span className={styles.priceAndAction}>
                  <span className={styles.price}>
                    $ {currencyFormatter.format(service.price)}
                  </span>
                  <span className={styles.icon} aria-hidden="true">
                    {isSelected ? <FiCheck /> : <FiPlus />}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className={styles.selectionCount} aria-live="polite">
        {selectionLabel}
      </p>
    </section>
  );
}
