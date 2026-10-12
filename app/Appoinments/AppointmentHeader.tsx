import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import styles from "./AppointmentHeader.module.css";

type AppointmentHeaderProps = {
  actionLabel: string;
  title: string;
  description: string;
  backHref?: string;
};

export default function AppointmentHeader({
  actionLabel,
  title,
  description,
  backHref = "/",
}: AppointmentHeaderProps) {
  return (
    <header className={styles.appointmentHeader}>
      <Link className={styles.backButton} href={backHref}>
        <FiArrowLeft aria-hidden="true" />
        <span>Volver</span>
      </Link>

      <div className={styles.headerContent}>
        <div className={styles.titleGroup}>
          <p className={styles.actionLabel}>{actionLabel}</p>
          <h1 className={styles.title}>{title}</h1>
        </div>
        <p className={styles.description}>{description}</p>
      </div>
    </header>
  );
}
