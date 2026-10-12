import AppointmentHeader from "../AppointmentHeader";
import SiteHeader from "../../SiteHeader";

export default function ModifyAppointmentPage() {
  return (
    <main className="site-shell">
      <SiteHeader />
      <AppointmentHeader
        actionLabel="Modificar turno"
        title="Tu próximo momento."
        description="Elegí con calma. La agenda se actualiza en cada paso."
      />
    </main>
  );
}
