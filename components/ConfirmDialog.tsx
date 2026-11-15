"use client";

import type { ReactNode } from "react";
import Loading from "@/components/Loading";
import styles from "./ConfirmDialog.module.css";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonClassName?: string;
}

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = "Sí, confirmo",
  cancelText = "No, mantener",
  isBusy = false,
  onConfirm,
  onCancel,
  confirmButtonClassName = "primary-button",
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.dialogBackdrop}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <h2 id="confirm-dialog-title">{title}</h2>
        {description && <p className={styles.dialogDescription}>{description}</p>}
        
        <div className={styles.dialogActions}>
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
            disabled={isBusy}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={confirmButtonClassName}
            onClick={onConfirm}
            disabled={isBusy}
          >
            {isBusy ? <Loading label="Procesando..." inline /> : confirmText}
          </button>
        </div>
      </section>
    </div>
  );
}