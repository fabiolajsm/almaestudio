"use client";

import type { SocialSettings } from "../types";
import styles from "../page.module.css";

type SocialEditorProps = {
  social?: SocialSettings;
  onChange: (social: SocialSettings) => void;
};

export default function SocialEditor({ social, onChange }: SocialEditorProps) {
  function updateField(field: keyof SocialSettings, value: string) {
    onChange({
      ...social,
      [field]: value,
    });
  }

  return (
    <section className={styles.settingsSection}>
      <h2 className={styles.optionSelectedTitle}>Redes sociales y contacto</h2>
      <p className={styles.optionSelectedDescription}>
        Configurá los canales de contacto y enlaces a tus redes.
      </p>
      <div className={`surface-card ${styles.serviceCard}`}>
        <label>
          WhatsApp (número con código de país, ej: +54911...)
          <input
            type="tel"
            placeholder="+54 9 11 1234-5678"
            value={social?.whatsapp ?? ""}
            onChange={(event) => updateField("whatsapp", event.currentTarget.value)}
          />
        </label>
        <label>
          Instagram (usuario o URL)
          <input
            type="text"
            placeholder="https://instagram.com/almaestudio"
            value={social?.instagram ?? ""}
            onChange={(event) => updateField("instagram", event.currentTarget.value)}
          />
        </label>
        <label>
          TikTok (usuario o URL)
          <input
            type="text"
            placeholder="https://tiktok.com/@almaestudio"
            value={social?.tiktok ?? ""}
            onChange={(event) => updateField("tiktok", event.currentTarget.value)}
          />
        </label>
      </div>
    </section>
  );
}