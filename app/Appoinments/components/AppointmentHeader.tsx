import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import styles from "./AppointmentHeader.module.css";

type AppointmentHeaderProps = {
  actionLabel: string;
  title: string;
  description?: string | React.ReactNode;
  backHref?: string;
  showBackButton?: boolean;
};

export default function AppointmentHeader({
  actionLabel,
  title,
  description,
  backHref = "/",
  showBackButton = true,
}: AppointmentHeaderProps) {
  return (
    <header className={styles.appointmentHeader}>
      {showBackButton && (
        <Link className={styles.backButton} href={backHref}>
          <FiArrowLeft aria-hidden="true" />
          <span>Volver</span>
        </Link>
      )}

      <div className={styles.headerContent}>
        <div className={styles.titleGroup}>
          <p className={styles.actionLabel}>{actionLabel}</p>
          <h1 className={styles.title}>{title}</h1>
        </div>
        {description && typeof description === "string" && (
          <p className={styles.description}>{description}</p>
        )}
        {description && typeof description !== "string" && description}
      </div>
    </header>
  );
}
