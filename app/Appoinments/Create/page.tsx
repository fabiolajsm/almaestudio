"use client";

import { useState } from "react";
import type { SubmitEvent } from "react";
import { getArgentinaDateKey } from "../appointmentDates";

import { FiArrowLeft, FiArrowRight, FiCheck } from "react-icons/fi";
import AppointmentHeader from "../AppointmentHeader";
import SiteHeader from "../../SiteHeader";
import AppointmentSchedule from "@/components/AppointmentSchedule";
import Services, { services } from "@/components/Services";
import TurnSummary from "@/components/TurnSummary";

import styles from "./page.module.css";

const steps = ["Servicio", "Día y hora", "Datos de contacto"];

type ApiError = {
  error?: string;
};

export default function CreateAppointmentPage() {
  const [today, setToday] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const selectedServices = services.filter((service) =>
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
              const isComplete = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <li
                  key={step}
                  className={`${styles.step} ${isCurrent ? styles.currentStep : ""} ${isComplete ? styles.completeStep : ""}`}
                >
                  <button
                    type="button"
                    aria-current={isCurrent ? "step" : undefined}
                    disabled={!isComplete || isBusy || isSubmitted}
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

            {currentStep === 0 && (
              <>
                <Services
                  selectedServiceIds={selectedServiceIds}
                  onToggleService={toggleService}
                />
              </>
            )}

            {currentStep === 1 &&
              (today ? (
                <AppointmentSchedule
                  today={today}
                  serviceDuration={selectedServicesDuration}
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
                <p className={styles.stepDescription}>
                  Preparando la agenda...
                </p>
              ))}

            {currentStep === 2 && (
              <div className={styles.contactStep}>
                {isSubmitted ? (
                  <p className={styles.confirmationMessage} role="status">
                    Creamos el turno en la agenda. La solicitud quedó pendiente
                    de confirmación y te contactaremos por WhatsApp.
                  </p>
                ) : (
                  <>
                    <div className={styles.holdNotice}>
                      Al enviar tus datos, verificaremos la disponibilidad y
                      crearemos el turno en la agenda.
                    </div>

                    <form
                      id="appointment-contact-form"
                      className={styles.contactForm}
                      onSubmit={submitAppointment}
                    >
                      <label>
                        Nombre y apellido
                        <input
                          name="name"
                          type="text"
                          autoComplete="name"
                          placeholder="¿Cómo te llamás?"
                          maxLength={100}
                          required
                        />
                      </label>
                      <label>
                        Email
                        <input
                          name="email"
                          type="email"
                          autoComplete="email"
                          placeholder="tu@email.com"
                          maxLength={254}
                          required
                        />
                      </label>
                      <label>
                        WhatsApp
                        <input
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                          placeholder="+54 9 11..."
                          minLength={8}
                          maxLength={30}
                          required
                        />
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
                  type="button"
                  className={styles.primaryButton}
                  disabled={
                    isBusy ||
                    (currentStep === 0 && selectedServiceIds.length === 0) ||
                    (currentStep === 1 &&
                      (!selectedDate || !selectedTime))
                  }
                  onClick={() => void continueToNextStep()}
                >
                  {isBusy ? "Continuando..." : "Continuar"}
                  {!isBusy && <FiArrowRight aria-hidden="true" />}
                </button>
              ) : (
                !isSubmitted && (
                  <button
                    type="submit"
                    form="appointment-contact-form"
                    className={styles.primaryButton}
                    disabled={isBusy}
                  >
                    {isBusy ? "Enviando..." : "Solicitar turno"}
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
    if (
      currentStep === 0 &&
      selectedServiceIds.length > 0
    ) {
      setToday(getArgentinaDateKey(new Date()));
      setFormMessage("");
      setCurrentStep(1);
      return;
    }

    if (
      currentStep !== 1 ||
      !selectedDate ||
      !selectedTime
    ) {
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

    if (!selectedDate || !selectedTime || selectedServiceIds.length === 0) {
      setFormMessage("Volvé a elegir los servicios, la fecha y el horario.");
      return;
    }

    setIsBusy(true);
    setFormMessage("");

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/appointments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          time: selectedTime,
          serviceIds: selectedServiceIds,
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
        }),
      });
      const result = (await response.json()) as ApiError & {
        status?: string;
      };

      if (!response.ok || result.status !== "pending_review") {
        throw new Error(
          result.error || "No se pudo completar la reserva. Intentá nuevamente.",
        );
      }

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
