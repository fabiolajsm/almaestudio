"use client";

import { useEffect, useState } from "react";
import type { SubmitEvent } from "react";
import { FiLogOut, FiPlus, FiSave, FiTrash2 } from "react-icons/fi";
import type {
  AppointmentSettings,
  AppointmentService,
} from "@/app/Appoinments/appointmentCatalog";
import Loading from "@/components/Loading";
import { isAppointmentSettings } from "@/components/useAppointmentSettings";
import styles from "./page.module.css";

const weekdays = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

function formatTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function parseTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export default function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [settings, setSettings] = useState<AppointmentSettings | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/admin/settings", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result: unknown = await response.json();
        if (response.status === 401) {
          setIsAuthenticated(false);
          return;
        }

        if (!response.ok || !isAppointmentSettings(result)) {
          const errorMessage =
            result &&
            typeof result === "object" &&
            typeof (result as Record<string, unknown>).error === "string"
              ? (result as Record<string, string>).error
              : "No se pudo cargar la configuración del panel.";
          throw new Error(errorMessage);
        }

        setSettings(result);
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

  async function loadSettings() {
    setMessage("");
    try {
      const response = await fetch("/api/admin/settings", {
        cache: "no-store",
      });
      const result: unknown = await response.json();
      if (response.status === 401) {
        setIsAuthenticated(false);
        setSettings(null);
        throw new Error("La sesión venció. Volvé a ingresar.");
      }

      if (!response.ok || !isAppointmentSettings(result)) {
        const errorMessage =
          result &&
          typeof result === "object" &&
          typeof (result as Record<string, unknown>).error === "string"
            ? (result as Record<string, string>).error
            : "No se pudo cargar la configuración del panel.";
        throw new Error(errorMessage);
      }

      setSettings(result);
      return true;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la configuración del panel.",
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
      setIsAuthenticated(await loadSettings());
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo iniciar sesión.",
      );
      setIsLoading(false);
    }
  }

  async function saveSettings(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) {
      return;
    }

    setIsLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const result: unknown = await response.json();

      if (!response.ok || !isAppointmentSettings(result)) {
        if (response.status === 401) {
          setIsAuthenticated(false);
          setSettings(null);
        }
        const errorMessage =
          result &&
          typeof result === "object" &&
          typeof (result as Record<string, unknown>).error === "string"
            ? (result as Record<string, string>).error
            : "No se pudo guardar la configuración.";
        throw new Error(errorMessage);
      }

      setSettings(result);
      setMessage("Los servicios y horarios se guardaron correctamente.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la configuración.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    setIsLoading(true);
    setIsSigningOut(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("No se pudo cerrar la sesión.");
      }

      setIsAuthenticated(false);
      setSettings(null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo cerrar la sesión.",
      );
    } finally {
      setIsLoading(false);
      setIsSigningOut(false);
    }
  }

  function updateService(
    serviceId: string,
    changes: Partial<AppointmentService>,
  ) {
    setSettings((current) =>
      current
        ? {
            ...current,
            services: current.services.map((service) =>
              service.id === serviceId ? { ...service, ...changes } : service,
            ),
          }
        : current,
    );
    setMessage("");
  }

  function updateCategoryName(categoryId: string, name: string) {
    setSettings((current) =>
      current
        ? {
            ...current,
            categories: current.categories.map((category) =>
              category.id === categoryId ? { ...category, name } : category,
            ),
          }
        : current,
    );
    setMessage("");
  }

  function addService(categoryId: string) {
    if (!settings || settings.services.length >= 100) {
      return;
    }

    setSettings((current) =>
      current
        ? {
            ...current,
            services: [
              ...current.services,
              {
                id: crypto.randomUUID(),
                name: "Nuevo servicio",
                description: "",
                category: categoryId,
                duration: 60,
                price: 0,
              },
            ],
          }
        : current,
    );
    setMessage("");
  }

  function removeService(serviceId: string) {
    if (!settings) {
      return;
    }

    const service = settings.services.find((item) => item.id === serviceId);
    if (
      !service ||
      settings.services.length <= 1 ||
      !window.confirm(`¿Querés eliminar el servicio «${service.name}»?`)
    ) {
      return;
    }

    setSettings((current) =>
      current
        ? {
            ...current,
            services: current.services.filter((item) => item.id !== serviceId),
          }
        : current,
    );
    setMessage("");
  }

  function updateWorkingDay(day: number, isWorking: boolean) {
    setSettings((current) => {
      if (!current) {
        return current;
      }

      const workingDays = isWorking
        ? [...current.workingDays, day]
        : current.workingDays.filter((workingDay) => workingDay !== day);
      return {
        ...current,
        workingDays: workingDays.sort((a, b) => a - b),
      };
    });
    setMessage("");
  }

  if (isCheckingSession) {
    return (
      <main className={styles.page}>
        <Loading label="Verificando acceso..." />
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
            Ingresá para editar los servicios y el horario de atención.
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
              {isLoading ? (
                <Loading label="Ingresando..." inline />
              ) : (
                "Ingresar"
              )}
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
          <h1>Servicios y horarios</h1>
          <p className={styles.intro}>
            Editá los servicios ofrecidos, los días y el horario de atención.
          </p>
        </div>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => void signOut()}
          disabled={isLoading}
        >
          {isSigningOut ? (
            <Loading label="Cerrando sesión..." inline />
          ) : (
            <>
              <FiLogOut aria-hidden="true" />
              Salir
            </>
          )}
        </button>
      </header>

      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}

      {!settings ? (
        <div className={styles.emptyState}>
          <Loading label="Cargando configuración..." />
        </div>
      ) : (
        <form className={styles.settingsForm} onSubmit={saveSettings}>
          <section className={styles.settingsSection}>
            <h2>Horario de atención</h2>
            <div className={styles.hoursGrid}>
              <label>
                Apertura
                <input
                  type="time"
                  step={900}
                  value={formatTime(settings.openingTime)}
                  onChange={(event) => {
                    setSettings((current) =>
                      current
                        ? {
                            ...current,
                            openingTime: parseTime(event.currentTarget.value),
                          }
                        : current,
                    );
                    setMessage("");
                  }}
                  required
                />
              </label>
              <label>
                Cierre
                <input
                  type="time"
                  step={900}
                  value={formatTime(settings.closingTime)}
                  onChange={(event) => {
                    setSettings((current) =>
                      current
                        ? {
                            ...current,
                            closingTime: parseTime(event.currentTarget.value),
                          }
                        : current,
                    );
                    setMessage("");
                  }}
                  required
                />
              </label>
            </div>
          </section>

          <section className={styles.settingsSection}>
            <h2>Días de trabajo</h2>
            <div className={styles.daysGrid}>
              {weekdays.map(({ value, label }) => (
                <label key={value}>
                  <input
                    type="checkbox"
                    checked={settings.workingDays.includes(value)}
                    onChange={(event) =>
                      updateWorkingDay(value, event.currentTarget.checked)
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>

          <section className={styles.settingsSection}>
            <h2>Servicios</h2>
            <p className={styles.intro}>
              Editá las categorías y los servicios que se ofrecen.
            </p>
            {settings.categories.map((category) => (
              <fieldset key={category.id} className={styles.serviceCategory}>
                <legend>{category.name}</legend>
                <div className={styles.categoryEditorHeader}>
                  <label className={styles.categoryNameField}>
                    Nombre de categoría
                    <input
                      type="text"
                      value={category.name}
                      maxLength={60}
                      onChange={(event) =>
                        updateCategoryName(
                          category.id,
                          event.currentTarget.value,
                        )
                      }
                      required
                    />
                  </label>
                  <button
                    type="button"
                    className={styles.addServiceButton}
                    disabled={settings.services.length >= 100}
                    onClick={() => addService(category.id)}
                  >
                    <FiPlus aria-hidden="true" />
                    Agregar servicio
                  </button>
                </div>
                <div className={styles.serviceGrid}>
                  {settings.services
                    .filter((service) => service.category === category.id)
                    .map((service) => (
                      <article key={service.id} className={styles.serviceCard}>
                        <label>
                          Nombre
                          <input
                            type="text"
                            value={service.name}
                            maxLength={100}
                            onChange={(event) =>
                              updateService(service.id, {
                                name: event.currentTarget.value,
                              })
                            }
                            required
                          />
                        </label>
                        <label>
                          Descripción
                          <textarea
                            value={service.description ?? ""}
                            maxLength={240}
                            rows={3}
                            onChange={(event) =>
                              updateService(service.id, {
                                description: event.currentTarget.value,
                              })
                            }
                          />
                        </label>
                        <div className={styles.serviceNumbers}>
                          <label>
                            Duración (min)
                            <input
                              type="number"
                              min={15}
                              max={600}
                              step={15}
                              value={service.duration}
                              onChange={(event) =>
                                updateService(service.id, {
                                  duration: Number(event.currentTarget.value),
                                })
                              }
                              required
                            />
                          </label>
                          <label>
                            Precio ($)
                            <input
                              type="number"
                              min={0}
                              max={10_000_000}
                              step={500}
                              value={service.price}
                              onChange={(event) =>
                                updateService(service.id, {
                                  price: Number(event.currentTarget.value),
                                })
                              }
                              required
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          className={styles.removeServiceButton}
                          disabled={settings.services.length <= 1}
                          onClick={() => removeService(service.id)}
                        >
                          <FiTrash2 aria-hidden="true" />
                          Eliminar servicio
                        </button>
                      </article>
                    ))}
                </div>
              </fieldset>
            ))}
          </section>

          <button type="submit" className={styles.saveButton} disabled={isLoading}>
            {isLoading ? (
              <Loading label="Guardando..." inline />
            ) : (
              <>
                <FiSave aria-hidden="true" />
                Guardar cambios
              </>
            )}
          </button>
        </form>
      )}
    </main>
  );
}
