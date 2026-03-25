import styles from "./ErrorMessage.module.css";

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <div role="alert" className={styles.alert}>
      {message}
    </div>
  );
}
