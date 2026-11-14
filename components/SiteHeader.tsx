import Link from "next/link";
import styles from "./SiteHeader.module.css";

type SiteHeaderProps = {
  showNavigation?: boolean;
  isFixed?: boolean;
};

export default function SiteHeader({
  showNavigation = false,
  isFixed = false,
}: SiteHeaderProps) {
  return (
    <>
      <header
        className={`${styles.siteHeader} ${isFixed ? styles.fixedHeader : ""}`}
      >
        <Link className={styles.brandMark} href="/" aria-label="Alma Estudio">
          <span className={styles.brandName}>ALMA</span>
          <span className={styles.brandSubtitle}>ESTUDIO</span>
        </Link>
        {showNavigation && (
          <nav
            className={styles.siteNavigation}
            aria-label="Navegación principal"
          >
            <a href="#inicio">Sobre nosotros</a>
            <a href="#opciones-turno">Opciones de turno</a>
            <a href="#mas-informacion">Más información</a>
          </nav>
        )}
      </header>
      {isFixed && (
        <div className={styles.fixedHeaderSpacer} aria-hidden="true" />
      )}
    </>
  );
}
