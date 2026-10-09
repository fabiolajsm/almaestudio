import { FiArrowRight, FiCalendar,  FiX } from "react-icons/fi";
import { GoPencil } from "react-icons/go";
import styles from "./ActionCard.module.css";

type ActionCardItem = {
  number: string;
  title: string;
  description: string;
  href: string;
  label: string;
};

type ActionCardProps = {
  card: ActionCardItem;
  index: number;
};

const cardMeta = [
  { label: "AGENDAR", Icon: FiCalendar },
  { label: "MODIFICAR", Icon: GoPencil },
  { label: "CANCELAR", Icon: FiX },
];

export function ActionCard({ card, index }: ActionCardProps) {
  const meta = cardMeta[index % cardMeta.length];
  const Icon = meta.Icon;

  return (
    <article className={styles.card}>
      <div className={styles.cardTitle}>
        <span>
          {card.number} / {meta.label}
        </span>
        <Icon className={styles.symbol} aria-hidden="true" />
      </div>
      <div className={styles.content}>
        <h3>{card.title}</h3>
        <p>{card.description}</p>
      </div>
      <a className={styles.link} href={card.href} aria-label={card.label}>
        <span className={styles.arrow} aria-hidden="true">
          <FiArrowRight />
        </span>
      </a>
    </article>
  );
}
