import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import type { SuccessStateProps } from "@/app/Appoinments/types";
import styles from "./SuccessState.module.css";

export default function SuccessState({
  icon,
  title,
  description,
  actionLabel = "Volver al inicio",
  actionHref = "/",
  variant = "success",
}: SuccessStateProps) {
  const iconClassName =
    variant === "danger"
      ? `${styles.successIcon} ${styles.dangerIcon}`
      : styles.successIcon;
  return (
    <section className={styles.successStateContainer} aria-live="polite">
      <div className={styles.success} role="status">
        <span className={iconClassName} aria-hidden="true">
          {icon}
        </span>
        <h2>{title}</h2>
        <p>{description}</p>
        <Link className="primary-button" href={actionHref}>
          {actionLabel}
          <FiArrowRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}