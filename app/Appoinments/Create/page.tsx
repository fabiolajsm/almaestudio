import AppointmentHeader from "../AppointmentHeader";
import SiteHeader from "../../SiteHeader";

export default function CreateAppointmentPage() {
  return (
    <main className="site-shell">
      <SiteHeader />
      <AppointmentHeader
        actionLabel="Sacar turno"
        title="Tu próximo momento."
        description="Elegí con calma. La agenda se actualiza en cada paso."
      />
    </main>
  );
}
