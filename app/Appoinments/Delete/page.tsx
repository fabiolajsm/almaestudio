"use client";

import { useState } from "react";
import Link from "next/link";
import { FiX } from "react-icons/fi";
import { FaRegCalendarTimes } from "react-icons/fa";
import AppointmentHeader from "../components/AppointmentHeader";
import SiteHeader from "../../../components/SiteHeader";
import SearchAppointment from "@/app/Appoinments/components/SearchAppointment";
import type {
  AppointmentSearchCredentials,
  AppointmentSearchResult,
} from "@/app/Appoinments/components/SearchAppointment";
import useAppointmentSettings from "@/components/useAppointmentSettings";
import ConfirmDialog from "@/components/ConfirmDialog";
import SuccessState from "../components/SuccessState";
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
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <main className="site-shell">
      <SiteHeader />
      <AppointmentHeader
        actionLabel="Cancelar turno"
        title="Liberá tu espacio."
        description={
          !appointment
            ? "Ingresá el código de reserva y el email asociado al turno."
            : undefined
        }
      />
      {isCancelled ? (
        <SuccessState
          icon={<FaRegCalendarTimes />}
          title="Tu turno fue cancelado"
          description={
            <>
              La reserva <strong>#{reservationCode}</strong> fue eliminada y el
              horario volvió a estar disponible. En breve recibirás un email con la confirmación de la cancelación.
            </>
          }
          variant="danger"
        />
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
                  Al cancelar el turno, tené en cuenta que esta acción no se
                  puede deshacer. Si estás segura de que querés liberar tu
                  espacio, hacé click en el botón de abajo.
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
                  onClick={() => setShowCancelConfirmation(true)}
                >
                  <FiX aria-hidden="true" />
                  Sí, cancelar turno
                </button>
              </div>
            </section>
          )}

          <ConfirmDialog
            isOpen={showCancelConfirmation}
            title="¿Estás segura de cancelar el turno?"
            cancelText="No, mantener mi turno"
            confirmText="Sí, confirmo"
            isBusy={isBusy}
            onCancel={() => setShowCancelConfirmation(false)}
            onConfirm={() => void cancelAppointment()}
            confirmButtonClassName={styles.cancelButton}
          />
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
      setShowCancelConfirmation(false);
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
