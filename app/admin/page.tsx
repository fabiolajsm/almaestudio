"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { AppointmentSettings } from "@/app/types";
import Loading from "@/components/Loading";
import { isAppointmentSettings } from "@/components/useAppointmentSettings";
import AdminDashboard from "./AdminDashboard";
import styles from "./page.module.css";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [initialSettings, setInitialSettings] =
    useState<AppointmentSettings | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
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

        setInitialSettings(result);
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

  if (isCheckingSession) {
    return (
      <main className={styles.adminPage}>
        <Loading label="Cargando..." />
      </main>
    );
  }

  if (!isAuthenticated || !initialSettings) {
    return (
      <main className={styles.adminPage}>
        <section
          className={`surface-card ${styles.loginCard}`}
          aria-labelledby="admin-title"
        >
          <h2 className={styles.eyebrow}>Alma Estudio</h2>
          <h1 id="admin-title">Administración</h1>
          <p>
            Ingresá para editar los servicios, horarios e información del
            estudio.
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
            <button
              type="submit"
              disabled={isLoading || !password}
              className="primary-button"
            >
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
    <AdminDashboard
      initialSettings={initialSettings}
      onSignedOut={handleSignedOut}
    />
  );

  async function loadInitialSettings() {
    try {
      const response = await fetch("/api/admin/settings", {
        cache: "no-store",
      });
      const result: unknown = await response.json();

      if (response.status === 401) {
        setIsAuthenticated(false);
        setInitialSettings(null);
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

      setInitialSettings(result);
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

  async function signIn(event: FormEvent<HTMLFormElement>) {
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
      setIsAuthenticated(await loadInitialSettings());
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo iniciar sesión.",
      );
      setIsLoading(false);
    }
  }

  function handleSignedOut(reasonMessage?: string) {
    setIsAuthenticated(false);
    setInitialSettings(null);
    setMessage(reasonMessage ?? "");
  }
}
