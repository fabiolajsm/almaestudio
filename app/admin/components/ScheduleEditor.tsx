"use client";

import {
  DEFAULT_ADMIN_OPENING_TIME,
  MINUTES_PER_HOUR,
  SCHEDULE_INPUT_STEP_SECONDS,
  WEEKDAYS,
} from "@/app/constants";
import type {
  DailyScheduleMap,
  DaySchedule,
  ScheduleEditorProps,
} from "../types";
import styles from "../page.module.css";

function formatTime(minutes: number) {
  const safeMinutes = Number.isFinite(minutes)
    ? minutes
    : DEFAULT_ADMIN_OPENING_TIME;
  return `${String(Math.floor(safeMinutes / MINUTES_PER_HOUR)).padStart(2, "0")}:${String(
    safeMinutes % MINUTES_PER_HOUR,
  ).padStart(2, "0")}`;
}

function parseTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * MINUTES_PER_HOUR + minutes;
}

export default function ScheduleEditor({
  dailySchedule,
  defaultOpening,
  defaultClosing,
  onChange,
}: ScheduleEditorProps) {
  function updateDaySchedule(day: number, changes: Partial<DaySchedule>) {
    if (!dailySchedule) return;

    const currentDay = dailySchedule[day] ?? {
      enabled: false,
      openingTime: defaultOpening,
      closingTime: defaultClosing,
    };

    const updatedDay = { ...currentDay, ...changes };
    const updatedSchedule: DailyScheduleMap = {
      ...dailySchedule,
      [day]: updatedDay,
    };

    const workingDays = Object.entries(updatedSchedule)
      .filter(([, value]) => value.enabled)
      .map(([key]) => Number(key))
      .sort((a, b) => a - b);

    onChange(updatedSchedule, workingDays);
  }

  return (
    <section className={styles.settingsSection}>
      <h2 className={styles.optionSelectedTitle}>
        Horarios y días de atención
      </h2>
      <p className={styles.optionSelectedDescription}>
        Activá cada día laboral y definí su horario específico de apertura y
        cierre.
      </p>
      <div className={styles.daysGrid}>
        {WEEKDAYS.map(({ value, label }) => {
          const dayConfig = dailySchedule?.[value] ?? {
            enabled: false,
            openingTime: defaultOpening,
            closingTime: defaultClosing,
          };

          return (
            <div key={value} className={`surface-card ${styles.dayCard}`}>
              <label className={styles.dayToggle}>
                <span>
                  <strong>{label}</strong>{" "}
                  {dayConfig.enabled ? "(Abierto)" : "(Cerrado)"}
                </span>
                <input
                  type="checkbox"
                  checked={dayConfig.enabled}
                  onChange={(event) =>
                    updateDaySchedule(value, {
                      enabled: event.currentTarget.checked,
                    })
                  }
                />
              </label>

              {dayConfig.enabled && (
                <div className={styles.hoursGrid}>
                  <label>
                    Apertura
                    <input
                      type="time"
                      step={SCHEDULE_INPUT_STEP_SECONDS}
                      value={formatTime(dayConfig.openingTime)}
                      onChange={(event) =>
                        updateDaySchedule(value, {
                          openingTime: parseTime(event.currentTarget.value),
                        })
                      }
                      required
                    />
                  </label>
                  <label>
                    Cierre
                    <input
                      type="time"
                      step={SCHEDULE_INPUT_STEP_SECONDS}
                      value={formatTime(dayConfig.closingTime)}
                      onChange={(event) =>
                        updateDaySchedule(value, {
                          closingTime: parseTime(event.currentTarget.value),
                        })
                      }
                      required
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
