import { FiCalendar } from "react-icons/fi";
import type { Service } from "./Services";
import styles from "./TurnSummary.module.css";

type TurnSummaryProps = {
  services: Service[];
  selectedDate: string | null;
  selectedTime: string | null;
  durationMinutes?: number;
  totalPrice?: number;
};

const currencyFormatter = new Intl.NumberFormat("es-AR");

function formatSelectedDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
    .format(date)
    .replace(",", "");
}

export default function TurnSummary({
  services,
  selectedDate,
  selectedTime,
  durationMinutes,
  totalPrice,
}: TurnSummaryProps) {
  const calculatedDuration = services.reduce(
    (total, service) => total + service.duration,
    0,
  );
  const calculatedPrice = services.reduce(
    (total, service) => total + service.price,
    0,
  );
  const summaryDuration = durationMinutes ?? calculatedDuration;
  const summaryPrice = totalPrice ?? calculatedPrice;
  const summaryTitle =
    services.length === 1
      ? services[0].name
      : `${services.length} servicios`;
  const serviceNames = services.map((service) => service.name).join(" + ");

  return (
    <section className={styles.summary} aria-labelledby="turn-summary-title">
      <h2 id="turn-summary-title" className={styles.eyebrow}>
        Resumen de tu turno
      </h2>

      {services.length === 0 ? (
        <div className={styles.emptyState}>
          <FiCalendar className={styles.calendarIcon} aria-hidden="true" />
          <p className={styles.emptyMessage}>
            Tu selección aparece acá a medida que avanzás.
          </p>
        </div>
      ) : (
        <div className={styles.selectedContent} aria-live="polite">
          <h3 className={styles.title}>{summaryTitle}</h3>
          <p className={styles.serviceNames}>{serviceNames}</p>
          <p className={styles.totals}>
            {summaryDuration} min · $ {currencyFormatter.format(summaryPrice)}
          </p>
        </div>
      )}
      {(services.length > 0 || selectedDate || selectedTime) && (
        <dl className={styles.appointmentDetails}>
          <div className={styles.detailRow}>
            <dt>Fecha</dt>
            <dd>
              {selectedDate ? formatSelectedDate(selectedDate) : "A elegir"}
            </dd>
          </div>
          <div className={styles.detailRow}>
            <dt>Horario</dt>
            <dd>{selectedTime ? `${selectedTime} hs` : "A elegir"}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
