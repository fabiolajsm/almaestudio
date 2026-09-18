import styles from "./ActionCard.module.css";

type ActionCardProps = {
  number: string;
  title: string;
  description: string;
  href: string;
  label: string;
  tone: "terracotta" | "sage" | "sand";
};

export function ActionCard({
  number,
  title,
  description,
  href,
  label,
  tone,
}: ActionCardProps) {
  const cardMeta = {
    terracotta: { label: "AGENDAR", symbol: "▦" },
    sage: { label: "CAMBIAR", symbol: "✎" },
    sand: { label: "LIBERAR", symbol: "×" },
  }[tone];

  return (
    <article className={styles.card}>
      <div className={styles.topline}>
        <span>{number} / {cardMeta.label}</span>
        <span className={styles.symbol} aria-hidden="true">{cardMeta.symbol}</span>
      </div>
      <div className={styles.content}>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <a className={styles.link} href={href} aria-label={label}>
        <span className={styles.arrow} aria-hidden="true">→</span>
      </a>
    </article>
  );
}