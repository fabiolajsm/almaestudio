"use client";

import { useEffect, useState } from "react";
import type { AppointmentSettings } from "@/app/Appoinments/appointmentCatalog";

export function isAppointmentSettings(
  value: unknown,
): value is AppointmentSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const settings = value as Record<string, unknown>;
  return (
    Array.isArray(settings.categories) &&
    settings.categories.every(
      (category) =>
        category !== null &&
        typeof category === "object" &&
        typeof (category as Record<string, unknown>).id === "string" &&
        typeof (category as Record<string, unknown>).name === "string",
    ) &&
    Array.isArray(settings.services) &&
    settings.services.every(
      (service) =>
        service !== null &&
        typeof service === "object" &&
        typeof (service as Record<string, unknown>).id === "string" &&
        typeof (service as Record<string, unknown>).name === "string" &&
        typeof (service as Record<string, unknown>).category === "string" &&
        typeof (service as Record<string, unknown>).duration === "number" &&
        typeof (service as Record<string, unknown>).price === "number",
    ) &&
    Array.isArray(settings.workingDays) &&
    typeof settings.openingTime === "number" &&
    typeof settings.closingTime === "number"
  );
}

export default function useAppointmentSettings() {
  const [settings, setSettings] = useState<AppointmentSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/appointments/settings", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result: unknown = await response.json();
        if (!response.ok) {
          const message =
            result &&
            typeof result === "object" &&
            typeof (result as Record<string, unknown>).error === "string"
              ? (result as Record<string, string>).error
              : "No se pudo cargar la configuración de turnos.";
          throw new Error(message);
        }

        if (!isAppointmentSettings(result)) {
          throw new Error("La configuración de turnos recibida no es válida.");
        }

        setSettings(result);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name === "AbortError") {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar la configuración de turnos.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  return { settings, isLoading, error };
}
