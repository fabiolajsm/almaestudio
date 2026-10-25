import AppointmentHeader from "../AppointmentHeader";
import SiteHeader from "../../SiteHeader";
import { FiMapPin, FiX } from "react-icons/fi";
import styles from "./page.module.css";

export default function DeleteAppointmentPage() {
  return (
    <main className="site-shell">
      <SiteHeader />
      <AppointmentHeader
        actionLabel="Cancelar turno"
        title="Liberá tu espacio."
        description="Antes de cancelar, revisá que sea la reserva correcta."
      />
      <section className={styles.confirmation} aria-labelledby="confirmation-title">
        <div className={styles.cardHeader}>
          <div>
            <p className={styles.appointmentCode}>Turno #ALM-2406</p>
            <h2 id="confirmation-title">Tu cita está confirmada</h2>
          </div>
          <span className={styles.status}>
            <span aria-hidden="true" />
            Confirmado
          </span>
        </div>

        <dl className={styles.appointmentDetails}>
          <div>
            <dt>Servicios</dt>
            <dd>Esmaltado semipermanente + Perfilado de cejas</dd>
          </div>
          <div>
            <dt>Fecha</dt>
            <dd>mié 14 oct</dd>
          </div>
          <div>
            <dt>Hora</dt>
            <dd>15:30 hs</dd>
          </div>
        </dl>

        <p className={styles.location}>
          <FiMapPin aria-hidden="true" />
          Thames 1684, Palermo · a nombre de Sofía R.
        </p>

        <p className={styles.notice}>
          Al cancelar, este horario vuelve a estar disponible para otra persona.
        </p>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton}>
            <FiX aria-hidden="true" />
            Sí, cancelar turno
          </button>
          <button type="button" className={styles.keepButton}>
            Mantener turno
          </button>
        </div>
      </section>
    </main>
  );
}
