"use client";

import { useEffect, useMemo, useState } from "react";
import type { SubmitEvent } from "react";
import {
  FiCheck,
  FiLogOut,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";
import {
  appointmentDeposit,
  appointmentServices,
} from "../Appoinments/appointmentCatalog";
import styles from "./page.module.css";

type AdminAppointment = {
  id: string;
  appointment_date: string;
  start_time: string;
  duration_minutes: number;
  service_ids: string[];
  total_price: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  proof_url: string | null;
  status: "pending_review" | "confirmed";
  created_at: string;
};

type AppointmentFilter = "pending_review" | "confirmed" | "all";

function formatDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [filter, setFilter] = useState<AppointmentFilter>("pending_review");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [busyAppointmentId, setBusyAppointmentId] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState("");

  const visibleAppointments = useMemo(
    () =>
      filter === "all"
        ? appointments
        : appointments.filter((appointment) => appointment.status === filter),
    [appointments, filter],
  );

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/admin/appointments", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401) {
          setIsAuthenticated(false);
          return;
        }

        const result = (await response.json()) as {
          error?: unknown;
          appointments?: unknown;
        };

        if (!response.ok) {
          throw new Error(
            typeof result.error === "string"
              ? result.error
              : "No se pudo verificar el acceso al panel.",
          );
        }

        if (!Array.isArray(result.appointments)) {
          throw new Error("El servidor devolvió una lista de reservas inválida.");
        }

        setAppointments(result.appointments as AdminAppointment[]);
        setIsAuthenticated(true);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setMessage(
          error instanceof Error
            ? error.message
            : "No se pudo conectar con el panel.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsCheckingSession(false);
        }
      });

    return () => controller.abort();
  }, []);

  async function loadAppointments() {
    setMessage("");

    try {
      const response = await fetch("/api/admin/appointments", {
        cache: "no-store",
      });
      const result = (await response.json()) as {
        error?: unknown;
        appointments?: unknown;
      };

      if (response.status === 401) {
        setIsAuthenticated(false);
        setAppointments([]);
        throw new Error("La sesión venció. Volvé a ingresar.");
      }

      if (!response.ok) {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "No se pudieron cargar las reservas.",
        );
      }

      if (!Array.isArray(result.appointments)) {
        throw new Error("El servidor devolvió una lista de reservas inválida.");
      }

      setAppointments(result.appointments as AdminAppointment[]);
      return true;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las reservas.",
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json()) as { error?: unknown };

      if (!response.ok) {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "No se pudo iniciar sesión.",
        );
      }

      setPassword("");
      setIsAuthenticated(true);
      setIsLoading(true);
      await loadAppointments();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo iniciar sesión.",
      );
      setIsLoading(false);
    }
  }

  async function signOut() {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/session", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("No se pudo cerrar la sesión.");
      }

      setIsAuthenticated(false);
      setAppointments([]);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo cerrar la sesión.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function updateAppointment(
    appointment: AdminAppointment,
    action: "confirm" | "cancel",
  ) {
    const actionLabel = action === "confirm" ? "confirmar" : "cancelar";
    if (
      action === "cancel" &&
      !window.confirm(
        `¿Querés cancelar el turno de ${appointment.customer_name ?? "esta clienta"}?`,
      )
    ) {
      return;
    }

    setBusyAppointmentId(appointment.id);
    setMessage("");

    try {
      const response = await fetch("/api/admin/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment.id,
          action,
        }),
      });
      const result = (await response.json()) as { error?: unknown };

      if (!response.ok) {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : `No se pudo ${actionLabel} el turno.`,
        );
      }

      if (await loadAppointments()) {
        setMessage(
          action === "confirm"
            ? "Turno confirmado."
            : "Turno cancelado y horario liberado.",
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : `No se pudo ${actionLabel} el turno.`,
      );
    } finally {
      setBusyAppointmentId(null);
    }
  }

  if (isCheckingSession) {
    return (
      <main className={styles.page}>
        <p role="status">Verificando acceso...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className={styles.page}>
        <section className={styles.loginCard} aria-labelledby="admin-title">
          <p className={styles.eyebrow}>Alma Estudio</p>
          <h1 id="admin-title">Administración</h1>
          <p className={styles.intro}>
            Ingresá para revisar reservas y comprobantes de pago.
          </p>
          <form className={styles.loginForm} onSubmit={signIn}>
            <label htmlFor="admin-password">Contraseña de administradora</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              required
            />
            <button type="submit" disabled={isLoading || !password}>
              {isLoading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
          {message && (
            <p className={styles.message} role="alert">
              {message}
            </p>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Alma Estudio</p>
          <h1>Reservas</h1>
          <p className={styles.intro}>
            Revisá los comprobantes y administrá los turnos.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              setIsLoading(true);
              void loadAppointments();
            }}
            disabled={isLoading}
          >
            <FiRefreshCw aria-hidden="true" />
            Actualizar
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => void signOut()}
            disabled={isLoading}
          >
            <FiLogOut aria-hidden="true" />
            Salir
          </button>
        </div>
      </header>

      <nav className={styles.filters} aria-label="Filtrar reservas">
        {(
          [
            ["pending_review", "Pendientes"],
            ["confirmed", "Confirmadas"],
            ["all", "Todas"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={filter === value ? styles.activeFilter : ""}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </nav>

      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}
      {isLoading ? (
        <p className={styles.emptyState} role="status">
          Cargando reservas...
        </p>
      ) : visibleAppointments.length === 0 ? (
        <p className={styles.emptyState}>
          {filter === "pending_review"
            ? "No hay comprobantes pendientes de revisión."
            : "No hay reservas para mostrar."}
        </p>
      ) : (
        <div className={styles.appointmentList}>
          {visibleAppointments.map((appointment) => {
            const selectedServices = appointmentServices.filter((service) =>
              appointment.service_ids.includes(service.id),
            );
            const isPending = appointment.status === "pending_review";
            const isBusy = busyAppointmentId === appointment.id;

            return (
              <article key={appointment.id} className={styles.appointmentCard}>
                <header className={styles.cardHeader}>
                  <div>
                    <p className={styles.appointmentDate}>
                      {formatDate(appointment.appointment_date)}
                    </p>
                    <h2>
                      {appointment.start_time.slice(0, 5)} ·{" "}
                      {appointment.customer_name || "Cliente"}
                    </h2>
                  </div>
                  <span
                    className={`${styles.status} ${isPending ? styles.pending : styles.confirmed}`}
                  >
                    {isPending ? "Comprobante por revisar" : "Confirmado"}
                  </span>
                </header>

                <dl className={styles.details}>
                  <div>
                    <dt>Servicios</dt>
                    <dd>
                      {selectedServices.map((service) => service.name).join(" + ")}
                    </dd>
                  </div>
                  <div>
                    <dt>Duración</dt>
                    <dd>{appointment.duration_minutes} min</dd>
                  </div>
                  <div>
                    <dt>Total</dt>
                    <dd>{formatAmount(appointment.total_price)}</dd>
                  </div>
                  {isPending && (
                    <div>
                      <dt>Seña a verificar</dt>
                      <dd>{formatAmount(appointmentDeposit)}</dd>
                    </div>
                  )}
                  {appointment.customer_email && (
                    <div>
                      <dt>Email</dt>
                      <dd>
                        <a href={`mailto:${appointment.customer_email}`}>
                          {appointment.customer_email}
                        </a>
                      </dd>
                    </div>
                  )}
                  {appointment.customer_phone && (
                    <div>
                      <dt>WhatsApp</dt>
                      <dd>
                        <a
                          href={`https://wa.me/${appointment.customer_phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {appointment.customer_phone}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>

                {appointment.proof_url && (
                  <a
                    className={styles.proofLink}
                    href={appointment.proof_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver comprobante
                  </a>
                )}

                {(isPending || appointment.status === "confirmed") && (
                  <div className={styles.cardActions}>
                    {isPending && (
                      <button
                        type="button"
                        className={styles.confirmButton}
                        disabled={isBusy}
                        onClick={() =>
                          void updateAppointment(appointment, "confirm")
                        }
                      >
                        <FiCheck aria-hidden="true" />
                        Confirmar pago
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.cancelButton}
                      disabled={isBusy}
                      onClick={() =>
                        void updateAppointment(appointment, "cancel")
                      }
                    >
                      <FiX aria-hidden="true" />
                      {isPending ? "Cancelar turno" : "Cancelar reserva"}
                    </button>
                    {isBusy && (
                      <span className={styles.actionStatus} role="status">
                        Actualizando...
                      </span>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
