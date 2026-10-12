import AppointmentHeader from "../AppointmentHeader";
import SiteHeader from "../../SiteHeader";

export default function ModifyAppointmentPage() {
  return (
    <main className="site-shell">
      <SiteHeader />
      <AppointmentHeader
        actionLabel="Modificar turno"
        title="Hacé lugar a un cambio."
        description="Podés cambiar el servicio, la fecha o el horario de tu reserva actual."
      />
    </main>
  );
}
