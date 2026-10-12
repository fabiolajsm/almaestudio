import AppointmentHeader from "../AppointmentHeader";
import SiteHeader from "../../SiteHeader";

export default function DeleteAppointmentPage() {
  return (
    <main className="site-shell">
      <SiteHeader />
      <AppointmentHeader
        actionLabel="Cancelar turno"
        title="Liberá tu espacio."
        description="Antes de cancelar, revisá que sea la reserva correcta."
      />
    </main>
  );
}
