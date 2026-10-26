"use client";

import { FiCheck, FiPlus } from "react-icons/fi";
import {
  appointmentServices as services,
  type AppointmentService,
} from "@/app/Appoinments/appointmentCatalog";
import styles from "./Services.module.css";

export type Service = AppointmentService;
export { services };

const currencyFormatter = new Intl.NumberFormat("es-AR");

type ServicesProps = {
  selectedServiceIds: string[];
  onToggleService: (serviceId: string) => void;

};

export default function Services({
  selectedServiceIds,
  onToggleService,
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
      aria-label="Servicios disponibles"
      aria-labelledby="services-title" 
    >

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
