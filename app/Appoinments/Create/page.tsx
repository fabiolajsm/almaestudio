"use client";

import { useEffect, useState } from "react";
import type { SubmitEvent } from "react";
import { getArgentinaDateKey } from "../appointmentDates";

import { appointmentDeposit } from "../appointmentCatalog";
import { FiArrowLeft, FiArrowRight, FiCheck, FiUpload } from "react-icons/fi";
import AppointmentHeader from "../AppointmentHeader";
import SiteHeader from "../../SiteHeader";
import AppointmentSchedule from "@/components/AppointmentSchedule";
import Services, { services } from "@/components/Services";
import TurnSummary from "@/components/TurnSummary";

import styles from "./page.module.css";

const steps = ["Servicio", "Día y hora", "Seña y contacto"];

type TransferConfig = {
  accountHolder: string | null;
  alias: string | null;
  cbu: string | null;
  deposit: number;
  configured: boolean;
};

type ApiError = {
  error?: string;
};

function formatRemainingTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export default function CreateAppointmentPage() {
  const [today, setToday] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [transferConfig, setTransferConfig] = useState<TransferConfig | null>(
    null,
  );
  const [configLoading, setConfigLoading] = useState(true);
  const [holdId, setHoldId] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [clockNow, setClockNow] = useState(0);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const selectedServices = services.filter((service) =>
    selectedServiceIds.includes(service.id),
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
      title: "Seña y datos de contacto.",
      description:
        "Transferí la seña fija de $ 5.000 y adjuntá el comprobante para reservar.",
    },
  ][currentStep];

  const remainingSeconds = holdExpiresAt
    ? Math.max(0, Math.ceil((Date.parse(holdExpiresAt) - clockNow) / 1000))
    : 0;
  const holdExpired = Boolean(holdExpiresAt) && remainingSeconds === 0;

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/appointments/config", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("No se pudo cargar la información de pago.");
        }

        return (await response.json()) as TransferConfig;
      })
      .then(setTransferConfig)
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setFormMessage("No se pudo cargar la información de pago. Recargá la página.");
      })
      .finally(() => setConfigLoading(false));

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!holdExpiresAt) {
      return;
    }

    const intervalId = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [holdExpiresAt]);

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
                    disabled={!isComplete || isBusy || isConfirmed}
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
              <Services
                selectedServiceIds={selectedServiceIds}
                onToggleService={toggleService}
              />
            )}

            {currentStep === 1 &&
              (today ? (
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
              ) : (
                <p className={styles.stepDescription}>
                  Preparando la agenda...
                </p>
              ))}

            {currentStep === 2 && (
              <div className={styles.paymentStep}>
                {isConfirmed ? (
                  <p className={styles.confirmationMessage} role="status">
                    Recibimos tu comprobante. El turno quedó reservado por 24
                    horas mientras verificamos el pago. Te contactaremos por
                    WhatsApp.
                  </p>
                ) : holdExpired ? (
                  <p className={styles.formMessage} role="alert">
                    Venció el tiempo para completar la reserva. Volvé a elegir
                    un horario para intentarlo nuevamente.
                  </p>
                ) : (
                  <>
                    <div className={styles.holdNotice} role="timer">
                      Tenés {formatRemainingTime(remainingSeconds)} para
                      completar la reserva.
                    </div>

                    <section
                      className={styles.transferDetails}
                      aria-labelledby="transfer-title"
                    >
                      <h3 id="transfer-title">Datos para transferir</h3>
                      <p>
                        Seña fija:{" "}
                        <strong>
                          $ {new Intl.NumberFormat("es-AR").format(appointmentDeposit)}
                        </strong>
                      </p>
                      <dl>
                        <div>
                          <dt>Titular</dt>
                          <dd>{transferConfig?.accountHolder}</dd>
                        </div>
                        {transferConfig?.alias && (
                          <div>
                            <dt>Alias</dt>
                            <dd>{transferConfig.alias}</dd>
                          </div>
                        )}
                        {transferConfig?.cbu && (
                          <div>
                            <dt>CBU/CVU</dt>
                            <dd>{transferConfig.cbu}</dd>
                          </div>
                        )}
                      </dl>
                    </section>

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
                      <label className={styles.proofField}>
                        Comprobante de transferencia
                        <span className={styles.fileInput}>
                          <FiUpload aria-hidden="true" />
                          <span>
                            {proofFile
                              ? proofFile.name
                              : "Elegí una imagen (JPG, PNG o WEBP)"}
                          </span>
                          <input
                            name="proof"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            aria-label="Subir imagen del comprobante"
                            onChange={handleProofChange}
                            required
                          />
                        </span>
                        <span className={styles.proofHelp}>
                          Tamaño máximo: 5 MB.
                        </span>
                      </label>
                    </form>
                  </>
                )}
              </div>
            )}

            <div className={styles.stepActions}>
              {currentStep > 0 && !isConfirmed && (
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
                      (!selectedDate ||
                        !selectedTime ||
                        configLoading ||
                        !transferConfig?.configured))
                  }
                  onClick={() => void continueToNextStep()}
                >
                  {isBusy ? "Reservando..." : "Continuar"}
                  {!isBusy && <FiArrowRight aria-hidden="true" />}
                </button>
              ) : (
                !isConfirmed &&
                !holdExpired && (
                  <button
                    type="submit"
                    form="appointment-contact-form"
                    className={styles.primaryButton}
                    disabled={isBusy || !proofFile}
                  >
                    {isBusy ? "Enviando..." : "Enviar comprobante y reservar"}
                    {!isBusy && <FiArrowRight aria-hidden="true" />}
                  </button>
                )
              )}
              {currentStep === 2 && holdExpired && !isConfirmed && (
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={isBusy}
                  onClick={() => void goToStep(1)}
                >
                  Elegir otro horario
                  <FiArrowRight aria-hidden="true" />
                </button>
              )}
            </div>
            {currentStep === 1 &&
              !configLoading &&
              transferConfig &&
              !transferConfig.configured && (
                <p className={styles.formMessage} role="alert">
                  La cuenta para transferir todavía no está configurada. Por
                  ahora no se pueden reservar turnos.
                </p>
              )}
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
  }

  async function continueToNextStep() {
    if (currentStep === 0 && selectedServiceIds.length > 0) {
      setToday(getArgentinaDateKey(new Date()));
      setFormMessage("");
      setCurrentStep(1);
      return;
    }

    if (
      currentStep !== 1 ||
      !selectedDate ||
      !selectedTime ||
      !transferConfig?.configured
    ) {
      return;
    }

    setIsBusy(true);
    setFormMessage("");

    try {
      const response = await fetch("/api/appointments/holds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          time: selectedTime,
          serviceIds: selectedServiceIds,
        }),
      });
      const result = (await response.json()) as HoldResult | ApiError;

      if (!response.ok || !("hold_id" in result)) {
        throw new Error(
          "error" in result
            ? result.error
            : "No se pudo reservar el horario. Intentá nuevamente.",
        );
      }

      setHoldId(result.hold_id);
      setHoldExpiresAt(result.expires_at);
      setClockNow(Date.now());
      setCurrentStep(2);
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : "No se pudo reservar el horario. Intentá nuevamente.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function goToStep(step: number) {
    if (step < 0 || step >= currentStep || isConfirmed) {
      return;
    }

    if (currentStep === 2 && holdId) {
      setIsBusy(true);
      setFormMessage("");

      try {
        const response = await fetch(`/api/appointments/holds/${holdId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const result = (await response.json()) as ApiError;
          throw new Error(result.error || "No se pudo liberar el horario.");
        }

        setHoldId(null);
        setHoldExpiresAt(null);
        setProofFile(null);
      } catch (error) {
        setFormMessage(
          error instanceof Error
            ? error.message
            : "No se pudo liberar el horario. Intentá nuevamente.",
        );
        setIsBusy(false);
        return;
      }

      setIsBusy(false);
    }

    setFormMessage("");
    setCurrentStep(step);
  }

  function handleProofChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;

    if (
      file &&
      (file.size > 5 * 1024 * 1024 ||
        !["image/jpeg", "image/png", "image/webp"].includes(file.type))
    ) {
      event.currentTarget.value = "";
      setProofFile(null);
      setFormMessage("Elegí una imagen JPG, PNG o WEBP de hasta 5 MB.");
      return;
    }

    setProofFile(file);
    setFormMessage("");
  }

  async function submitAppointment(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!holdId || holdExpired) {
      setFormMessage("El tiempo para completar la reserva venció.");
      return;
    }

    setIsBusy(true);
    setFormMessage("");

    try {
      const response = await fetch(`/api/appointments/holds/${holdId}`, {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const result = (await response.json()) as ApiError & {
        status?: string;
      };

      if (!response.ok || result.status !== "pending_review") {
        throw new Error(
          result.error || "No se pudo completar la reserva. Intentá nuevamente.",
        );
      }

      setIsConfirmed(true);
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

type HoldResult = {
  hold_id: string;
  expires_at: string;
};
