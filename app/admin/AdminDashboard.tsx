"use client";

import { useState } from "react";
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

      <form
        className={styles.settingsForm}
        onSubmit={(event) => {
          event.preventDefault();
          const categoriesWithServices = new Set(
            settings.services.map((service) => service.category),
          );
          const emptyCategories = settings.categories.filter(
            (category) => !categoriesWithServices.has(category.id),
          );

          if (emptyCategories.length > 0) {
            setMessage(
              "No se pueden guardar los cambios: todas las categorías deben tener al menos un servicio asociado. Agregá un servicio o eliminá las categorías vacías.",
            );
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

        <div className={styles.saveActions}>
          <button
            type="submit"
            className="primary-button"
            disabled={isLoading}
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

      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}
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
