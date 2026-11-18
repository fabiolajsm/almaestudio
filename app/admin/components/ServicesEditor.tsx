"use client";

import { useState } from "react";
import { FiCheck, FiEdit2, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import {
  CATEGORY_NAME_MAX_LENGTH,
  DEFAULT_SERVICE_DURATION,
  DEFAULT_SERVICE_PRICE,
  MAX_APPOINTMENT_CATEGORIES,
  MIN_APPOINTMENT_CATEGORIES,
  MIN_APPOINTMENT_SERVICES,
  SERVICE_DESCRIPTION_MAX_LENGTH,
  SERVICE_DURATION_MINUTES,
  SERVICE_NAME_MAX_LENGTH,
  SERVICE_PRICE,
} from "@/app/constants";
import { validateAppointmentServiceDraft } from "@/app/validations";
import type {
  AppointmentService,
  AppointmentServiceDraft,
} from "@/app/types";
import ConfirmDialog from "@/components/ConfirmDialog";
import Services from "@/components/Services";
import type { ServicesEditorProps } from "../types";
import styles from "../page.module.css";

export default function ServicesEditor({
  categories,
  services,
  onChange,
}: ServicesEditorProps) {
  const [selectedServiceIdForAdmin, setSelectedServiceIdForAdmin] = useState<
    string | null
  >(null);
  const [serviceIdPendingRemoval, setServiceIdPendingRemoval] = useState<
    string | null
  >(null);
  const [isCreatingService, setIsCreatingService] = useState(false);
  const [newServiceDraft, setNewServiceDraft] =
    useState<AppointmentServiceDraft>({
      name: "",
      description: "",
      category: categories[0]?.id ?? "",
      duration: DEFAULT_SERVICE_DURATION,
      price: DEFAULT_SERVICE_PRICE,
    });
  const [serviceDraftError, setServiceDraftError] = useState("");

  // Estado para controlar qué categoría se está editando con el lápiz/ok
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );

  const selectedService = services.find(
    (s) => s.id === selectedServiceIdForAdmin,
  );
  const servicePendingRemoval = services.find(
    (service) => service.id === serviceIdPendingRemoval,
  );

  function updateNewServiceDraft(changes: Partial<AppointmentServiceDraft>) {
    setNewServiceDraft((current) => ({ ...current, ...changes }));
    setServiceDraftError("");
  }

  function updateCategoryName(categoryId: string, name: string) {
    const updatedCategories = categories.map((cat) =>
      cat.id === categoryId ? { ...cat, name } : cat,
    );
    onChange(updatedCategories, services);
  }

  function addCategory() {
    const newId = crypto.randomUUID();
    const updatedCategories = [
      ...categories,
      {
        id: newId,
        name: "Nueva categoría",
      },
    ];
    onChange(updatedCategories, services);
    // Al crearla, la ponemos directamente en modo edición para mayor comodidad
    setEditingCategoryId(newId);
  }

  function removeCategory(categoryId: string) {
    const servicesInCat = services.filter((s) => s.category === categoryId);
    if (servicesInCat.length > 0) {
      alert(
        "No se puede eliminar una categoría que contiene servicios asociados.",
      );
      return;
    }
    if (categories.length <= MIN_APPOINTMENT_CATEGORIES) {
      alert("Debe existir al menos una categoría.");
      return;
    }

    const updatedCategories = categories.filter((cat) => cat.id !== categoryId);
    onChange(updatedCategories, services);
  }

  function updateService(
    serviceId: string,
    changes: Partial<AppointmentService>,
  ) {
    const updatedServices = services.map((service) =>
      service.id === serviceId ? { ...service, ...changes } : service,
    );
    onChange(categories, updatedServices);
  }

  function commitNewService() {
    const validationError = validateAppointmentServiceDraft(
      newServiceDraft,
      categories,
    );
    if (validationError) {
      setServiceDraftError(validationError);
      return;
    }

    const newId = crypto.randomUUID();
    const updatedServices = [
      ...services,
      {
        id: newId,
        ...newServiceDraft,
      },
    ];
    onChange(categories, updatedServices);
    setIsCreatingService(false);
    setServiceDraftError("");
    setSelectedServiceIdForAdmin(newId);
  }

  function removeService(serviceId: string) {
    const service = services.find((item) => item.id === serviceId);
    if (!service || services.length <= MIN_APPOINTMENT_SERVICES) {
      return;
    }

    setServiceIdPendingRemoval(serviceId);
  }

  function confirmRemoveService() {
    if (!serviceIdPendingRemoval) {
      return;
    }

    if (
      services.length <= MIN_APPOINTMENT_SERVICES ||
      !services.some((service) => service.id === serviceIdPendingRemoval)
    ) {
      setServiceIdPendingRemoval(null);
      return;
    }

    const updatedServices = services.filter(
      (item) => item.id !== serviceIdPendingRemoval,
    );
    onChange(categories, updatedServices);
    setSelectedServiceIdForAdmin((selectedId) =>
      selectedId === serviceIdPendingRemoval ? null : selectedId,
    );
    setServiceIdPendingRemoval(null);
  }

  return (
    <section className={styles.settingsSection}>
      <h2 className={styles.optionSelectedTitle}>Servicios y Categorías</h2>
      <p className={styles.optionSelectedDescription}>
        Cada cambio que hagas se guardará al presionar el botón «Guardar
        cambios» al final de la página.
      </p>

      {/* Vista y edición de servicios */}
      <div className={styles.adminServicesLayout}>
        <div className={`${styles.servicesListPanel} surface-card`}>
          <h4 className={styles.subTitle}>Seleccionar servicio</h4>
          <Services
            hasToShowCount={false}
            categories={categories}
            services={services}
            selectedServiceIds={
              selectedServiceIdForAdmin ? [selectedServiceIdForAdmin] : []
            }
            onToggleService={(id) => {
              if (selectedServiceIdForAdmin === id) {
                setSelectedServiceIdForAdmin(null);
              } else {
                setSelectedServiceIdForAdmin(id);
                setIsCreatingService(false);
              }
            }}
          />
          {categories.length >= MIN_APPOINTMENT_CATEGORIES &&
            !isCreatingService && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setIsCreatingService(true);
                setSelectedServiceIdForAdmin(null);
                setServiceDraftError("");
                setNewServiceDraft({
                  name: "",
                  description: "",
                  category: categories[0].id,
                  duration: DEFAULT_SERVICE_DURATION,
                  price: DEFAULT_SERVICE_PRICE,
                });
              }}
            >
              <FiPlus /> Agregar nuevo servicio
            </button>
          )}
        </div>

        <div className={styles.serviceEditorPanel}>
          {isCreatingService ? (
            <div
              className={`surface-card ${styles.serviceCard}`}
            >
              <div className={styles.serviceCardHeader}>
                <h4>Nuevo servicio</h4>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setIsCreatingService(false);
                    setServiceDraftError("");
                  }}
                  aria-label="Descartar nuevo servicio"
                >
                  <FiX aria-hidden="true" />
                  Descartar
                </button>
              </div>
              <label>
                Nombre
                <input
                  type="text"
                  value={newServiceDraft.name}
                  maxLength={SERVICE_NAME_MAX_LENGTH}
                  placeholder="Ej: Corte y Brushings"
                  onChange={(event) =>
                    updateNewServiceDraft({
                      name: event.currentTarget.value,
                    })
                  }
                  required
                />
              </label>
              <label>
                Categoría
                <select
                  value={newServiceDraft.category}
                  onChange={(event) =>
                    updateNewServiceDraft({
                      category: event.currentTarget.value,
                    })
                  }
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Descripción
                <textarea
                  value={newServiceDraft.description ?? ""}
                  maxLength={SERVICE_DESCRIPTION_MAX_LENGTH}
                  rows={3}
                  placeholder="Detalles breves del servicio..."
                  onChange={(event) =>
                    updateNewServiceDraft({
                      description: event.currentTarget.value,
                    })
                  }
                />
              </label>
              <div className={styles.serviceNumbers}>
                <label>
                  Duración (min)
                  <input
                    type="number"
                    min={SERVICE_DURATION_MINUTES.min}
                    max={SERVICE_DURATION_MINUTES.max}
                    step={SERVICE_DURATION_MINUTES.step}
                    value={newServiceDraft.duration}
                    onChange={(event) =>
                      updateNewServiceDraft({
                        duration: Number(event.currentTarget.value),
                      })
                    }
                    required
                  />
                </label>
                <label>
                  Precio ($)
                  <input
                    type="number"
                    min={SERVICE_PRICE.min}
                    max={SERVICE_PRICE.max}
                    step={SERVICE_PRICE.step}
                    value={newServiceDraft.price}
                    onChange={(event) =>
                      updateNewServiceDraft({
                        price: Number(event.currentTarget.value),
                      })
                    }
                    required
                  />
                </label>
              </div>
              {serviceDraftError && (
                <p className={styles.message} role="alert">
                  {serviceDraftError}
                </p>
              )}
              <button
                type="button"
                className="primary-button"
                onClick={commitNewService}
              >
                <FiPlus aria-hidden="true" />
                Guardar y agregar servicio
              </button>
            </div>
          ) : selectedService ? (
            <div
              className={`surface-card ${styles.serviceCard}`}
            >
              <h4>Editar servicio seleccionado</h4>
              <label>
                Nombre
                <input
                  type="text"
                  value={selectedService.name}
                  maxLength={SERVICE_NAME_MAX_LENGTH}
                  onChange={(event) =>
                    updateService(selectedService.id, {
                      name: event.currentTarget.value,
                    })
                  }
                  required
                />
              </label>
              <label>
                Categoría
                <select
                  value={selectedService.category}
                  onChange={(event) =>
                    updateService(selectedService.id, {
                      category: event.currentTarget.value,
                    })
                  }
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Descripción
                <textarea
                  value={selectedService.description ?? ""}
                  maxLength={SERVICE_DESCRIPTION_MAX_LENGTH}
                  rows={3}
                  onChange={(event) =>
                    updateService(selectedService.id, {
                      description: event.currentTarget.value,
                    })
                  }
                />
              </label>
              <div className={styles.serviceNumbers}>
                <label>
                  Duración (min)
                  <input
                    type="number"
                    min={SERVICE_DURATION_MINUTES.min}
                    max={SERVICE_DURATION_MINUTES.max}
                    step={SERVICE_DURATION_MINUTES.step}
                    value={selectedService.duration}
                    onChange={(event) =>
                      updateService(selectedService.id, {
                        duration: Number(event.currentTarget.value),
                      })
                    }
                    required
                  />
                </label>
                <label>
                  Precio ($)
                  <input
                    type="number"
                    min={SERVICE_PRICE.min}
                    max={SERVICE_PRICE.max}
                    step={SERVICE_PRICE.step}
                    value={selectedService.price}
                    onChange={(event) =>
                      updateService(selectedService.id, {
                        price: Number(event.currentTarget.value),
                      })
                    }
                    required
                  />
                </label>
              </div>
              <button
                type="button"
                className={styles.removeServiceButton}
                disabled={services.length <= MIN_APPOINTMENT_SERVICES}
                onClick={() => removeService(selectedService.id)}
              >
                <FiTrash2 aria-hidden="true" />
                Eliminar servicio
              </button>
            </div>
          ) : (
            <p className={`surface-card ${styles.emptySelection}`}>
              Acá se mostrarán los detalles del servicio seleccionado para
              editarlo o eliminarlo.
            </p>
          )}
        </div>
      </div>

      {/* Gestión de Categorías */}
      <div className={`surface-card ${styles.categoriesAdminContainer}`}>
        <h4 className={styles.subTitle}>Administrar Categorías</h4>
        {categories.map((cat) => {
          const servicesCount = services.filter(
            (s) => s.category === cat.id,
          ).length;
          const isEditing = editingCategoryId === cat.id;

          return (
            <div key={cat.id} className={styles.categoryRow}>
              {isEditing ? (
                <input
                  type="text"
                  className={styles.categoryInput}
                  value={cat.name}
                  onChange={(e) => updateCategoryName(cat.id, e.target.value)}
                  maxLength={CATEGORY_NAME_MAX_LENGTH}
                  autoFocus
                />
              ) : (
                <span className={styles.categoryName}>{cat.name}</span>
              )}

              {/* Botón alternar Lápiz / Ok (Check) */}
              <button
                type="button"
                className="secondary-button"
                onClick={() => setEditingCategoryId(isEditing ? null : cat.id)}
                title={isEditing ? "Guardar nombre" : "Editar categoría"}
              >
                {isEditing ? <FiCheck /> : <FiEdit2 />}
              </button>
              {isEditing && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setEditingCategoryId(null)}
                  title="Descartar edición"
                  aria-label={`Descartar edición de la categoría ${cat.name}`}
                >
                  <FiX aria-hidden="true" />
                </button>
              )}

              {/* Botón Eliminar (X / Papelera) */}
              <button
                type="button"
                className={styles.removeServiceButton}
                disabled={
                  servicesCount > 0 ||
                  categories.length <= MIN_APPOINTMENT_CATEGORIES
                }
                onClick={() => removeCategory(cat.id)}
                title={
                  servicesCount > 0
                    ? "No se puede eliminar una categoría con servicios asociados"
                    : "Eliminar categoría"
                }
              >
                <FiTrash2 />
              </button>

              <span className={styles.categoryCount}>
                ({servicesCount} serv.)
              </span>
            </div>
          );
        })}
        <button
          type="button"
          className="secondary-button"
          onClick={addCategory}
          disabled={categories.length >= MAX_APPOINTMENT_CATEGORIES}
        >
          <FiPlus /> Agregar categoría
        </button>
      </div>
      <ConfirmDialog
        isOpen={serviceIdPendingRemoval !== null}
        title="Eliminar servicio"
        description={
          servicePendingRemoval
            ? `¿Querés eliminar el servicio «${servicePendingRemoval.name}»?`
            : "El servicio seleccionado ya no está disponible."
        }
        confirmText="Eliminar servicio"
        cancelText="No, mantener"
        confirmButtonClassName={styles.removeServiceButton}
        onConfirm={confirmRemoveService}
        onCancel={() => setServiceIdPendingRemoval(null)}
      />
    </section>
  );
}
