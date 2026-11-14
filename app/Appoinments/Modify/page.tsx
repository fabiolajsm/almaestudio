"use client";

import { useState, useSyncExternalStore } from "react";
import { FiArrowLeft, FiCheck } from "react-icons/fi";
import AppointmentHeader from "../AppointmentHeader";
import SiteHeader from "../../../components/SiteHeader";
import AppointmentSchedule from "@/components/AppointmentSchedule";
import Loading from "@/components/Loading";
import SearchAppointment from "@/components/SearchAppointment";
import type {
  AppointmentSearchCredentials,
  AppointmentSearchResult,
} from "@/components/SearchAppointment";
import Services from "@/components/Services";
import TurnSummary from "@/components/TurnSummary";
import useAppointmentSettings from "@/components/useAppointmentSettings";
import {
  getArgentinaDateKey,
  getNextAppointmentDate,
} from "../appointmentDates";
import styles from "./page.module.css";

function subscribeToDateChanges() {
  return () => {};
}

function getCurrentArgentinaDate() {
  return getArgentinaDateKey(new Date());
}

function getServerDate() {
  return "";
}

type ModifyApiResult = {
  error?: unknown;
  modified?: unknown;
};

export default function ModifyAppointmentPage() {
  const { settings, isLoading: isLoadingSettings, error: settingsError } =
    useAppointmentSettings();
  const today = useSyncExternalStore(
    subscribeToDateChanges,
    getCurrentArgentinaDate,
    getServerDate,
  );
  const initialDate = today
    ? getNextAppointmentDate(today, settings?.workingDays)
    : "";
  const [reservationCode, setReservationCode] = useState("");
  const [email, setEmail] = useState("");
  const [appointment, setAppointment] =
    useState<AppointmentSearchResult | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const currentSelectedDate = selectedDate || initialDate;

  const selectedServices = (settings?.services ?? []).filter((service) =>
    selectedServiceIds.includes(service.id),
  );
  const selectedDuration = selectedServices.reduce(
    (total, service) => total + service.duration,
    0,
  );

  async function submitAppointmentAction() {
    setIsBusy(true);
    setMessage("");
    setIsSaved(false);

    try {
      const response = await fetch("/api/appointments/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "modify",
          reservationCode,
          email,
          date: selectedDate,
          time: selectedTime,
          serviceIds: selectedServiceIds,
        }),
      });
      const result = (await response.json()) as ModifyApiResult;

      if (response.ok && result.modified === true) {
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

  function handleAppointmentFound(
    foundAppointment: AppointmentSearchResult,
    credentials: AppointmentSearchCredentials,
  ) {
    setAppointment(foundAppointment);
    setReservationCode(credentials.reservationCode);
    setEmail(credentials.email);
    setSelectedServiceIds(foundAppointment.serviceIds);
    setSelectedDate(foundAppointment.appointmentDate);
    setSelectedTime(foundAppointment.startTime.slice(0, 5));
    setMessage("");
    setIsSaved(false);
  }

  function searchAnotherAppointment() {
    setAppointment(null);
    setReservationCode("");
    setEmail("");
    setSelectedServiceIds([]);
    setSelectedDate(initialDate);
    setSelectedTime("");
    setMessage("");
    setIsSaved(false);
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

      <SearchAppointment
        services={settings?.services ?? []}
        onAppointmentFound={handleAppointmentFound}
        onSearchAnother={searchAnotherAppointment}
      />
      {settingsError && (
        <p className={styles.message} role="alert">
          {settingsError}
        </p>
      )}

      {appointment && (
        <div className={styles.modifyLayout}>
          <section
            className={styles.reservation}
            aria-label="Resumen de la reserva"
          >
            <p className={styles.reservationCode}>
              Turno #{appointment.reservationCode}
              {appointment.customerName && ` · ${appointment.customerName}`}
            </p>
            <p className={styles.eyebrow}>Vista previa de los cambios</p>
            <TurnSummary
              services={selectedServices}
              selectedDate={currentSelectedDate}
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
              {settings ? (
                <Services
                  categories={settings.categories}
                  services={settings.services}
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
              ) : isLoadingSettings ? (
                <Loading label="Cargando servicios..." />
              ) : (
                <p role="alert">{settingsError}</p>
              )}
            </div>

            <div className={styles.editorSection}>
              <h3>Fecha y horario</h3>
              {today && settings ? (
                <AppointmentSchedule
                  today={today}
                  serviceDuration={selectedDuration}
                  settings={settings}
                  selectedDate={currentSelectedDate}
                  selectedTime={selectedTime}
                  appointmentLookup={{
                    reservationCode: appointment.reservationCode,
                    email,
                  }}
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
              ) : isLoadingSettings ? (
                <Loading label="Preparando la agenda..." />
              ) : (
                <p role="alert">{settingsError}</p>
              )}
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
                      !settings ||
                      isLoadingSettings ||
                  selectedServiceIds.length === 0 ||
                  !selectedDate ||
                  !selectedTime
                }
                onClick={() => void submitAppointmentAction()}
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
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
