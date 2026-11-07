"use client";

import { useEffect, useState } from "react";
import { isAppointmentTimeWithinBusinessHours } from "@/app/Appoinments/appointmentCatalog";
import type { AppointmentTimeSlot } from "@/lib/googleCalendar";
import styles from "./AppointmentSchedule.module.css";

type AppointmentScheduleProps = {
  today: string;
  serviceDuration: number;
  selectedDate: string | null;
  selectedTime: string | null;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
  showHeading?: boolean;
};

const weekdays = ["L", "M", "X", "J", "V", "S", "D"];
const monthNames = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const weekdayNames = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

type AvailabilityState =
  | {
      key: string;
      status: "success";
      timeSlots: Record<string, AppointmentTimeSlot[]>;
      hasShorterServiceAvailability: Record<string, boolean>;
    }
  | { key: string; status: "error"; message: string };

function isAvailabilityMap(
  value: unknown,
  durationMinutes: number,
): value is Record<string, AppointmentTimeSlot[]> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every((slots) => {
      if (!Array.isArray(slots)) {
        return false;
      }

      const seenTimes = new Set<string>();
      return slots.every((slot) => {
        if (
          !slot ||
          typeof slot !== "object" ||
          typeof slot.time !== "string" ||
          !["available", "busy", "past"].includes(slot.status) ||
          !isAppointmentTimeWithinBusinessHours(slot.time, durationMinutes) ||
          seenTimes.has(slot.time)
        ) {
          return false;
        }

        seenTimes.add(slot.time);
        return true;
      });
    })
  );
}

function isShorterServiceAvailabilityMap(
  value: unknown,
): value is Record<string, boolean> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (hasAvailability) => typeof hasAvailability === "boolean",
    )
  );
}

function getDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

function getMonthName(date: Date) {
  return `${monthNames[date.getUTCMonth()]} de ${date.getUTCFullYear()}`;
}

function getAccessibleDate(date: Date) {
  return `${weekdayNames[date.getUTCDay()]}, ${date.getUTCDate()} de ${monthNames[date.getUTCMonth()]}`;
}

function CalendarMonth({
  month,
  selectedDate,
  today,
  timeSlots,
  hasShorterServiceAvailability,
  isLoading,
  hasError,
  onSelectDate,
}: {
  month: Date;
  selectedDate: string | null;
  today: string;
  timeSlots: Record<string, AppointmentTimeSlot[]> | null;
  hasShorterServiceAvailability: Record<string, boolean> | null;
  isLoading: boolean;
  hasError: boolean;
  onSelectDate: (date: string) => void;
}) {
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const leadingDays = (new Date(Date.UTC(year, monthIndex, 1)).getUTCDay() + 6) % 7;
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);

  return (
    <section className={styles.month} aria-label={getMonthName(month)}>
      <h3 className={styles.monthTitle}>{getMonthName(month)}</h3>
      <div className={styles.calendarGrid} role="group" aria-label="Días del mes">
        {weekdays.map((weekday) => (
          <span key={weekday} className={styles.weekday}>
            {weekday}
          </span>
        ))}
        {Array.from({ length: leadingDays }, (_, index) => (
          <span
            key={`empty-${index}`}
            className={styles.emptyDay}
            aria-hidden="true"
          />
        ))}
        {days.map((day) => {
          const date = new Date(Date.UTC(year, monthIndex, day));
          const dateKey = getDateKey(date);
          const isUnavailable =
            dateKey < today ||
            date.getUTCDay() === 0 ||
            isLoading ||
            hasError ||
            (!timeSlots?.[dateKey]?.some((slot) => slot.status === "available") &&
              !hasShorterServiceAvailability?.[dateKey]);
          const isSelected = dateKey === selectedDate;

          return (
            <button
              key={dateKey}
              type="button"
              className={`${styles.day} ${isSelected ? styles.selectedDay : ""}`}
              aria-label={getAccessibleDate(date)}
              aria-pressed={isSelected}
              disabled={isUnavailable}
              onClick={() => onSelectDate(dateKey)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function AppointmentSchedule({
  today,
  serviceDuration,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  showHeading = true,
}: AppointmentScheduleProps) {
  const currentDate = getDateFromKey(today);
  const currentMonth = new Date(
    Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 1),
  );
  const visibleMonths = [0, 1].map(
    (offset) =>
      new Date(
        Date.UTC(
          currentMonth.getUTCFullYear(),
          currentMonth.getUTCMonth() + offset,
          1,
        ),
      ),
  );
  const lastVisibleMonth = visibleMonths[visibleMonths.length - 1];
  const availabilityEndDate = getDateKey(
    new Date(
      Date.UTC(
        lastVisibleMonth.getUTCFullYear(),
        lastVisibleMonth.getUTCMonth() + 1,
        0,
      ),
    ),
  );
  const availabilityKey = `${today}:${availabilityEndDate}:${serviceDuration}`;
  const [availabilityState, setAvailabilityState] =
    useState<AvailabilityState | null>(null);
  const currentAvailabilityState =
    availabilityState?.key === availabilityKey ? availabilityState : null;
  const availability =
    currentAvailabilityState?.status === "success"
      ? currentAvailabilityState.timeSlots
      : null;
  const shorterServiceAvailability =
    currentAvailabilityState?.status === "success"
      ? currentAvailabilityState.hasShorterServiceAvailability
      : null;
  const availabilityError =
    currentAvailabilityState?.status === "error"
      ? currentAvailabilityState.message
      : null;
  const hasAvailabilityForSelectedDuration = Object.values(
    availability ?? {},
  ).some((slots) => slots.some((slot) => slot.status === "available"));
  const hasShorterServiceAvailabilityInRange = Object.values(
    shorterServiceAvailability ?? {},
  ).some(Boolean);
  const shouldShowShorterServiceNotice =
    selectedDate && availability
      ? !availability[selectedDate]?.some(
          (slot) => slot.status === "available",
        ) && Boolean(shorterServiceAvailability?.[selectedDate])
      : !hasAvailabilityForSelectedDuration &&
        hasShorterServiceAvailabilityInRange;
  const isLoading =
    serviceDuration > 0 &&
    currentAvailabilityState === null;

  useEffect(() => {
    if (serviceDuration <= 0) {
      return;
    }

    const controller = new AbortController();

    fetch(
      `/api/appointments/availability?start=${today}&end=${availabilityEndDate}&duration=${serviceDuration}`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (response) => {
        const result = (await response.json()) as {
          error?: unknown;
          timeSlots?: unknown;
          hasShorterServiceAvailability?: unknown;
        };

        if (!response.ok) {
          throw new Error(
            typeof result.error === "string"
              ? result.error
              : "No se pudo consultar la agenda.",
          );
        }

        if (
          !isAvailabilityMap(result.timeSlots, serviceDuration) ||
          !isShorterServiceAvailabilityMap(
            result.hasShorterServiceAvailability,
          )
        ) {
          throw new Error("Google Calendar devolvió una disponibilidad inválida.");
        }

        setAvailabilityState({
          key: availabilityKey,
          status: "success",
          timeSlots: result.timeSlots,
          hasShorterServiceAvailability:
            result.hasShorterServiceAvailability,
        });
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setAvailabilityState({
          key: availabilityKey,
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "No se pudo consultar la agenda. Recargá la página para intentar de nuevo.",
        });
      });

    return () => controller.abort();
  }, [availabilityEndDate, availabilityKey, serviceDuration, today]);

  const formattedSelectedDate = selectedDate
    ? getAccessibleDate(getDateFromKey(selectedDate))
    : null;

    console.log(availability, "avavavvavava")

  return (
    <section
      className={styles.schedule}
      aria-label={showHeading ? undefined : "Selector de día y horario"}
      aria-labelledby={showHeading ? "schedule-title" : undefined}
    >
      {showHeading && (
        <div className={styles.heading}>
          <h2 id="schedule-title">Elegí día y horario</h2>
        </div>
      )}

      <div className={styles.months}>
        {visibleMonths.map((month) => (
          <CalendarMonth
            key={`${month.getUTCFullYear()}-${month.getUTCMonth()}`}
            month={month}
            selectedDate={selectedDate}
            today={today}
            timeSlots={availability}
            hasShorterServiceAvailability={shorterServiceAvailability}
            isLoading={isLoading}
            hasError={Boolean(availabilityError)}
            onSelectDate={(date) => {
              onSelectDate(date);
              onSelectTime("");
            }}
          />
        ))}
      </div>

      <p className={styles.availabilityNote}>
        Atención de lunes a sábado, de 8 a 22hs. Los inicios se muestran cada
        15 min según la duración del servicio. Solo se muestran horarios
        disponibles.
      </p>

      {shouldShowShorterServiceNotice && (
        <p className={styles.chooseDate} role="status">
          Hay turnos disponibles para servicios más cortos, pero no alcanzan
          para todos los servicios que elegiste. Probá quitando algún servicio
          o eligiendo otro día.
        </p>
      )}

      <div className={styles.timeHeading}>
        <h3>Horarios</h3>
      </div>

      {selectedDate ? (
        availabilityError ? (
          <p className={styles.chooseDate} role="alert">
            {availabilityError}
          </p>
        ) : isLoading ? (
          <p className={styles.chooseDate} role="status">
            Consultando disponibilidad...
          </p>
        ) : serviceDuration <= 0 ? (
          <p className={styles.chooseDate}>
            Elegí al menos un servicio para consultar los horarios.
          </p>
        ) : (
          <>
            <div className={styles.timeSlots} aria-label="Horarios disponibles">
              {(availability?.[selectedDate] ?? [])
                .filter((slot) => slot.status === "available")
                .map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    className={`${styles.timeSlot} ${styles.availableTime} ${selectedTime === slot.time ? styles.selectedTime : ""}`}
                    aria-pressed={selectedTime === slot.time}
                    onClick={() => onSelectTime(slot.time)}
                  >
                    {slot.time}
                  </button>
                ))}
              {!availability?.[selectedDate]?.some(
                (slot) => slot.status === "available",
              ) &&
                !shorterServiceAvailability?.[selectedDate] && (
                <p className={styles.chooseDate}>
                  No hay horarios disponibles para este día.
                </p>
                )}
            </div>
          </>
        )
      ) : (
        <p className={styles.chooseDate}>
          {availabilityError
            ? availabilityError
            : isLoading
              ? "Consultando disponibilidad..."
              : serviceDuration <= 0
                ? "Elegí al menos un servicio para consultar los horarios."
                : "Elegí un día para consultar los horarios."}
        </p>
      )}
      {formattedSelectedDate && (
        <p className={styles.selectedDate} aria-live="polite">
          Día seleccionado: {formattedSelectedDate}
        </p>
      )}
    </section>
  );
}
