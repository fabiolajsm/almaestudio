"use client";

import { useState, useSyncExternalStore } from "react";
import { FiArrowLeft, FiCheck, FiEdit3 } from "react-icons/fi";
import { FaRegCalendarAlt } from "react-icons/fa";
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
import useAppointmentSettings from "@/components/useAppointmentSettings";
import ConfirmDialog from "@/components/ConfirmDialog";
import SuccessState from "../SuccessState";
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
  const {
    settings,
    isLoading: isLoadingSettings,
    error: settingsError,
  } = useAppointmentSettings();
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
  const [showModifyConfirmation, setShowModifyConfirmation] = useState(false);
  const currentSelectedDate = selectedDate || initialDate;

  const selectedServices = (settings?.services ?? []).filter((service) =>
    selectedServiceIds.includes(service.id),
  );
  const selectedDuration = selectedServices.reduce(
    (total, service) => total + service.duration,
    0,
  );

  // Comparamos si hubo cambios reales respecto al turno original
  const hasChanges = appointment
    ? JSON.stringify([...selectedServiceIds].sort()) !==
        JSON.stringify([...appointment.serviceIds].sort()) ||
      selectedDate !== appointment.appointmentDate ||
      selectedTime !== appointment.startTime.slice(0, 5)
    : false;

  return (
    <main className="site-shell">
      <SiteHeader />
      <AppointmentHeader
        actionLabel="Modificar turno"
        title="Hacé lugar a un cambio."
        description={
          !isSaved
            ? "Buscá tu reserva con el código y el email asociado para modificarla."
            : undefined
        }
      />

      {isSaved ? (
        <SuccessState
          icon={<FaRegCalendarAlt />}
          title="¡Turno modificado con éxito!"
          description={
            <>
              La reserva <strong>#{reservationCode}</strong> fue actualizada
              correctamente. En breve recibirás un email con el detalle completo
              del turno modificado.
            </>
          }
        />
      ) : (
        <>
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
            <section
              id="edit-appointment"
              className={styles.modifyContainer}
              aria-labelledby="edit-title"
            >
              <h3 className={styles.modifyTitle}>Modificá tu turno actual</h3>
              <p className={styles.modifyDescription}>
                Tus datos actuales (servicios, fecha y horario) ya están
                preseleccionados para que puedas editarlos fácilmente. En caso
                de necesitar cambiar el contacto asociado al turno, deberás
                cancelar la reserva y crear una nueva.
              </p>

              <div>
                <h3 className={styles.editorSectionText}>Servicios</h3>
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
                    }}
                  />
                ) : isLoadingSettings ? (
                  <Loading label="Cargando servicios..." />
                ) : (
                  <p role="errorMessage">{settingsError}</p>
                )}
              </div>

              <div>
                <h3 className={styles.editorSectionText}>Fechas</h3>
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
                    }}
                    onSelectTime={(time) => {
                      setSelectedTime(time || "");
                      setMessage("");
                    }}
                    showHeading={false}
                  />
                ) : isLoadingSettings ? (
                  <Loading label="Preparando la agenda..." />
                ) : (
                  <p role="errorMessage">{settingsError}</p>
                )}
              </div>

              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={isBusy}
                  onClick={discardChanges}
                >
                  <FiArrowLeft aria-hidden="true" />
                  Descartar cambios
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={
                    isBusy ||
                    !settings ||
                    isLoadingSettings ||
                    selectedServiceIds.length === 0 ||
                    !selectedDate ||
                    !selectedTime ||
                    !hasChanges
                  }
                  onClick={() => setShowModifyConfirmation(true)}
                >
                  <FiCheck aria-hidden="true" />
                  Guardar cambios
                </button>
              </div>
            </section>
          )}

          <ConfirmDialog
            isOpen={showModifyConfirmation}
            title="¿Confirmar los cambios en el turno?"
            description="Se actualizarán los servicios y/o el horario de tu reserva."
            cancelText="Volver a revisar"
            confirmText="Sí, guardar cambios"
            isBusy={isBusy}
            onCancel={() => setShowModifyConfirmation(false)}
            onConfirm={() => void submitAppointmentAction()}
          />
        </>
      )}
    </main>
  );

  async function submitAppointmentAction() {
    setIsBusy(true);
    setMessage("");

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
        setIsSaved(true);
        setShowModifyConfirmation(false);
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
      setShowModifyConfirmation(false);
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
  }
}
