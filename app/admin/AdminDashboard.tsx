"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { FiLogOut, FiSave } from "react-icons/fi";
import type { AppointmentSettings } from "@/app/Appoinments/appointmentCatalog";
import Loading from "@/components/Loading";
import { isAppointmentSettings } from "@/components/useAppointmentSettings";
import AppointmentHeader from "../Appoinments/components/AppointmentHeader";
import styles from "./page.module.css";
import { IoIosArrowDropdownCircle } from "react-icons/io";

import type {
  AdminSection,
  DailyScheduleMap,
  ExtendedAppointmentSettings,
  AdminDashboardProps,
} from "./types";

import ServicesEditor from "./components/ServicesEditor";
import ScheduleEditor from "./components/ScheduleEditor";
import SocialEditor from "./components/SocialEditor";
import LocationEditor from "./components/LocationEditor";
import { WEEKDAYS, SECTION_OPTIONS } from "./constants";

function normalizeSettings(
  raw: AppointmentSettings,
): ExtendedAppointmentSettings {
  const extended = raw as ExtendedAppointmentSettings;

  const dailySchedule: DailyScheduleMap = {};
  for (const { value } of WEEKDAYS) {
    const existing = extended.dailySchedule?.[value];
    dailySchedule[value] = {
      enabled: existing ? existing.enabled : raw.workingDays.includes(value),
      openingTime: existing?.openingTime ?? raw.openingTime ?? 540,
      closingTime: existing?.closingTime ?? raw.closingTime ?? 1080,
    };
  }

  return {
    ...extended,
    dailySchedule,
    social: {
      instagram: extended.social?.instagram ?? "",
      whatsapp: extended.social?.whatsapp ?? "",
      tiktok: extended.social?.tiktok ?? "",
    },
    location: {
      address: extended.location?.address ?? "",
      city: extended.location?.city ?? "",
      province: extended.location?.province ?? "",
      postalCode: extended.location?.postalCode ?? "",
      mapsUrl: extended.location?.mapsUrl ?? "",
      notes: extended.location?.notes ?? "",
    },
  };
}

export default function AdminDashboard({
  initialSettings,
  onSignedOut,
}: AdminDashboardProps) {
  const [savedSettings, setSavedSettings] =
    useState<ExtendedAppointmentSettings>(() =>
      normalizeSettings(initialSettings),
    );
  const [settings, setSettings] =
    useState<ExtendedAppointmentSettings>(savedSettings);
  const [activeSection, setActiveSection] = useState<AdminSection>("services");
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [message, setMessage] = useState("");

  function updateSettings(partial: Partial<ExtendedAppointmentSettings>) {
    setSettings((current) => ({ ...current, ...partial }));
    setMessage("");
  }

  return (
    <main className={styles.adminPage}>
      <AppointmentHeader
        actionLabel="Alma Estudio"
        title="Panel de administración"
        description={
          <button
            type="button"
            className="secondary-button"
            onClick={() => void signOut()}
            disabled={isLoading}
          >
            {isSigningOut ? (
              <Loading label="Cerrando sesión..." inline />
            ) : (
              <>
                <FiLogOut aria-hidden="true" />
                Cerrar sesión
              </>
            )}
          </button>
        }
        showBackButton={false}
      />

      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}

      <form className={styles.settingsForm} onSubmit={saveSettings}>
        <section className={styles.selectedOption}>
          <label htmlFor="section-selector">¿Qué querés modificar?</label>

          <div className={styles.selectWrapper}>
            <select
              id="section-selector"
              value={activeSection}
              onChange={(event) => {
                setActiveSection(event.currentTarget.value as AdminSection);
                setMessage("");
              }}
            >
              {SECTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <IoIosArrowDropdownCircle
              className={styles.selectIcon}
              aria-hidden="true"
            />
          </div>
        </section>

        {activeSection === "services" && (
          <ServicesEditor
            categories={settings.categories}
            services={settings.services}
            onChange={(categories, services) =>
              updateSettings({ categories, services })
            }
          />
        )}

        {activeSection === "schedule" && (
          <ScheduleEditor
            dailySchedule={settings.dailySchedule}
            defaultOpening={settings.openingTime}
            defaultClosing={settings.closingTime}
            onChange={(dailySchedule, workingDays) =>
              updateSettings({ dailySchedule, workingDays })
            }
          />
        )}

        {activeSection === "social" && (
          <SocialEditor
            social={settings.social}
            onChange={(social) => updateSettings({ social })}
          />
        )}

        {activeSection === "location" && (
          <LocationEditor
            location={settings.location}
            onChange={(location) => updateSettings({ location })}
          />
        )}

        <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
          <button
            type="submit"
            className="primary-button"
            disabled={isLoading}
            style={{ flex: 1 }}
          >
            {isLoading ? (
              <Loading label="Guardando..." inline />
            ) : (
              <>
                <FiSave aria-hidden="true" />
                Guardar cambios
              </>
            )}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={discardChanges}
            disabled={isLoading}
            style={{ padding: "0 1.5rem" }}
          >
            Descartar cambios
          </button>
        </div>
      </form>
    </main>
  );

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    const scheduleEntries = Object.entries(settings.dailySchedule ?? {});
    const enabledDays = scheduleEntries
      .filter(([, value]) => value.enabled)
      .map(([day]) => Number(day))
      .sort((a, b) => a - b);

    const enabledSchedules = scheduleEntries
      .filter(([, value]) => value.enabled)
      .map(([, value]) => value);

    const fallbackOpening =
      enabledSchedules.length > 0
        ? Math.min(...enabledSchedules.map((s) => s.openingTime))
        : settings.openingTime;

    const fallbackClosing =
      enabledSchedules.length > 0
        ? Math.max(...enabledSchedules.map((s) => s.closingTime))
        : settings.closingTime;

    const payload: ExtendedAppointmentSettings = {
      ...settings,
      workingDays: enabledDays,
      openingTime: fallbackOpening,
      closingTime: fallbackClosing,
    };

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result: unknown = await response.json();

      if (!response.ok || !isAppointmentSettings(result)) {
        if (response.status === 401) {
          onSignedOut("La sesión venció. Volvé a ingresar.");
          return;
        }
        const errorMessage =
          result &&
          typeof result === "object" &&
          typeof (result as Record<string, unknown>).error === "string"
            ? (result as Record<string, string>).error
            : "No se pudo guardar la configuración.";
        throw new Error(errorMessage);
      }

      const normalized = normalizeSettings(result);
      setSavedSettings(normalized);
      setSettings(normalized);
      setMessage("Los cambios se guardaron correctamente.");
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

  function discardChanges() {
    if (window.confirm("¿Querés descartar los cambios no guardados?")) {
      setSettings(savedSettings);
      setMessage("Se descartaron los cambios.");
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

      onSignedOut();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo cerrar la sesión.",
      );
      setIsLoading(false);
      setIsSigningOut(false);
    }
  }
}
