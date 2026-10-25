"use client";

import { FiRefreshCw } from "react-icons/fi";
import styles from "./AppointmentSchedule.module.css";

type AppointmentScheduleProps = {
  today: string;
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
const timeSlots = [
  { time: "10:00", unavailable: false },
  { time: "11:30", unavailable: true },
  { time: "14:00", unavailable: false },
  { time: "15:30", unavailable: false },
  { time: "17:00", unavailable: true },
  { time: "18:30", unavailable: false },
];

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
  onSelectDate,
}: {
  month: Date;
  selectedDate: string | null;
  today: string;
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
          const isUnavailable = dateKey < today || date.getUTCDay() === 0;
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
  const formattedSelectedDate = selectedDate
    ? getAccessibleDate(getDateFromKey(selectedDate))
    : null;

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
            onSelectDate={(date) => {
              onSelectDate(date);
              onSelectTime("");
            }}
          />
        ))}
      </div>

      <p className={styles.availabilityNote}>
        <FiRefreshCw aria-hidden="true" />
        Disponibilidad de ejemplo · dejamos 15 min entre clientas
      </p>

      <div className={styles.timeHeading}>
        <h3>Horarios</h3>
        <ul className={styles.legend} aria-label="Referencias de horarios">
          <li>
            <span className={styles.availableDot} aria-hidden="true" />
            Disponible
          </li>
          <li>
            <span className={styles.unavailableDot} aria-hidden="true" />
            Ocupado
          </li>
        </ul>
      </div>

      {selectedDate ? (
        <div className={styles.timeSlots} aria-label="Horarios disponibles">
          {timeSlots.map(({ time, unavailable }) => (
            <button
              key={time}
              type="button"
              className={`${styles.timeSlot} ${unavailable ? styles.unavailable : styles.availableTime} ${selectedTime === time ? styles.selectedTime : ""}`}
              aria-pressed={!unavailable && selectedTime === time}
              disabled={unavailable}
              onClick={() => onSelectTime(time)}
            >
              {time}
              {unavailable && <span className={styles.srOnly}> - ocupado</span>}
              {unavailable && (
                <span className={styles.unavailableLabel} aria-hidden="true">
                  ocupado
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <p className={styles.chooseDate}>
          Elegí un día para consultar los horarios.
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
