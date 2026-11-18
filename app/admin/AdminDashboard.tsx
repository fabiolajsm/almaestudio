"use client";

import { useState } from "react";
import { FiLogOut, FiSave } from "react-icons/fi";
import {
  DEFAULT_ADMIN_CLOSING_TIME,
  DEFAULT_ADMIN_OPENING_TIME,
  SECTION_OPTIONS,
  WEEKDAYS,
} from "@/app/constants";
import type { AppointmentSettings } from "@/app/types";
import { validateAdminSettings } from "@/app/validations";
import Loading from "@/components/Loading";
import { isAppointmentSettings } from "@/components/useAppointmentSettings";
import AppointmentHeader from "../Appoinments/components/AppointmentHeader";
import styles from "./page.module.css";
import { IoIosArrowDropdownCircle } from "react-icons/io";

import type {
  AdminSection,
  AdminSettingsValidationError,
  DailyScheduleMap,
  ExtendedAppointmentSettings,
  AdminDashboardProps,
} from "./types";

import ServicesEditor from "./components/ServicesEditor";
import ScheduleEditor from "./components/ScheduleEditor";
import SocialEditor from "./components/SocialEditor";
import LocationEditor from "./components/LocationEditor";
import ConfirmDialog from "@/components/ConfirmDialog";

function normalizeSettings(
  raw: AppointmentSettings,
): ExtendedAppointmentSettings {
  const extended = raw as ExtendedAppointmentSettings;

  const dailySchedule: DailyScheduleMap = {};
  for (const { value } of WEEKDAYS) {
    const existing = extended.dailySchedule?.[value];
    dailySchedule[value] = {
      enabled: existing ? existing.enabled : raw.workingDays.includes(value),
      openingTime:
        existing?.openingTime ?? raw.openingTime ?? DEFAULT_ADMIN_OPENING_TIME,
      closingTime:
        existing?.closingTime ?? raw.closingTime ?? DEFAULT_ADMIN_CLOSING_TIME,
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
      addressText: extended.location?.addressText ?? "",
      mapsUrl: extended.location?.mapsUrl ?? "",
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
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [hasValidatedSettings, setHasValidatedSettings] = useState(false);
  const [settingsValidationError, setSettingsValidationError] =
    useState<AdminSettingsValidationError | null>(null);
  const [message, setMessage] = useState("");
  const [refreshAfterMessage, setRefreshAfterMessage] = useState(false);

  function updateSettings(partial: Partial<ExtendedAppointmentSettings>) {
    const updatedSettings = { ...settings, ...partial };
    setSettings(updatedSettings);

    if (hasValidatedSettings) {
      const validationError = validateAdminSettings(updatedSettings);
      setSettingsValidationError(validationError);
      setMessage(validationError?.message ?? "");
      if (validationError) {
        setActiveSection(validationError.section);
      }
    } else {
      setMessage("");
    }
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

      <form
        className={styles.settingsForm}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setHasValidatedSettings(true);
          const validationError = validateAdminSettings(settings);
          setSettingsValidationError(validationError);
          if (validationError) {
            setMessage(validationError.message);
            setActiveSection(validationError.section);
            setIsConfirmDialogOpen(false);
            return;
          }

          setMessage("");
          setIsConfirmDialogOpen(true);
        }}
      >
        <section className={styles.selectedOption}>
          <label htmlFor="section-selector">¿Qué querés modificar?</label>

          <div className={styles.selectWrapper}>
            <select
              id="section-selector"
              value={activeSection}
              onChange={(event) => {
                setActiveSection(event.currentTarget.value as AdminSection);
                if (!settingsValidationError) {
                  setMessage("");
                }
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

        <div className={styles.saveActions}>
          <button
            type="submit"
            className="primary-button"
            disabled={isLoading || settingsValidationError !== null}
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
          >
            Descartar cambios
          </button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={Boolean(message)}
        title="Aviso"
        description={message}
        confirmText="Confirmar"
        isShowCancelBtn={false}
        onConfirm={dismissMessage}
        onCancel={dismissMessage}
      />
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        title="Confirmar cambios"
        description="¿Deseas aplicar y guardar todos los cambios realizados en el estudio?"
        confirmText="Guardar cambios"
        cancelText="Cancelar"
        isBusy={isLoading}
        onConfirm={() => void saveSettings()}
        onCancel={() => setIsConfirmDialogOpen(false)}
      />
    </main>
  );

  async function saveSettings() {
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
      setRefreshAfterMessage(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la configuración.",
      );
    } finally {
      setIsLoading(false);
      setIsConfirmDialogOpen(false);
    }
  }

  function discardChanges() {
    if (window.confirm("¿Querés descartar los cambios no guardados?")) {
      setSettings(savedSettings);
      setHasValidatedSettings(false);
      setSettingsValidationError(null);
      setMessage("Se descartaron los cambios.");
    }
  }

  function dismissMessage() {
    setMessage("");
    if (refreshAfterMessage) {
      window.location.reload();
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
