import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import type { ReactNode } from "react";
import styles from "./SuccessState.module.css";

interface SuccessStateProps {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  actionLabel?: string;
  actionHref?: string;
  variant?: "success" | "danger";
}

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