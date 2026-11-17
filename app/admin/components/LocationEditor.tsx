"use client";

import type { LocationSettings } from "../types";
import styles from "../page.module.css";

type LocationEditorProps = {
  location?: LocationSettings;
  onChange: (location: LocationSettings) => void;
};

export default function LocationEditor({ location, onChange }: LocationEditorProps) {
  function updateField(field: keyof LocationSettings, value: string) {
    onChange({
      ...location,
      [field]: value,
    });
  }

  return (
    <section className={styles.settingsSection}>
      <h2 className={styles.optionSelectedTitle}>Ubicación</h2>
      <p className={styles.optionSelectedDescription}>
        Editá la dirección física del estudio y el enlace a Google Maps.
      </p>
      <div className={styles.serviceCard}>
        <label>
          Dirección (calle y número)
          <input
            type="text"
            placeholder="Av. Santa Fe 1234, Piso 2"
            value={location?.address ?? ""}
            onChange={(event) => updateField("address", event.currentTarget.value)}
          />
        </label>
        <div className={styles.hoursGrid}>
          <label>
            Ciudad / Barrio
            <input
              type="text"
              placeholder="Palermo, CABA"
              value={location?.city ?? ""}
              onChange={(event) => updateField("city", event.currentTarget.value)}
            />
          </label>
          <label>
            Provincia
            <input
              type="text"
              placeholder="Buenos Aires"
              value={location?.province ?? ""}
              onChange={(event) => updateField("province", event.currentTarget.value)}
            />
          </label>
        </div>
        <label>
          Enlace de Google Maps
          <input
            type="url"
            placeholder="https://maps.google.com/?q=..."
            value={location?.mapsUrl ?? ""}
            onChange={(event) => updateField("mapsUrl", event.currentTarget.value)}
          />
        </label>
        <label>
          Indicaciones adicionales (ej: timbre, referencias)
          <textarea
            rows={3}
            maxLength={240}
            placeholder="Timbre 2B, frente a la plaza..."
            value={location?.notes ?? ""}
            onChange={(event) => updateField("notes", event.currentTarget.value)}
          />
        </label>
      </div>
    </section>
  );
}