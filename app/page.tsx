import { ActionCard } from "../components/ActionCard";

const actions = [
  {
    number: "01",
    title: "Crear un turno",
    description: "Elegí tu servicio y encontrá el momento ideal para vos.",
    href: "#crear-turno",
    label: "Agendar ahora",
    tone: "terracotta" as const,
  },
  {
    number: "02",
    title: "Modificar mi turno",
    description: "¿Necesitás cambiar el día o el horario? Lo hacemos fácil.",
    href: "#modificar-turno",
    label: "Modificar turno",
    tone: "sage" as const,
  },
  {
    number: "03",
    title: "Cancelar mi turno",
    description: "Liberá tu reserva de forma simple y sin vueltas.",
    href: "#cancelar-turno",
    label: "Cancelar turno",
    tone: "sand" as const,
  },
];

export default function Home() {
  return (
    <main className="site-shell">
      <div className="ambient-shape ambient-shape-left" />
      <div className="ambient-shape ambient-shape-right" />

      <header className="site-header">
        <span className="brand-mark" aria-label="Alma Estudio">
          <span className="brand-mark-name">ALMA</span>
          <span className="brand-mark-subtitle">ESTUDIO</span>
        </span>
        <a
          className="header-motto"
          href="https://maps.app.goo.gl/WrzX92Q3168sPiAx5"
          target="_blank"
          rel="noreferrer"
          aria-label="Ver Alma Estudio en Google Maps: Caballito, CABA"
        >
          <span>Agendar turno</span>
        </a>
      </header>
      <div className="separator" aria-hidden="true" />

      <section className="title" id="inicio">
        <div className="eyebrow">
          <span className="eyebrow-spark" aria-hidden="true">
            ✦
          </span>
          <span>Agenda online</span>
        </div>
        <h1>
          <span className="title-main">Agendá tu próximo turno</span>
          <span className="title-accent">A tus tiempos y con todo el alma</span>
        </h1>
      </section>

      <section className="actions-section" aria-labelledby="actions-heading">
        <div className="section-intro">
          <span className="section-label">Elegí una opción</span>
        </div>
        <div className="actions-grid">
          {actions.map((action) => (
            <ActionCard key={action.number} {...action} />
          ))}
        </div>
      </section>
      

      <footer className="site-footer">
        <div>
          <span className="footer-label">Más información</span>
        </div>
        <nav className="social-links" aria-label="Redes sociales">
          <a href="#instagram" aria-label="Instagram">
            <span className="social-icon" aria-hidden="true">◎</span>
            Instagram
          </a>
          <a href="#tiktok" aria-label="TikTok">
            <span className="social-icon" aria-hidden="true">♪</span>
            TikTok
          </a>
          <a href="https://maps.app.goo.gl/WrzX92Q3168sPiAx5" target="_blank" rel="noreferrer" aria-label="Ver ubicación en Google Maps">
            <span className="social-icon" aria-hidden="true">📍</span>
            Ubicación
          </a>
        </nav>
      </footer>
      <div className="footer-line" />
    </main>
  );
}
