"use client";

import { useState } from "react";
import { FiCheck, FiPlus } from "react-icons/fi";
import styles from "./Services.module.css";

const services = [
  { id: "semi-permanent-polish", name: "Esmaltado semipermanente", duration: 60, price: 18500 },
  { id: "kapping-gel", name: "Kapping gel", duration: 75, price: 22000 },
  { id: "soft-gel-design", name: "Soft gel + diseño", duration: 105, price: 28500 },
  { id: "classic-manicure", name: "Manicuría clásica", duration: 45, price: 13000 },
  { id: "eyebrow-shaping", name: "Perfilado de cejas", duration: 30, price: 8500 },
  { id: "eyelash-lifting", name: "Lifting de pestañas", duration: 60, price: 16500 },
];

const currencyFormatter = new Intl.NumberFormat("es-AR");

export default function Services() {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const selectedCount = selectedServices.length;
  const selectionLabel =
    selectedCount === 1
      ? "1 servicio seleccionado"
      : `${selectedCount} servicios seleccionados`;

  function toggleService(serviceId: string) {
    setSelectedServices((currentServices) =>
      currentServices.includes(serviceId)
        ? currentServices.filter((id) => id !== serviceId)
        : [...currentServices, serviceId],
    );
  }

  return (
    <section className={styles.services} aria-labelledby="services-title">
      <div className={styles.heading}>
        <h2 id="services-title">Servicios</h2>
        <p>Podés sumar o quitar opciones</p>
      </div>

      <ul className={styles.list}>
        {services.map((service) => {
          const isSelected = selectedServices.includes(service.id);

          return (
            <li key={service.id}>
              <button
                type="button"
                className={`${styles.service} ${isSelected ? styles.selected : ""}`}
                aria-pressed={isSelected}
                aria-label={`${isSelected ? "Quitar" : "Agregar"} ${service.name}, ${service.duration} minutos, $ ${currencyFormatter.format(service.price)}`}
                onClick={() => toggleService(service.id)}
              >
                <span className={styles.details}>
                  <span className={styles.name}>{service.name}</span>
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
