"use client";

import { useState } from "react";
import type { SubmitEvent } from "react";
import Link from "next/link";
import { FiArrowLeft, FiArrowRight, FiMapPin, FiX } from "react-icons/fi";
import AppointmentHeader from "../AppointmentHeader";
import SiteHeader from "../../SiteHeader";
import Loading from "@/components/Loading";
import {
  appointmentServices,
  legacyAppointmentServiceNames,
} from "../appointmentCatalog";
import styles from "./page.module.css";

type ApiResult = {
  error?: unknown;
  cancelled?: unknown;
  appointment?: AppointmentSummary;
};

type AppointmentSummary = {
  reservationCode: number;
  appointmentDate: string;
  startTime: string;
  durationMinutes: number;
  serviceIds: string[];
  totalPrice: number;
  customerName: string | null;
};

export default function DeleteAppointmentPage() {
  const [reservationCode, setReservationCode] = useState("");
  const [email, setEmail] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [appointment, setAppointment] = useState<AppointmentSummary | null>(
    null,
  );
  const [message, setMessage] = useState("");

  const serviceNames = appointment?.serviceIds.map(
    (id) =>
      appointmentServices.find((service) => service.id === id)?.name ??
      legacyAppointmentServiceNames[id] ??
      "Servicio",
  );
  const currencyFormatter = new Intl.NumberFormat("es-AR");

  return (
    <main className="site-shell">
      <SiteHeader />
      <AppointmentHeader
        actionLabel="Cancelar turno"
        title="Liberá tu espacio."
        description="Ingresá el código de reserva y el email asociado al turno."
      />
      <section className={styles.confirmation} aria-labelledby="cancel-title">
        {isCancelled ? (
          <div className={styles.success} role="status">
            <h2 id="cancel-title">Tu turno fue cancelado</h2>
            <p>
              La reserva #{reservationCode} fue eliminada y el horario volvió a
              estar disponible.
            </p>
            <Link className={styles.keepButton} href="/">
              Volver al inicio
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
        ) : appointment ? (
          <>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.reservationCode}>
                  Turno #{appointment.reservationCode}
                </p>
                <h2 id="cancel-title">Tu cita está confirmada</h2>
              </div>
              <span className={styles.status}>
                <span aria-hidden="true" />
                Confirmado
              </span>
            </div>

            <dl className={styles.appointmentDetails}>
              <div>
                <dt>Servicios</dt>
                <dd>{serviceNames?.join(" + ")}</dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>{formatAppointmentDate(appointment.appointmentDate)}</dd>
              </div>
              <div>
                <dt>Hora</dt>
                <dd>{appointment.startTime.slice(0, 5)} hs</dd>
              </div>
              <div>
                <dt>Duración</dt>
                <dd>{appointment.durationMinutes} min</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>$ {currencyFormatter.format(appointment.totalPrice)}</dd>
              </div>
            </dl>

            <p className={styles.location}>
              <FiMapPin aria-hidden="true" />
              Thames 1684, Palermo
              {appointment.customerName &&
                ` · a nombre de ${appointment.customerName}`}
            </p>

            <p className={styles.notice}>
              Al cancelar, este horario volverá a estar disponible para otra
              persona.
            </p>

            {message && (
              <p className={styles.error} role="alert">
                {message}
              </p>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelButton}
                disabled={isBusy}
                onClick={() => void submitAppointmentAction("cancel")}
              >
                {isBusy ? (
                  <Loading label="Cancelando..." inline />
                ) : (
                  <>
                    <FiX aria-hidden="true" />
                    Sí, cancelar turno
                  </>
                )}
              </button>
              <button
                type="button"
                className={styles.keepButton}
                disabled={isBusy}
                onClick={() => {
                  setAppointment(null);
                  setMessage("");
                }}
              >
                <FiArrowLeft aria-hidden="true" />
                Volver
              </button>
              <Link className={styles.keepButton} href="/">
                Mantener turno
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className={styles.cardHeader}>
              <h2 id="cancel-title">Encontrá tu reserva</h2>
            </div>

            <form className={styles.form} noValidate onSubmit={findAppointment}>
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
                  onChange={(event) =>
                    setReservationCode(
                      event.currentTarget.value.replace(/\D/g, ""),
                    )
                  }
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
                  onChange={(event) => setEmail(event.currentTarget.value)}
                  required
                />
              </label>

              <p className={styles.notice}>
                Al cancelar, el turno se eliminará y el horario volverá a estar
                disponible para otra persona.
              </p>

              {message && (
                <p className={styles.error} role="alert">
                  {message}
                </p>
              )}

              <div className={styles.actions}>
                <button
                  type="submit"
                  className={styles.cancelButton}
                  disabled={
                    isBusy ||
                    reservationCode.length === 0 ||
                    email.trim() === ""
                  }
                >
                  {isBusy ? (
                    <Loading label="Buscando reserva..." inline />
                  ) : (
                    <>
                      <FiArrowRight aria-hidden="true" />
                      Buscar reserva
                    </>
                  )}
                </button>
                <Link className={styles.keepButton} href="/">
                  Mantener turno
                </Link>
              </div>
            </form>
          </>
        )}
      </section>
    </main>
  );
  async function submitAppointmentAction(action: "lookup" | "cancel") {
    setIsBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/appointments/cancel-by-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationCode, email, action }),
      });
      const result = (await response.json()) as ApiResult;

      if (action === "lookup" && response.ok && result.appointment) {
        setAppointment(result.appointment);
        return;
      }

      if (action === "cancel" && response.ok && result.cancelled === true) {
        setIsCancelled(true);
        return;
      }

      throw new Error(
        typeof result.error === "string"
          ? result.error
          : action === "lookup"
            ? "No se pudo encontrar la reserva. Intentá nuevamente."
            : "No se pudo cancelar el turno. Intentá nuevamente.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cancelar el turno. Intentá nuevamente.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  function findAppointment(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitAppointmentAction("lookup");
  }

  function formatAppointmentDate(dateKey: string) {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Intl.DateTimeFormat("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
      .format(new Date(year, month - 1, day))
      .replace(",", "");
  }
}
