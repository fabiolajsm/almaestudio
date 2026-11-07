"use client";

import { useState } from "react";
import { FiCheck, FiChevronDown, FiPlus } from "react-icons/fi";
import {
  appointmentServiceCategories,
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
  const [openCategory, setOpenCategory] = useState<string | null>("manicura");
  const selectedCount = selectedServiceIds.length;
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
      <h3 id="services-title" className={styles.visuallyHidden}>
        Servicios disponibles
      </h3>
      <div className={styles.categories}>
        {appointmentServiceCategories.map((category) => {
          const categoryServices = services.filter(
            (service) => service.category === category.id,
          );
          const categorySelectedCount = categoryServices.filter((service) =>
            selectedServiceIds.includes(service.id),
          ).length;
          const isOpen = openCategory === category.id;
          const contentId = `services-${category.id}`;

          return (
            <section key={category.id} className={styles.category}>
              <button
                type="button"
                className={styles.categoryToggle}
                aria-expanded={isOpen}
                aria-controls={contentId}
                onClick={() =>
                  setOpenCategory(isOpen ? null : category.id)
                }
              >
                <span className={styles.categoryTitle}>
                  {category.name}
                  {categorySelectedCount > 0 && (
                    <span className={styles.categoryCount}>
                      {categorySelectedCount}
                    </span>
                  )}
                </span>
                <FiChevronDown
                  className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
                  aria-hidden="true"
                />
              </button>
              <div
                id={contentId}
                className={styles.categoryContent}
                hidden={!isOpen}
              >
                {category.note && (
                  <p className={styles.categoryNote}>{category.note}</p>
                )}
                <ul className={styles.list}>
                  {categoryServices.map((service) => {
                    const isSelected = selectedServiceIds.includes(service.id);

                    return (
                      <li key={service.id}>
                        <button
                          type="button"
                          className={`${styles.service} ${isSelected ? styles.selected : ""}`}
                          aria-pressed={isSelected}
                          aria-label={`${isSelected ? "Quitar" : "Agregar"} ${service.name}. ${service.description ? `${service.description} ` : ""}${service.duration} minutos, $ ${currencyFormatter.format(service.price)}`}
                          onClick={() => onToggleService(service.id)}
                        >
                          <span className={styles.details}>
                            <span className={styles.name}>{service.name}</span>
                            {service.description && (
                              <span className={styles.description}>
                                {service.description}
                              </span>
                            )}
                            <span className={styles.duration}>
                              {service.duration} min
                            </span>
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
              </div>
            </section>
          );
        })}
      </div>

      <p className={styles.selectionCount} aria-live="polite">
        {selectionLabel}
      </p>
    </section>
  );
}
