"use client";

import type { LocationSettings } from "../types";
import styles from "../page.module.css";

type LocationEditorProps = {
  location?: LocationSettings;
  onChange: (location: LocationSettings) => void;
};

export default function LocationEditor({
  location,
  onChange,
}: LocationEditorProps) {
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
        Editá el texto de la dirección y el enlace para insertar el mapa.
      </p>
      <div className={`surface-card ${styles.serviceCard}`}>
        <label>
          Dirección
          <input
            type="text"
            maxLength={300}
            placeholder="Av. Santa Fe 1234, Palermo, CABA"
            value={location?.addressText ?? ""}
            onChange={(event) =>
              updateField("addressText", event.currentTarget.value)
            }
          />
        </label>
        <label>
          Enlace de Google Maps
          <input
            type="url"
            maxLength={2000}
            placeholder="https://www.google.com/maps/embed?..."
            value={location?.mapsUrl ?? ""}
            onChange={(event) =>
              updateField("mapsUrl", event.currentTarget.value)
            }
          />
        </label>
      </div>
    </section>
  );
}
