import Image from "next/image";
import profileImage from "./assets/web1.jpg";
import studioImage from "./assets/web2.jpg";
import mobile1 from "./assets/mobile1.jpg";
import mobile2 from "./assets/mobile2.jpg";


/*
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
*/

export default function Home() {
  return (
    <main className="site-shell">
      <header>
        <span className="brand-mark" aria-label="Alma Estudio">
          <span className="brand-mark-name">ALMA</span>
          <span className="brand-mark-subtitle">ESTUDIO</span>
        </span>
      </header>

      <nav className="header-nav" aria-label="Navegación principal">
        <a href="#inicio">Sobre nosotros</a>
        <a href="#agendar-turno">Agendar turno</a>
        <a href="#mas-informacion">Más información</a>
      </nav>

      <section className="about-section" id="inicio" aria-labelledby="about-heading">
        <div className="about-image about-image-left">
          <Image
            src={profileImage}
            alt="Imagen de presentación de Alma Estudio"
            fill
            quality={100}
            sizes="(max-width: 700px) 100vw, 25vw"
            className="about-photo about-photo-desktop about-photo-left"
          />
          <Image
            src={mobile1}
            alt=""
            fill
            quality={100}
            sizes="100vw"
            className="about-photo about-photo-mobile"
          />
        </div>
        <div className="about-content">
          <span className="about-spark" aria-hidden="true">✦</span>
          <p className="about-kicker">Creado por Milagro Chacón</p>
          <h1 id="about-heading">
            BLABLABLA <span>babababba</span>
          </h1>
          <p className="about-description">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
            euismod, nisl vel tincidunt lacinia, nunc est aliquam nunc, eget
            aliquam nisl nunc euismod nunc. Sed euismod, nisl vel tincidunt
            lacinia, nunc est aliquam nunc, eget aliquam nisl nunc euismod
            nunc.
          </p>
          <a className="about-scroll-link" href="#agendar-turno">
            agenda un turno
          </a>
        </div>
        <div className="about-image about-image-right">
          <Image
            src={studioImage}
            alt="Detalle del trabajo de Alma Estudio"
            fill
            quality={100}
            sizes="(max-width: 700px) 100vw, 25vw"
            className="about-photo about-photo-desktop about-photo-right"
          />
          <Image
            src={mobile2}
            alt=""
            fill
            quality={100}
            sizes="100vw"
            className="about-photo about-photo-mobile"
          />
        </div>
      </section>


    {/* <div className="ambient-shape ambient-shape-left" />
      <div className="ambient-shape ambient-shape-right" /> */}
      {/* 
      
      <section
        className="actions-section"
        id="agendar-turno"
        aria-labelledby="actions-heading"
      >
        <div className="eyebrow">
          <span className="eyebrow-spark" aria-hidden="true">
            ✦
          </span>
          <span>Agendá tu próximo turno</span>
        </div>
        <div className="actions-grid">
          {actions.map((action) => (
            <ActionCard key={action.number} {...action} />
          ))}
        </div>
      </section>

      <footer className="site-footer" id="mas-informacion">
        <div>
          <span className="footer-label">Más información</span>
        </div>
        <nav className="social-links" aria-label="Redes sociales">
          <a href="#instagram" aria-label="Instagram">
            <span className="social-icon" aria-hidden="true">
              ◎
            </span>
            Instagram
          </a>
          <a href="#tiktok" aria-label="TikTok">
            <span className="social-icon" aria-hidden="true">
              ♪
            </span>
            TikTok
          </a>
          <a
            href="https://maps.app.goo.gl/WrzX92Q3168sPiAx5"
            target="_blank"
            rel="noreferrer"
            aria-label="Ver ubicación en Google Maps"
          >
            <span className="social-icon" aria-hidden="true">
              📍
            </span>
            Ubicación
          </a>
        </nav>
      </footer>
      */}

    </main>
  );
}
