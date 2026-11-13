"use client";

import { useState } from "react";
import type { SubmitEvent } from "react";
import { FiArrowRight } from "react-icons/fi";
import {
  legacyAppointmentServiceNames,
} from "@/app/Appoinments/appointmentCatalog";
import Loading from "./Loading";
import TurnSummary from "./TurnSummary";
import type { Service } from "./Services";
import styles from "./SearchAppointment.module.css";

export type AppointmentSearchResult = {
  reservationCode: number;
  appointmentDate: string;
  startTime: string;
  durationMinutes: number;
  serviceIds: string[];
  totalPrice: number;
  customerName: string | null;
};

export type AppointmentSearchCredentials = {
  reservationCode: string;
  email: string;
};

type SearchAppointmentProps = {
  services: Service[];
  onAppointmentFound: (
    appointment: AppointmentSearchResult,
    credentials: AppointmentSearchCredentials,
  ) => void;
  onSearchAnother?: () => void;
};

type ApiResult = {
  error?: unknown;
  appointment?: unknown;
};

function isAppointmentSearchResult(
  value: unknown,
): value is AppointmentSearchResult {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const appointment = value as Record<string, unknown>;
  return (
    typeof appointment.reservationCode === "number" &&
    Number.isSafeInteger(appointment.reservationCode) &&
    typeof appointment.appointmentDate === "string" &&
    typeof appointment.startTime === "string" &&
    typeof appointment.durationMinutes === "number" &&
    Number.isFinite(appointment.durationMinutes) &&
    Array.isArray(appointment.serviceIds) &&
    appointment.serviceIds.every((id) => typeof id === "string") &&
    typeof appointment.totalPrice === "number" &&
    Number.isFinite(appointment.totalPrice) &&
    (typeof appointment.customerName === "string" ||
      appointment.customerName === null)
  );
}

function getSummaryServices(
  appointment: AppointmentSearchResult,
  services: Service[],
): Service[] {
  return appointment.serviceIds.map(
    (id) =>
      services.find((service) => service.id === id) ?? {
        id,
        name: legacyAppointmentServiceNames[id] ?? "Servicio",
        category: "manicura",
        duration: 0,
        price: 0,
      },
  );
}

export default function SearchAppointment({
  services,
  onAppointmentFound,
  onSearchAnother,
}: SearchAppointmentProps) {
  const [reservationCode, setReservationCode] = useState("");
  const [email, setEmail] = useState("");
  const [appointment, setAppointment] =
    useState<AppointmentSearchResult | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function findAppointment(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/appointments/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationCode, email }),
      });
      const result = (await response.json()) as ApiResult;

      if (!response.ok) {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "No se pudo encontrar el turno. Intentá nuevamente.",
        );
      }

      if (!isAppointmentSearchResult(result.appointment)) {
        throw new Error("La respuesta de la búsqueda no es válida.");
      }

      setAppointment(result.appointment);
      onAppointmentFound(result.appointment, { reservationCode, email });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo encontrar el turno. Intentá nuevamente.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  function searchAnotherAppointment() {
    setAppointment(null);
    setReservationCode("");
    setEmail("");
    setMessage("");
    onSearchAnother?.();
  }

  return (
    <section className={styles.search} aria-label="Buscar un turno">
      {appointment ? (
        <>
          <div className={styles.heading}>
            <p className={styles.reservationCode}>
              Turno #{appointment.reservationCode}
              {appointment.customerName && ` · ${appointment.customerName}`}
            </p>
            <h2>Encontramos tu turno.</h2>
          </div>
          <TurnSummary
            services={getSummaryServices(appointment, services)}
            selectedDate={appointment.appointmentDate}
            selectedTime={appointment.startTime.slice(0, 5)}
            durationMinutes={appointment.durationMinutes}
            totalPrice={appointment.totalPrice}
          />
          <button
            type="button"
            className={styles.searchButton}
            onClick={searchAnotherAppointment}
          >
            Buscar otro turno
            <FiArrowRight aria-hidden="true" />
          </button>
        </>
      ) : (
        <>
          <div className={styles.heading}>
            <h2>Encontrá tu turno.</h2>
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
                onChange={(event) => {
                  setReservationCode(
                    event.currentTarget.value.replace(/\D/g, ""),
                  );
                  setMessage("");
                }}
                required
              />
            </label>
            <label>
              Email asociado al turno
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
              <p className={styles.error} role="alert">
                {message}
              </p>
            )}
            <button
              type="submit"
              className={styles.searchButton}
              disabled={
                isBusy || reservationCode.length === 0 || email.trim() === ""
              }
            >
              {isBusy ? (
                <Loading label="Buscando turno..." inline />
              ) : (
                <>
                  Buscar turno
                  <FiArrowRight aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
