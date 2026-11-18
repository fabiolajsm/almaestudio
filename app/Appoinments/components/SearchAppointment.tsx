"use client";

import { useState } from "react";
import type { SubmitEvent } from "react";
import { FiArrowRight } from "react-icons/fi";
import {
  EMAIL_MAX_LENGTH,
  ERROR_MESSAGES,
  NON_DIGIT_PATTERN,
  RESERVATION_CODE_MAX_LENGTH,
} from "@/app/constants";
import Loading from "../../../components/Loading";
import TurnSummary from "./TurnSummary";
import type {
  AppointmentSearchApiResult,
  AppointmentSearchResult,
  SearchAppointmentProps,
} from "@/app/Appoinments/types";
import type {
  AppointmentService,
  AppointmentServiceCategoryDefinition,
} from "@/app/types";
import { validateAppointmentLookupCredentials } from "@/app/validations";
import styles from "./SearchAppointment.module.css";

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
  services: AppointmentService[],
  categories: AppointmentServiceCategoryDefinition[],
): AppointmentService[] {
  const fallbackCategory = categories[0]?.id ?? "";

  return appointment.serviceIds.map(
    (id) =>
      services.find((service) => service.id === id) ?? {
        id,
        name: "Servicio",
        category: fallbackCategory,
        duration: 0,
        price: 0,
      },
  );
}

export default function SearchAppointment({
  categories,
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
  const credentialsValidation = validateAppointmentLookupCredentials({
    reservationCode,
    email,
  });
  const credentialsError =
    reservationCode || email.trim()
      ? credentialsValidation.success
        ? ""
        : credentialsValidation.error
      : "";
  const visibleMessage = message || credentialsError;

  async function findAppointment(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!credentialsValidation.success) {
      setMessage(credentialsValidation.error);
      return;
    }

    setIsBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/appointments/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentialsValidation.data),
      });
      const result = (await response.json()) as AppointmentSearchApiResult;

      if (!response.ok) {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : ERROR_MESSAGES.APPOINTMENT_NOT_FOUND,
        );
      }

      if (!isAppointmentSearchResult(result.appointment)) {
        throw new Error("La respuesta de la búsqueda no es válida.");
      }

      setAppointment(result.appointment);
      onAppointmentFound(result.appointment, credentialsValidation.data);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : ERROR_MESSAGES.APPOINTMENT_NOT_FOUND,
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
            <p className={styles.title}>Encontramos tu turno:</p>
            <h2>
              Turno #{appointment.reservationCode}
              {appointment.customerName && ` · ${appointment.customerName}`}
            </h2>
          </div>
          <TurnSummary
            services={getSummaryServices(appointment, services, categories)}
            selectedDate={appointment.appointmentDate}
            selectedTime={appointment.startTime.slice(0, 5)}
            durationMinutes={appointment.durationMinutes}
            totalPrice={appointment.totalPrice}
          />
          <button
            type="button"
            className={`secondary-button ${styles.searchButton}`}
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
                maxLength={RESERVATION_CODE_MAX_LENGTH}
                value={reservationCode}
                onChange={(event) => {
                  setReservationCode(
                    event.currentTarget.value.replace(NON_DIGIT_PATTERN, ""),
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
                maxLength={EMAIL_MAX_LENGTH}
                value={email}
                onChange={(event) => {
                  setEmail(event.currentTarget.value);
                  setMessage("");
                }}
                required
              />
            </label>
            {visibleMessage && (
              <p className={styles.error} role="alert">
                {visibleMessage}
              </p>
            )}
            <button
              type="submit"
              className={`primary-button ${styles.searchButton}`}
              disabled={
                isBusy || !credentialsValidation.success
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
