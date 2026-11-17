import Image from "next/image";
import profileImage from "./assets/web1.jpg";
import studioImage from "./assets/web2.jpg";
import mobile1 from "./assets/mobile1.jpg";
import mobile2 from "./assets/mobile2.jpg";

import { FaInstagram, FaTiktok, FaWhatsapp } from "react-icons/fa";
import { ActionCard } from "@/components/ActionCard";
import { IoLocationOutline } from "react-icons/io5";
import { CARDS_ACTIONS } from "./constants";
import SiteHeader from "../components/SiteHeader";

export default function Home() {
  return (
    <main className="site-shell">
      <SiteHeader showNavigation isFixed />

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
            Tu belleza, <span>nuestro momento</span>
          </h1>
          <p className="about-description">
            En Alma Estudio creamos un espacio dedicado al cuidado personal y la
            belleza. Ofrecemos servicios de uñas, cejas y pestañas, cuidando
            cada detalle para que disfrutes de una experiencia única y te
            sientas bien en cada visita.
          </p>
          <a className="about-scroll-link" href="/Appoinments/Create">
            Tu momento comienza aquí
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
          {CARDS_ACTIONS.map((action, index) => (
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
              Trabajamos con turnos previos para brindarte una atención
              personalizada y sin esperas. Nuestro estudio funciona en un
              departamento, pensado para que te sientas cómoda y como en casa.
              Ante cualquier consulta, no dudes en escribirnos. ¡Esperamos verte
              pronto!
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

        <p className="moreInfoDescription">
          ¿Ya nos visitaste? Nos encantaría conocer tu experiencia: podés
          dejarnos tu opinión en{" "}
          <a
            href="TU_LINK_DE_GOOGLE_FORMS"
            target="_blank"
            rel="noopener noreferrer"
            className="moreInfoLink"
          >
            este formulario
          </a>{" "}
          o compartir una reseña en{" "}
          <a
            href="TU_LINK_DE_GOOGLE_MAPS"
            target="_blank"
            rel="noopener noreferrer"
            className="moreInfoLink"
          >
            Google Maps
          </a>
          . ¡Tu comentario nos ayuda un montón a seguir creciendo!
        </p>
      </section>

      <footer className="siteFooter">
        <p>
          © {new Date().getFullYear()} Alma Estudio. Todos los derechos
          reservados.
        </p>
        <p className="footerCredit">
          website hecha por{" "}
          <a
            href="https://www.linkedin.com/in/fabiolajsm"
            target="_blank"
            rel="noopener noreferrer"
          >
            @fabiolajsm
          </a>
        </p>
      </footer>
    </main>
  );
}
