"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FiArrowRight,
  FiCheckCircle,
  FiX,
} from "react-icons/fi";
import AppointmentHeader from "../AppointmentHeader";
import SiteHeader from "../../../components/SiteHeader";
import Loading from "@/components/Loading";
import SearchAppointment from "@/components/SearchAppointment";
import type {
  AppointmentSearchCredentials,
  AppointmentSearchResult,
} from "@/components/SearchAppointment";
import useAppointmentSettings from "@/components/useAppointmentSettings";
import styles from "./page.module.css";
import { ERROR_MESSAGES } from "@/app/constants";

type CancelApiResult = {
  error?: unknown;
  cancelled?: unknown;
};

export default function DeleteAppointmentPage() {
  const { settings, error: settingsError } = useAppointmentSettings();
  const [reservationCode, setReservationCode] = useState("");
  const [email, setEmail] = useState("");
  const [appointment, setAppointment] =
    useState<AppointmentSearchResult | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <main className="site-shell">
      <SiteHeader />
      <AppointmentHeader
        actionLabel="Cancelar turno"
        title="Liberá tu espacio."
        description="Ingresá el código de reserva y el email asociado al turno."
      />
      {isCancelled ? (
        <section className={styles.confirmation}>
          <div className={styles.success} role="status">
            <span className={styles.successIcon} aria-hidden="true">
              <FiCheckCircle />
            </span>
            <h2>Tu turno fue cancelado</h2>
            <p>
              La reserva <strong>#{reservationCode}</strong> fue eliminada y el horario volvió a
              estar disponible.
            </p>
            <Link className="primary-button" href="/">
              Volver al inicio
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : (
        <>
          <SearchAppointment
            services={settings?.services ?? []}
            onAppointmentFound={handleAppointmentFound}
            onSearchAnother={searchAnotherAppointment}
          />

          {settingsError && (
            <p className={styles.error} role="alert">
              {settingsError}
            </p>
          )}

          {appointment && (
            <section
              className={`${styles.confirmation} ${styles.cancelPanel}`}
              aria-label="Cancelar turno encontrado"
            >
              <div className={styles.cancelHeading}>
                <p className={styles.cancelEyebrow}>Antes de continuar</p>
                <h2>
                  Si confirmás, el turno se cancela y el horario vuelve a estar
                  disponible para otra persona.
                </h2>
              </div>
              {message && (
                <p className={styles.error} role="alert">
                  {message}
                </p>
              )}
              <div className={styles.actions}>
                <Link className="secondary-button" href="/">
                  Mantener mi turno
                </Link>
                <button
                  type="button"
                  className={styles.cancelButton}
                  disabled={isBusy}
                  onClick={() => void cancelAppointment()}
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
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
  function handleAppointmentFound(
    foundAppointment: AppointmentSearchResult,
    credentials: AppointmentSearchCredentials,
  ) {
    setAppointment(foundAppointment);
    setReservationCode(credentials.reservationCode);
    setEmail(credentials.email);
    setMessage("");
  }

  function searchAnotherAppointment() {
    setAppointment(null);
    setReservationCode("");
    setEmail("");
    setMessage("");
  }

  async function cancelAppointment() {
    setIsBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/appointments/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          reservationCode,
          email,
        }),
      });
      const result = (await response.json()) as CancelApiResult;

      if (!response.ok || result.cancelled !== true) {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : ERROR_MESSAGES.APPOINTMENT_NOT_FOUND,
        );
      }

      setIsCancelled(true);
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
}
