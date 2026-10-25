"use client";

import { FormEvent, useState } from "react";
import { FiArrowLeft, FiArrowRight, FiCheck } from "react-icons/fi";
import AppointmentHeader from "../AppointmentHeader";
import SiteHeader from "../../SiteHeader";
import AppointmentSchedule from "@/components/AppointmentSchedule";
import Services, { services } from "@/components/Services";
import TurnSummary from "@/components/TurnSummary";
import styles from "./page.module.css";

const steps = ["Servicio", "Fecha y hora", "Tus datos"];

export default function CreateAppointmentClient({ today }: { today: string }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState("");
  const selectedServices = services.filter((service) =>
    selectedServiceIds.includes(service.id),
  );

  function toggleService(serviceId: string) {
    setSelectedServiceIds((currentServiceIds) =>
      currentServiceIds.includes(serviceId)
        ? currentServiceIds.filter((id) => id !== serviceId)
        : [...currentServiceIds, serviceId],
    );
  }

  function continueToNextStep() {
    if (currentStep === 0 && selectedServiceIds.length === 0) {
      return;
    }
    if (currentStep === 1 && (!selectedDate || !selectedTime)) {
      return;
    }

    setFormMessage("");
    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  }

  function submitAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage(
      "Tus datos están completos. Para confirmar el turno, falta conectar la agenda.",
    );
  }

  const stepContent = [
    {
      kicker: "Paso 01",
      title: "¿Qué servicios preferís?",
      description: "Podés combinar uñas, cejas y pestañas en un mismo turno.",
    },
    {
      kicker: "Paso 02",
      title: "Elegí día y horario.",
      description: "Los horarios tachados ya están ocupados.",
    },
    {
      kicker: "Paso 03",
      title: "Un último detalle.",
      description: "Solo necesitamos estos datos para dejar lista tu reserva.",
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
                    disabled={!isComplete}
                    onClick={() => setCurrentStep(index)}
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
              <Services
                selectedServiceIds={selectedServiceIds}
                onToggleService={toggleService}
                showHeading={false}
              />
            )}

            {currentStep === 1 && (
              <AppointmentSchedule
                today={today}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                onSelectDate={(date) => {
                  setSelectedDate(date);
                  setSelectedTime(null);
                }}
                onSelectTime={(time) => setSelectedTime(time || null)}
                showHeading={false}
              />
            )}

            {currentStep === 2 && (
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
                    required
                  />
                </label>
              </form>
            )}

            <div className={styles.stepActions}>
              {currentStep > 0 && (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    setFormMessage("");
                    setCurrentStep((step) => step - 1);
                  }}
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
                    (currentStep === 0 && selectedServiceIds.length === 0) ||
                    (currentStep === 1 && (!selectedDate || !selectedTime))
                  }
                  onClick={continueToNextStep}
                >
                  Continuar
                  <FiArrowRight aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="submit"
                  form="appointment-contact-form"
                  className={styles.primaryButton}
                >
                  Confirmar turno
                  <FiArrowRight aria-hidden="true" />
                </button>
              )}
            </div>
            {formMessage && (
              <p className={styles.formMessage} role="status">
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
}
