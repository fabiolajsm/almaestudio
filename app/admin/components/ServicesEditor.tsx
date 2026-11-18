"use client";

import { useState } from "react";
import { FiCheck, FiEdit2, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import type {
  AppointmentService,
  AppointmentServiceCategoryDefinition,
} from "@/app/Appoinments/appointmentCatalog";
import Services from "@/components/Services";
import styles from "../page.module.css";

type ServicesEditorProps = {
  categories: AppointmentServiceCategoryDefinition[];
  services: AppointmentService[];
  onChange: (
    categories: AppointmentServiceCategoryDefinition[],
    services: AppointmentService[],
  ) => void;
};

export default function ServicesEditor({
  categories,
  services,
  onChange,
}: ServicesEditorProps) {
  const [selectedServiceIdForAdmin, setSelectedServiceIdForAdmin] = useState<
    string | null
  >(null);
  const [isCreatingService, setIsCreatingService] = useState(false);
  const [newServiceDraft, setNewServiceDraft] = useState<
    Omit<AppointmentService, "id">
  >({
    name: "",
    description: "",
    category: categories[0]?.id ?? "",
    duration: 60,
    price: 0,
  });

  // Estado para controlar qué categoría se está editando con el lápiz/ok
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );

  const selectedService = services.find(
    (s) => s.id === selectedServiceIdForAdmin,
  );

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
    if (categories.length <= 1) {
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
    if (!newServiceDraft.name.trim()) {
      alert("El servicio debe tener un nombre válido.");
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
    setSelectedServiceIdForAdmin(newId);
  }

  function removeService(serviceId: string) {
    const service = services.find((item) => item.id === serviceId);
    if (
      !service ||
      services.length <= 1 ||
      !window.confirm(`¿Querés eliminar el servicio «${service.name}»?`)
    ) {
      return;
    }

    const updatedServices = services.filter((item) => item.id !== serviceId);
    onChange(categories, updatedServices);
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
          {categories.length > 0 && !isCreatingService && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setIsCreatingService(true);
                setSelectedServiceIdForAdmin(null);
                setNewServiceDraft({
                  name: "",
                  description: "",
                  category: categories[0].id,
                  duration: 60,
                  price: 0,
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
                  className={styles.serviceCloseButton}
                  onClick={() => setIsCreatingService(false)}
                  aria-label="Cerrar formulario de nuevo servicio"
                >
                  <FiX aria-hidden="true" />
                </button>
              </div>
              <label>
                Nombre
                <input
                  type="text"
                  value={newServiceDraft.name}
                  maxLength={100}
                  placeholder="Ej: Corte y Brushings"
                  onChange={(event) =>
                    setNewServiceDraft((prev) => ({
                      ...prev,
                      name: event.currentTarget.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                Categoría
                <select
                  value={newServiceDraft.category}
                  onChange={(event) =>
                    setNewServiceDraft((prev) => ({
                      ...prev,
                      category: event.currentTarget.value,
                    }))
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
                  maxLength={240}
                  rows={3}
                  placeholder="Detalles breves del servicio..."
                  onChange={(event) =>
                    setNewServiceDraft((prev) => ({
                      ...prev,
                      description: event.currentTarget.value,
                    }))
                  }
                />
              </label>
              <div className={styles.serviceNumbers}>
                <label>
                  Duración (min)
                  <input
                    type="number"
                    min={15}
                    max={600}
                    step={15}
                    value={newServiceDraft.duration}
                    onChange={(event) =>
                      setNewServiceDraft((prev) => ({
                        ...prev,
                        duration: Number(event.currentTarget.value),
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  Precio ($)
                  <input
                    type="number"
                    min={0}
                    max={10_000_000}
                    step={500}
                    value={newServiceDraft.price}
                    onChange={(event) =>
                      setNewServiceDraft((prev) => ({
                        ...prev,
                        price: Number(event.currentTarget.value),
                      }))
                    }
                    required
                  />
                </label>
              </div>
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
                  maxLength={100}
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
                  maxLength={240}
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
                    min={15}
                    max={600}
                    step={15}
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
                    min={0}
                    max={10_000_000}
                    step={500}
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
                disabled={services.length <= 1}
                onClick={() => {
                  removeService(selectedService.id);
                  setSelectedServiceIdForAdmin(null);
                }}
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
                  maxLength={60}
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

              {/* Botón Eliminar (X / Papelera) */}
              <button
                type="button"
                className={styles.removeServiceButton}
                disabled={servicesCount > 0 || categories.length <= 1}
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
        >
          <FiPlus /> Agregar categoría
        </button>
      </div>
    </section>
  );
}
