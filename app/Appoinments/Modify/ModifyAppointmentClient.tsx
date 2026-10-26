"use client";

import { useState } from "react";
import { FiCheck, FiMapPin, FiX } from "react-icons/fi";
import AppointmentHeader from "../AppointmentHeader";
import SiteHeader from "../../SiteHeader";
import AppointmentSchedule from "@/components/AppointmentSchedule";
import Services, { services } from "@/components/Services";
import styles from "./page.module.css";

function formatAppointmentDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekdays = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const months = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];

  return `${weekdays[date.getUTCDay()]} ${date.getUTCDate()} ${months[date.getUTCMonth()]}`;
}

const initialServiceIds = ["semi-permanent-polish", "eyebrow-shaping"];

export default function ModifyAppointmentClient({
  today,
  initialDate,
}: {
  today: string;
  initialDate: string;
}) {
  const [selectedServiceIds, setSelectedServiceIds] =
    useState<string[]>(initialServiceIds);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedTime, setSelectedTime] = useState("15:30");
  const [savedServiceIds, setSavedServiceIds] =
    useState<string[]>(initialServiceIds);
  const [savedDate, setSavedDate] = useState(initialDate);
  const [savedTime, setSavedTime] = useState("15:30");
  const [message, setMessage] = useState("");

  const savedServices = services.filter((service) =>
    savedServiceIds.includes(service.id),
  );
  const totalDuration = savedServices.reduce(
    (total, service) => total + service.duration,
    0,
  );
  const serviceNames = savedServices.map((service) => service.name).join(" + ");

  function saveChanges() {
    if (selectedServiceIds.length === 0 || !selectedDate || !selectedTime) {
      setMessage("Elegí al menos un servicio, un día y un horario.");
      return;
    }

    setSavedServiceIds(selectedServiceIds);
    setSavedDate(selectedDate);
    setSavedTime(selectedTime);
    setMessage(
      "Los cambios se actualizaron en esta vista. Para guardar la reserva, falta conectar la agenda.",
    );
  }

  function discardChanges() {
    setSelectedServiceIds(savedServiceIds);
    setSelectedDate(savedDate);
    setSelectedTime(savedTime);
    setMessage("");
  }

  return (
    <main className="site-shell">
      <SiteHeader />
      <AppointmentHeader
        actionLabel="Modificar turno"
        title="Hacé lugar a un cambio."
        description="Podés cambiar el servicio, la fecha o el horario de tu reserva actual."
      />

      <div className={styles.modifyLayout}>
        <section className={styles.reservation} aria-labelledby="reservation-title">
          <div className={styles.reservationHeader}>
            <div>
              <p className={styles.reservationCode}>Turno #ALM-2406</p>
              <h2 id="reservation-title">Danae , tu reserva</h2>
            </div>
            <span className={styles.status}>
              <span aria-hidden="true" />
              Confirmado
            </span>
          </div>

          <dl className={styles.reservationDetails}>
            <div>
              <dt>Servicios</dt>
              <dd>{serviceNames}</dd>
              <small>{totalDuration} min</small>
            </div>
            <div>
              <dt>Fecha</dt>
              <dd>{formatAppointmentDate(savedDate)}</dd>
            </div>
            <div>
              <dt>Hora</dt>
              <dd>{savedTime} hs</dd>
            </div>
          </dl>

          <p className={styles.location}>
            <FiMapPin aria-hidden="true" />
            Thames 1684, Palermo · Martes a sábado
          </p>

          <div className={styles.reservationActions}>
            <a className={styles.primaryLink} href="#edit-appointment">
              Cambiar servicio, fecha u horario
            </a>
            <a className={styles.secondaryLink} href="/Appoinments/Delete">
              Cancelar turno
            </a>
          </div>
        </section>

        <section
          id="edit-appointment"
          className={styles.editor}
          aria-labelledby="edit-title"
        >
          <div className={styles.editorHeading}>
            <p className={styles.eyebrow}>Modificar turno</p>
            <h2 id="edit-title">Ajustá tu próximo momento.</h2>
            <p>Los cambios se aplicarán a tu reserva actual.</p>
          </div>

          <div className={styles.editorSection}>
            <h3>Servicios</h3>
            <Services
              selectedServiceIds={selectedServiceIds}
              onToggleService={(serviceId) => {
                setSelectedServiceIds((currentIds) =>
                  currentIds.includes(serviceId)
                    ? currentIds.filter((id) => id !== serviceId)
                    : [...currentIds, serviceId],
                );
                setMessage("");
              }}
            />
          </div>

          <div className={styles.editorSection}>
            <h3>Fecha y horario</h3>
            <AppointmentSchedule
              today={today}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setSelectedTime("");
                setMessage("");
              }}
              onSelectTime={(time) => {
                setSelectedTime(time || "");
                setMessage("");
              }}
              showHeading={false}
            />
          </div>

          <div className={styles.editorActions}>
            <button
              type="button"
              className={styles.saveButton}
              onClick={saveChanges}
            >
              <FiCheck aria-hidden="true" />
              Guardar cambios
            </button>
            <button
              type="button"
              className={styles.discardButton}
              onClick={discardChanges}
            >
              <FiX aria-hidden="true" />
              No cambiar
            </button>
          </div>
          {message && (
            <p className={styles.message} role="status">
              {message}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
