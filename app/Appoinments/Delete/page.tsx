"use client";

import { useState } from "react";
import Link from "next/link";
import { FiArrowRight, FiX } from "react-icons/fi";
import AppointmentHeader from "../AppointmentHeader";
import SiteHeader from "../../SiteHeader";
import Loading from "@/components/Loading";
import SearchAppointment from "@/components/SearchAppointment";
import type {
  AppointmentSearchCredentials,
  AppointmentSearchResult,
} from "@/components/SearchAppointment";
import styles from "./page.module.css";

type CancelApiResult = {
  error?: unknown;
  cancelled?: unknown;
};

export default function DeleteAppointmentPage() {
  const [reservationCode, setReservationCode] = useState("");
  const [email, setEmail] = useState("");
  const [appointment, setAppointment] =
    useState<AppointmentSearchResult | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [message, setMessage] = useState("");

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
            : "No se pudo cancelar el turno. Intentá nuevamente.",
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
            <h2>Tu turno fue cancelado</h2>
            <p>
              La reserva #{reservationCode} fue eliminada y el horario volvió a
              estar disponible.
            </p>
            <Link className={styles.keepButton} href="/">
              Volver al inicio
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : (
        <>
          <SearchAppointment
            onAppointmentFound={handleAppointmentFound}
            onSearchAnother={searchAnotherAppointment}
          />
          {appointment && (
            <section
              className={styles.confirmation}
              aria-label="Cancelar turno encontrado"
            >
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
                <Link className={styles.keepButton} href="/">
                  Mantener turno
                </Link>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
