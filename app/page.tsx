import Image from "next/image";
import profileImage from "./assets/web1.jpg";
import studioImage from "./assets/web2.jpg";
import mobile1 from "./assets/mobile1.jpg";
import mobile2 from "./assets/mobile2.jpg";

import { FaInstagram, FaTiktok, FaWhatsapp } from "react-icons/fa";
import { ActionCard } from "@/components/ActionCard";
import { IoLocationOutline } from "react-icons/io5";

const actions = [
  {
    number: "01",
    title: "Crear un turno",
    description:
      "Elegí servicio, día y horario. Te lleva menos de dos minutos.",
    href: "#crear-turno",
    label: "Agendar turno",
  },
  {
    number: "02",
    title: "Modificar turno",
    description: "Encontrá una nueva fecha o un horario que te quede mejor.",
    href: "#modificar-turno",
    label: "Modificar turno",
  },
  {
    number: "03",
    title: "Cancelar turno",
    description: "Cancelá tu reserva de forma simple.",
    href: "#cancelar-turno",
    label: "Cancelar turno",
  },
];

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
        <a href="#opciones-turno">Opciones de turno</a>
        <a href="#mas-informacion">Más información</a>
      </nav>

      <section
        className="about-section"
        id="inicio"
        aria-labelledby="about-heading"
      >
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
          <span className="about-spark" aria-hidden="true">
            ✦
          </span>
          <p className="about-kicker">Creado por Milagro Chacón</p>
          <h1 id="about-heading">
            BLABLABLA <span>babababba</span>
          </h1>
          <p className="about-description">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
            euismod, nisl vel tincidunt lacinia, nunc est aliquam nunc, eget
            aliquam nisl nunc euismod nunc. Sed euismod, nisl vel tincidunt
            lacinia, nunc est aliquam nunc, eget aliquam nisl nunc euismod nunc.
          </p>
          <a className="about-scroll-link" href="#opciones-turno">
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

      <section
        className="actions-section"
        id="opciones-turno"
        aria-labelledby="options-heading"
      >
        <div className="section-label">
          <span className="star" aria-hidden="true">
            ✦
          </span>
          <span id="options-heading">Elige una opción</span>
        </div>
        <div className="actions-grid">
          {actions.map((action, index) => (
            <ActionCard key={action.number} card={action} index={index} />
          ))}
        </div>
      </section>

      <section
        id="mas-informacion"
        className="moreInfo"
        aria-labelledby="moreInfoTitle"
      >
        <header className="moreInfoHeader">
          <div>
            <h2 id="moreInfoTitle" className="section-label">
              Más información
            </h2>
            <p className="moreInfoDescription">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
          </div>
        </header>

        <address className="moreInfoAddress">
          <IoLocationOutline aria-hidden="true" />
          <div>
            <h3>Ubicación</h3>
            <p>Avenida Gaona 2554. Caballito, CABA.</p>
          </div>
        </address>

        <div className="moreInfoMap">
          <iframe
            title="Mapa de Google Maps con la ubicación de Alma Estudio"
            src="https://maps.google.com/maps?q=Avenida%20Gaona%202554%2C%20Caballito%2C%20CABA%2C%20Argentina&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <nav
          className="moreInfoSocialNav"
          aria-label="Redes sociales y WhatsApp"
        >
          <ul className="moreInfoSocialList">
            <li>
              <a
                href="https://www.instagram.com/almaestudio.ar"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram de Alma Estudio"
              >
                <FaInstagram aria-hidden="true" />
              </a>
              <span>@almaestudio.ar</span>
            </li>
            <li>
              <a
                href="https://wa.me/5491176606137"
                target="_blank"
                rel="noreferrer"
                aria-label="Contactar por WhatsApp"
              >
                <FaWhatsapp aria-hidden="true" />
              </a>
              <span>+54 9 11 7660-6137</span>
            </li>
            <li>
              <a
                href="https://www.tiktok.com/@almaestudio.ar"
                target="_blank"
                rel="noreferrer"
                aria-label="TikTok de Alma Estudio"
              >
                <FaTiktok aria-hidden="true" />
              </a>
              <span>@almaestudio.ar</span>
            </li>
          </ul>
        </nav>
      </section>
    </main>
  );
}
