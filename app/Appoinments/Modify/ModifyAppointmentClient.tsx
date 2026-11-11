"use client";

import { useState } from "react";
import type { SubmitEvent } from "react";
import Link from "next/link";
import { FiArrowLeft, FiArrowRight, FiCheck } from "react-icons/fi";
import AppointmentHeader from "../AppointmentHeader";
import SiteHeader from "../../SiteHeader";
import AppointmentSchedule from "@/components/AppointmentSchedule";
import Loading from "@/components/Loading";
import Services, { services } from "@/components/Services";
import TurnSummary from "@/components/TurnSummary";
import styles from "./page.module.css";

type AppointmentSummary = {
  reservationCode: number;
  appointmentDate: string;
  startTime: string;
  durationMinutes: number;
  serviceIds: string[];
  totalPrice: number;
  customerName: string | null;
};

type ApiResult = {
  error?: unknown;
  modified?: unknown;
  appointment?: AppointmentSummary;
};

export default function ModifyAppointmentClient({
  today,
  initialDate,
}: {
  today: string;
  initialDate: string;
}) {
  const [reservationCode, setReservationCode] = useState("");
  const [email, setEmail] = useState("");
  const [appointment, setAppointment] = useState<AppointmentSummary | null>(
    null,
  );
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedTime, setSelectedTime] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const selectedServices = services.filter((service) =>
    selectedServiceIds.includes(service.id),
  );
  const selectedDuration = selectedServices.reduce(
    (total, service) => total + service.duration,
    0,
  );

  async function submitAppointmentAction(action: "lookup" | "modify") {
    setIsBusy(true);
    setMessage("");
    setIsSaved(false);

    try {
      const response = await fetch("/api/appointments/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reservationCode,
          email,
          date: selectedDate,
          time: selectedTime,
          serviceIds: selectedServiceIds,
        }),
      });
      const result = (await response.json()) as ApiResult;

      if (action === "lookup" && response.ok && result.appointment) {
        setAppointment(result.appointment);
        setSelectedServiceIds(result.appointment.serviceIds);
        setSelectedDate(result.appointment.appointmentDate);
        setSelectedTime(result.appointment.startTime.slice(0, 5));
        return;
      }

      if (action === "modify" && response.ok && result.modified === true) {
        setAppointment((current) =>
          current
            ? {
                ...current,
                serviceIds: selectedServiceIds,
                appointmentDate: selectedDate,
                startTime: selectedTime,
                durationMinutes: selectedDuration,
                totalPrice: selectedServices.reduce(
                  (total, service) => total + service.price,
                  0,
                ),
              }
            : current,
        );
        setIsSaved(true);
        setMessage("Los datos de tu turno se actualizaron correctamente.");
        return;
      }

      throw new Error(
        typeof result.error === "string"
          ? result.error
          : action === "lookup"
            ? "No se pudo encontrar la reserva. Intentá nuevamente."
            : "No se pudo guardar la modificación. Intentá nuevamente.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo completar la operación. Intentá nuevamente.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  function findAppointment(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitAppointmentAction("lookup");
  }

  function discardChanges() {
    if (!appointment) {
      return;
    }

    setSelectedServiceIds(appointment.serviceIds);
    setSelectedDate(appointment.appointmentDate);
    setSelectedTime(appointment.startTime.slice(0, 5));
    setMessage("");
    setIsSaved(false);
  }

  return (
    <main className="site-shell">
      <SiteHeader />
      <AppointmentHeader
        actionLabel="Modificar turno"
        title="Hacé lugar a un cambio."
        description="Buscá tu reserva con el código y el email asociado para modificarla."
      />

      {!appointment ? (
        <section className={styles.lookup} aria-labelledby="lookup-title">
          <div className={styles.editorHeading}>
            <p className={styles.eyebrow}>Modificar turno</p>
            <h2 id="lookup-title">Encontrá tu reserva.</h2>
          </div>
          <form className={styles.lookupForm} noValidate onSubmit={findAppointment}>
            <label>
              Código de reserva
              <input
                type="text"
                name="reservationCode"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Ej.: 12345"
                maxLength={15}
                value={reservationCode}
                onChange={(event) => {
                  setReservationCode(event.currentTarget.value.replace(/\D/g, ""));
                  setMessage("");
                }}
                required
              />
            </label>
            <label>
              Email asociado a la reserva
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="tu@email.com"
                maxLength={254}
                value={email}
                onChange={(event) => {
                  setEmail(event.currentTarget.value);
                  setMessage("");
                }}
                required
              />
            </label>
            {message && (
              <p className={styles.message} role="alert">
                {message}
              </p>
            )}
            <div className={styles.editorActions}>
              <button
                type="submit"
                className={styles.saveButton}
                disabled={
                  isBusy || reservationCode.length === 0 || email.trim() === ""
                }
              >
                {isBusy ? (
                  <Loading label="Buscando reserva..." inline />
                ) : (
                  <>
                    Buscar reserva
                    <FiArrowRight aria-hidden="true" />
                  </>
                )}
              </button>
              <Link className={styles.discardButton} href="/">
                Volver al inicio
              </Link>
            </div>
          </form>
        </section>
      ) : (
        <div className={styles.modifyLayout}>
          <section className={styles.reservation} aria-label="Resumen de la reserva">
            <p className={styles.reservationCode}>
              Turno #{appointment.reservationCode}
              {appointment.customerName && ` · ${appointment.customerName}`}
            </p>
            <TurnSummary
              services={selectedServices}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
            />
          </section>

          <section
            id="edit-appointment"
            className={styles.editor}
            aria-labelledby="edit-title"
          >
            <div className={styles.editorHeading}>
              <p className={styles.eyebrow}>Modificar turno</p>
              <h2 id="edit-title">Ajustá tu próximo momento.</h2>
              <p>Elegí los servicios, el día o el horario que prefieras.</p>
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
                  setIsSaved(false);
                }}
              />
            </div>

            <div className={styles.editorSection}>
              <h3>Fecha y horario</h3>
              <AppointmentSchedule
                today={today}
                serviceDuration={selectedDuration}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                onSelectDate={(date) => {
                  setSelectedDate(date);
                  setSelectedTime("");
                  setMessage("");
                  setIsSaved(false);
                }}
                onSelectTime={(time) => {
                  setSelectedTime(time || "");
                  setMessage("");
                  setIsSaved(false);
                }}
                showHeading={false}
              />
            </div>

            {message && (
              <p
                className={`${styles.message} ${isSaved ? styles.successMessage : ""}`}
                role={isSaved ? "status" : "alert"}
              >
                {message}
              </p>
            )}

            <div className={styles.editorActions}>
              <button
                type="button"
                className={styles.saveButton}
                disabled={
                  isBusy ||
                  selectedServiceIds.length === 0 ||
                  !selectedDate ||
                  !selectedTime
                }
                onClick={() => void submitAppointmentAction("modify")}
              >
                {isBusy ? (
                  <Loading label="Guardando cambios..." inline />
                ) : (
                  <>
                    <FiCheck aria-hidden="true" />
                    Guardar cambios
                  </>
                )}
              </button>
              <button
                type="button"
                className={styles.discardButton}
                disabled={isBusy}
                onClick={discardChanges}
              >
                <FiArrowLeft aria-hidden="true" />
                Descartar cambios
              </button>
              <button
                type="button"
                className={styles.discardButton}
                disabled={isBusy}
                onClick={() => {
                  setAppointment(null);
                  setSelectedServiceIds([]);
                  setSelectedTime("");
                  setMessage("");
                  setIsSaved(false);
                }}
              >
                Buscar otra reserva
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
