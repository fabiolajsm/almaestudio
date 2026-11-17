"use client";

import type { DailyScheduleMap, DaySchedule } from "../types";
import styles from "../page.module.css";

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
  const safeMinutes = Number.isFinite(minutes) ? minutes : 540;
  return `${String(Math.floor(safeMinutes / 60)).padStart(2, "0")}:${String(
    safeMinutes % 60,
  ).padStart(2, "0")}`;
}

function parseTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

type ScheduleEditorProps = {
  dailySchedule?: DailyScheduleMap;
  defaultOpening: number;
  defaultClosing: number;
  onChange: (dailySchedule: DailyScheduleMap, workingDays: number[]) => void;
};

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
        {weekdays.map(({ value, label }) => {
          const dayConfig = dailySchedule?.[value] ?? {
            enabled: false,
            openingTime: defaultOpening,
            closingTime: defaultClosing,
          };

          return (
            <div key={value} className={styles.serviceCard}>
              <label>
                <strong>{label}</strong>{" "}
                {dayConfig.enabled ? "(Abierto)" : "(Cerrado)"}
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
                      step={900}
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
                      step={900}
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
