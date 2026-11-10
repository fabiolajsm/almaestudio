"use client";

import { useEffect, useState } from "react";
import type { SubmitEvent } from "react";
import { getArgentinaDateKey } from "../appointmentDates";
import { appointmentDepositAmount } from "@/lib/appointmentPayment";
import { validateAppointmentContactFields } from "@/lib/appointmentContactValidation";

import { FiArrowLeft, FiArrowRight, FiCheck } from "react-icons/fi";
import AppointmentHeader from "../AppointmentHeader";
import SiteHeader from "../../SiteHeader";
import AppointmentSchedule from "@/components/AppointmentSchedule";
import Loading from "@/components/Loading";
import Services, { services } from "@/components/Services";
import TurnSummary from "@/components/TurnSummary";

import styles from "./page.module.css";

const steps = ["Servicio", "Día y hora", "Datos de contacto"];

type ApiError = {
  error?: string;
};

type PaymentStatus =
  | "PENDING"
  | "SUCCESS"
  | "OVERPAID"
  | "UNDERPAID"
  | "EXPIRED";

type PaymentInfo = {
  appointmentId: string;
  paymentUrl: string;
  expiresAt: string;
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
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("PENDING");
  const [isReservationCancelled, setIsReservationCancelled] = useState(false);
  const [paymentCheckMessage, setPaymentCheckMessage] = useState("");
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [editedContactFields, setEditedContactFields] = useState<
    Partial<Record<keyof typeof contact, boolean>>
  >({});
  const { errors: contactErrors } = validateAppointmentContactFields(contact);
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

  useEffect(() => {
    if (
      !paymentInfo ||
      paymentStatus === "SUCCESS" ||
      paymentStatus === "EXPIRED"
    ) {
      return;
    }

    const controller = new AbortController();
    const checkStatus = async () => {
      try {
        const response = await fetch(
          `/api/appointments/payment-status?id=${encodeURIComponent(paymentInfo.appointmentId)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const result = (await response.json()) as ApiError & {
          payment_status?: unknown;
          reservation_status?: unknown;
        };
        if (!response.ok || !isPaymentStatus(result.payment_status)) {
          throw new Error(
            result.error || "No se pudo consultar el estado del pago.",
          );
        }

        setPaymentStatus(result.payment_status);
        setIsReservationCancelled(result.reservation_status === "cancelled");
        setPaymentCheckMessage("");
        if (
          result.payment_status === "SUCCESS" &&
          result.reservation_status !== "cancelled"
        ) {
          setIsSubmitted(true);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setPaymentCheckMessage(
          error instanceof Error
            ? error.message
            : "No se pudo consultar el estado del pago.",
        );
      }
    };

    void checkStatus();
    const intervalId = window.setInterval(() => void checkStatus(), 5000);
    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [paymentInfo, paymentStatus]);

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
                    disabled={
                      !isComplete ||
                      isBusy ||
                      isSubmitted ||
                      paymentInfo !== null
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
                <Loading label="Preparando la agenda..." />
              ))}

            {currentStep === 2 && (
              <div className={styles.contactStep}>
                {paymentStatus === "SUCCESS" && isReservationCancelled ? (
                  <p className={styles.formMessage} role="alert">
                    El pago se acreditó, pero el horario ya no está reservado.
                    Contactanos para resolverlo.
                  </p>
                ) : paymentStatus === "SUCCESS" ? (
                  <p className={styles.confirmationMessage} role="status">
                    Recibimos la seña de
                    {formatAmount(appointmentDepositAmount)}. La solicitud quedó
                    pendiente de confirmación y te contactaremos por WhatsApp.
                  </p>
                ) : paymentInfo ? (
                  <div className={styles.paymentPanel}>
                    {paymentStatus === "EXPIRED" ? (
                      <>
                        <p className={styles.formMessage} role="status">
                          El plazo para pagar venció y el horario fue liberado.
                          Elegí un nuevo horario para volver a solicitar el
                          turno.
                        </p>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={restartPaymentSelection}
                        >
                          Elegir otro horario
                        </button>
                      </>
                    ) : (
                      <>
                        <p className={styles.holdNotice} role="status">
                          {paymentStatus === "PENDING"
                            ? `El horario está reservado. Para completar la solicitud, aboná la seña de ${formatAmount(appointmentDepositAmount)} mediante transferencia.`
                            : "Talo todavía no confirmó el importe exacto. Revisá la transferencia; el horario sigue reservado mientras el pago esté vigente."}
                        </p>
                        <p className={styles.stepDescription}>
                          El pago vence el
                          {new Intl.DateTimeFormat("es-AR", {
                            dateStyle: "short",
                            timeStyle: "short",
                            timeZone: "America/Argentina/Buenos_Aires",
                          }).format(new Date(paymentInfo.expiresAt))}
                          .
                        </p>
                        <a
                          className={styles.primaryButton}
                          href={paymentInfo.paymentUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Continuar al pago de Talo
                          <FiArrowRight aria-hidden="true" />
                        </a>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          disabled={isCheckingPayment}
                          onClick={() => void refreshPaymentStatus()}
                        >
                          {isCheckingPayment ? (
                            <Loading label="Consultando..." inline />
                          ) : (
                            "Ya hice la transferencia"
                          )}
                        </button>
                        {paymentCheckMessage && (
                          <p className={styles.formMessage} role="alert">
                            {paymentCheckMessage}
                          </p>
                        )}
                      </>
                    )}
                  </div>
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
                    <div className={styles.holdNotice}>
                      Para confirmar tu turno, aboná una seña de{" "}
                      {formatAmount(appointmentDepositAmount)} pesos mediante
                      transferencia bancaria de forma 100% segura. Tu lugar
                      quedará reservado durante 15 min hasta que se complete el
                      pago.
                    </div>
                  </>
                )}
              </div>
            )}

            <div className={styles.stepActions}>
              {currentStep > 0 && !isSubmitted && !paymentInfo && (
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
                !isSubmitted &&
                !paymentInfo && (
                  <button
                    type="submit"
                    form="appointment-contact-form"
                    className={styles.primaryButton}
                    disabled={isBusy}
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
  function isPaymentStatus(value: unknown): value is PaymentStatus {
    return (
      typeof value === "string" &&
      ["PENDING", "SUCCESS", "OVERPAID", "UNDERPAID", "EXPIRED"].includes(value)
    );
  }

  function toggleService(serviceId: string) {
    setSelectedServiceIds((currentServiceIds) =>
      currentServiceIds.includes(serviceId)
        ? currentServiceIds.filter((id) => id !== serviceId)
        : [...currentServiceIds, serviceId],
    );
    setSelectedTime(null);
  }

  function continueToNextStep() {
    if (currentStep === 0 && selectedServiceIds.length > 0) {
      setToday(getArgentinaDateKey(new Date()));
      setFormMessage("");
      setCurrentStep(1);
      return;
    }

    if (currentStep !== 1 || !selectedDate || !selectedTime) {
      return;
    }

    setFormMessage("");
    setCurrentStep(2);
  }

  function goToStep(step: number) {
    if (step < 0 || step >= currentStep || isSubmitted || paymentInfo) {
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
        payment_url?: string;
        payment_expires_at?: string;
        payment_status?: PaymentStatus;
      };

      if (
        !response.ok ||
        !["payment_pending", "payment_success"].includes(result.status ?? "") ||
        !result.appointment_id ||
        !result.payment_url ||
        !result.payment_expires_at
      ) {
        throw new Error(
          result.error ||
            "No se pudo completar la reserva. Intentá nuevamente.",
        );
      }

      setPaymentInfo({
        appointmentId: result.appointment_id,
        paymentUrl: result.payment_url,
        expiresAt: result.payment_expires_at,
      });
      setPaymentStatus(result.payment_status ?? "PENDING");
      setIsSubmitted(result.payment_status === "SUCCESS");
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

  async function refreshPaymentStatus() {
    if (!paymentInfo) {
      return;
    }

    setIsCheckingPayment(true);
    setPaymentCheckMessage("");
    try {
      const response = await fetch(
        `/api/appointments/payment-status?id=${encodeURIComponent(paymentInfo.appointmentId)}`,
        { cache: "no-store" },
      );
      const result = (await response.json()) as ApiError & {
        payment_status?: unknown;
        reservation_status?: unknown;
      };
      if (!response.ok || !isPaymentStatus(result.payment_status)) {
        throw new Error(
          result.error || "No se pudo consultar el estado del pago.",
        );
      }

      setPaymentStatus(result.payment_status);
      setIsReservationCancelled(result.reservation_status === "cancelled");
      if (
        result.payment_status === "SUCCESS" &&
        result.reservation_status !== "cancelled"
      ) {
        setIsSubmitted(true);
      }
    } catch (error) {
      setPaymentCheckMessage(
        error instanceof Error
          ? error.message
          : "No se pudo consultar el estado del pago.",
      );
    } finally {
      setIsCheckingPayment(false);
    }
  }

  function restartPaymentSelection() {
    setPaymentInfo(null);
    setPaymentStatus("PENDING");
    setIsReservationCancelled(false);
    setIsSubmitted(false);
    setSelectedDate(null);
    setSelectedTime(null);
    setFormMessage("");
    setPaymentCheckMessage("");
    setCurrentStep(1);
  }

  function formatAmount(amount: number) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
