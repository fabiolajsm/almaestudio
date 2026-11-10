import styles from "./Loading.module.css";

type LoadingProps = {
  label: string;
  inline?: boolean;
  className?: string;
};

export default function Loading({
  label,
  inline = false,
  className,
}: LoadingProps) {
  return (
    <span
      className={[
        styles.indicator,
        inline ? styles.inline : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
    >
      <span className={styles.spinner} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
