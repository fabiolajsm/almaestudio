"use client";

import { useState } from "react";
import type { SubmitEvent } from "react";
import { getArgentinaDateKey } from "../appointmentDates";
import { validateAppointmentContactFields } from "@/lib/appointmentContactValidation";

import { FiArrowLeft, FiArrowRight, FiCheck } from "react-icons/fi";
import AppointmentHeader from "../AppointmentHeader";
import SiteHeader from "../../SiteHeader";
import AppointmentSchedule from "@/components/AppointmentSchedule";
import Loading from "@/components/Loading";
import Services from "@/components/Services";
import TurnSummary from "@/components/TurnSummary";
import useAppointmentSettings from "@/components/useAppointmentSettings";

import styles from "./page.module.css";

const steps = ["Servicio", "Día y hora", "Datos de contacto"];

type ApiError = {
  error?: string;
};

export default function CreateAppointmentPage() {
  const { settings, isLoading: isLoadingSettings, error: settingsError } =
    useAppointmentSettings();
  const [today, setToday] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [reservationCode, setReservationCode] = useState<number | null>(null);
  const [formMessage, setFormMessage] = useState("");
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [editedContactFields, setEditedContactFields] = useState<
    Partial<Record<keyof typeof contact, boolean>>
  >({});
  const { errors: contactErrors } = validateAppointmentContactFields(contact);
  const selectedServices = (settings?.services ?? []).filter((service) =>
    selectedServiceIds.includes(service.id),
  );
  const selectedServicesDuration = selectedServices.reduce(
    (total, service) => total + service.duration,
    0,
  );

  const stepContent = [
    {
      kicker: "Paso 01",
      title: "¿Qué servicios preferís?",
      description: "Podés combinar los servicios en un mismo turno.",
    },
    {
      kicker: "Paso 02",
      title: "Elegí día y horario.",
      description: "Los horarios tachados ya están ocupados.",
    },
    {
      kicker: "Paso 03",
      title: "Tus datos de contacto.",
      description: "Completá tus datos para enviar la solicitud de turno.",
    },
  ][currentStep];

  return (
    <main className="site-shell">
      <SiteHeader />
      <AppointmentHeader
        actionLabel="Sacar turno"
        title="Tu próximo momento."
        description="Elegí con calma. La agenda se actualiza en cada paso."
      />
      <div className={styles.bookingPanel}>
        <div className={styles.workflow}>
          <ol className={styles.stepper} aria-label="Pasos para sacar turno">
            {steps.map((step, index) => {
              const isComplete = index < currentStep || (isSubmitted && index === currentStep);
              const isCurrent = index === currentStep;

              return (
                <li
                  key={step}
                  className={`${styles.step} ${isCurrent ? styles.currentStep : ""} ${isComplete ? styles.completeStep : ""}`}
                >
                  <button
                    type="button"
                    aria-current={isCurrent ? "step" : undefined}
                    disabled={
                      !isComplete ||
                      isBusy ||
                      isSubmitted
                    }
                    onClick={() => void goToStep(index)}
                  >
                    <span className={styles.stepNumber} aria-hidden="true">
                      {isComplete ? <FiCheck /> : index + 1}
                    </span>
                    {step}
                  </button>
                  {index < steps.length - 1 && (
                    <span className={styles.stepConnector} aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ol>

          <section className={styles.stepContent} aria-live="polite">
            <p className={styles.stepKicker}>{stepContent.kicker}</p>
            <h2 className={styles.stepTitle}>{stepContent.title}</h2>
            <p className={styles.stepDescription}>{stepContent.description}</p>
            {settingsError && (
              <p className={styles.formMessage} role="alert">
                {settingsError}
              </p>
            )}

            {currentStep === 0 && (
              settings ? (
                <Services
                  categories={settings.categories}
                  services={settings.services}
                  selectedServiceIds={selectedServiceIds}
                  onToggleService={toggleService}
                />
              ) : isLoadingSettings ? (
                <Loading label="Cargando servicios..." />
              ) : null
            )}

            {currentStep === 1 &&
              (today && settings ? (
                <AppointmentSchedule
                  today={today}
                  serviceDuration={selectedServicesDuration}
                  settings={settings}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onSelectDate={(date) => {
                    setSelectedDate(date);
                    setSelectedTime(null);
                    setFormMessage("");
                  }}
                  onSelectTime={(time) => {
                    setSelectedTime(time || null);
                    setFormMessage("");
                  }}
                  showHeading={false}
                />
              ) : (
                <Loading label="Preparando la agenda..." />
              ))}

            {currentStep === 2 && (
              <div className={styles.contactStep}>
                {isSubmitted ? (
                  <p className={styles.confirmationMessage} role="status">
                    <strong>¡Tu turno fue agendado con éxito!</strong>
                    <br />
                    Código de reserva: <strong>#{reservationCode}</strong>
                    <br />
                    ⚠️ <strong>Guardá este código:</strong> Es muy importante
                    que lo conserves, ya que lo vas a necesitar si querés
                    modificar o cancelar tu reserva más adelante.
                    <br />
                    <em>
                      (En breve vas a recibir un email con el detalle completo
                      de tu turno)
                    </em>
                  </p>
                ) : (
                  <>
                    <form
                      id="appointment-contact-form"
                      className={styles.contactForm}
                      noValidate
                      onSubmit={submitAppointment}
                    >
                      <label>
                        Nombre y apellido
                        <input
                          id="appointment-name"
                          name="name"
                          type="text"
                          autoComplete="name"
                          placeholder="¿Cómo te llamás?"
                          maxLength={100}
                          value={contact.name}
                          aria-invalid={
                            editedContactFields.name &&
                            Boolean(contactErrors.name)
                          }
                          aria-describedby={
                            editedContactFields.name && contactErrors.name
                              ? "appointment-name-error"
                              : undefined
                          }
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            setEditedContactFields((fields) => ({
                              ...fields,
                              name: true,
                            }));
                            setContact((fields) => ({
                              ...fields,
                              name: value,
                            }));
                          }}
                          required
                        />
                        {editedContactFields.name && contactErrors.name && (
                          <span
                            id="appointment-name-error"
                            className={styles.fieldError}
                          >
                            {contactErrors.name}
                          </span>
                        )}
                      </label>
                      <label>
                        Email
                        <input
                          id="appointment-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          placeholder="tu@email.com"
                          maxLength={254}
                          value={contact.email}
                          aria-invalid={
                            editedContactFields.email &&
                            Boolean(contactErrors.email)
                          }
                          aria-describedby={
                            editedContactFields.email && contactErrors.email
                              ? "appointment-email-error"
                              : undefined
                          }
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            setEditedContactFields((fields) => ({
                              ...fields,
                              email: true,
                            }));
                            setContact((fields) => ({
                              ...fields,
                              email: value,
                            }));
                          }}
                          required
                        />
                        {editedContactFields.email && contactErrors.email && (
                          <span
                            id="appointment-email-error"
                            className={styles.fieldError}
                          >
                            {contactErrors.email}
                          </span>
                        )}
                      </label>
                      <label>
                        Teléfono
                        <input
                          id="appointment-phone"
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                          inputMode="tel"
                          placeholder="+54 9 11..."
                          maxLength={30}
                          value={contact.phone}
                          aria-invalid={
                            editedContactFields.phone &&
                            Boolean(contactErrors.phone)
                          }
                          aria-describedby={
                            editedContactFields.phone && contactErrors.phone
                              ? "appointment-phone-error"
                              : undefined
                          }
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            setEditedContactFields((fields) => ({
                              ...fields,
                              phone: true,
                            }));
                            setContact((fields) => ({
                              ...fields,
                              phone: value,
                            }));
                          }}
                          required
                        />
                        {editedContactFields.phone && contactErrors.phone && (
                          <span
                            id="appointment-phone-error"
                            className={styles.fieldError}
                          >
                            {contactErrors.phone}
                          </span>
                        )}
                      </label>
                    </form>
                  </>
                )}
              </div>
            )}

            <div className={styles.stepActions}>
              {currentStep > 0 && !isSubmitted && (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={isBusy}
                  onClick={() => void goToStep(currentStep - 1)}
                >
                  <FiArrowLeft aria-hidden="true" />
                  Atrás
                </button>
              )}
              {currentStep < 2 ? (
                <button
                  key="continue"
                  type="button"
                  className={styles.primaryButton}
                  disabled={
                    isBusy ||
                    !settings ||
                    (currentStep === 0 && selectedServiceIds.length === 0) ||
                    (currentStep === 1 && (!selectedDate || !selectedTime))
                  }
                  onClick={() => void continueToNextStep()}
                >
                  {isBusy ? (
                    <Loading label="Continuando..." inline />
                  ) : (
                    "Continuar"
                  )}
                  {!isBusy && <FiArrowRight aria-hidden="true" />}
                </button>
              ) : (
                !isSubmitted && (
                  <button
                    key="submit"
                    type="submit"
                    form="appointment-contact-form"
                    className={styles.primaryButton}
                    disabled={
                      isBusy ||
                      Boolean(
                        contactErrors.name ||
                          contactErrors.email ||
                          contactErrors.phone,
                      )
                    }
                  >
                    {isBusy ? (
                      <Loading label="Enviando..." inline />
                    ) : (
                      "Solicitar turno"
                    )}
                    {!isBusy && <FiArrowRight aria-hidden="true" />}
                  </button>
                )
              )}
            </div>
            {formMessage && (
              <p className={styles.formMessage} role="alert">
                {formMessage}
              </p>
            )}
          </section>
        </div>

        <TurnSummary
          services={selectedServices}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
        />
      </div>
    </main>
  );

  function toggleService(serviceId: string) {
    setSelectedServiceIds((currentServiceIds) =>
      currentServiceIds.includes(serviceId)
        ? currentServiceIds.filter((id) => id !== serviceId)
        : [...currentServiceIds, serviceId],
    );
    setSelectedTime(null);
  }

  function continueToNextStep() {
    if (currentStep === 0 && settings && selectedServiceIds.length > 0) {
      setToday(getArgentinaDateKey(new Date()));
      setFormMessage("");
      setCurrentStep(1);
      return;
    }

    if (!settings || currentStep !== 1 || !selectedDate || !selectedTime) {
      return;
    }

    setFormMessage("");
    setCurrentStep(2);
  }

  function goToStep(step: number) {
    if (step < 0 || step >= currentStep || isSubmitted) {
      return;
    }

    setFormMessage("");
    setCurrentStep(step);
  }

  async function submitAppointment(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const { errors } = validateAppointmentContactFields(contact);
    const firstInvalidField = (["name", "email", "phone"] as const).find(
      (field) => errors[field],
    );
    if (firstInvalidField) {
      document.getElementById(`appointment-${firstInvalidField}`)?.focus();
      return;
    }

    if (!selectedDate || !selectedTime || selectedServiceIds.length === 0) {
      setFormMessage("Volvé a elegir los servicios, la fecha y el horario.");
      return;
    }

    setIsBusy(true);
    setFormMessage("");

    try {
      const response = await fetch("/api/appointments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          time: selectedTime,
          serviceIds: selectedServiceIds,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
        }),
      });
      const result = (await response.json()) as ApiError & {
        status?: string;
        appointment_id?: string;
        reservation_code?: number;
      };
      const code = result.reservation_code;

      if (!response.ok) {
        if (response.status === 409) {
          setSelectedDate(null);
          setSelectedTime(null);
        }
        throw new Error(
          result.error || "No se pudo completar la reserva. Intentá nuevamente.",
        );
      }

      if (
        result.status !== "confirmed" ||
        !result.appointment_id ||
        typeof code !== "number" ||
        !Number.isSafeInteger(code) ||
        code <= 0
      ) {
        throw new Error(
          result.error ||
            "No se pudo completar la reserva. Intentá nuevamente.",
        );
      }

      setReservationCode(code);
      setIsSubmitted(true);
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : "No se pudo completar la reserva. Intentá nuevamente.",
      );
    } finally {
      setIsBusy(false);
    }
  }
}
