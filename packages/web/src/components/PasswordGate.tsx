import { useState, type FormEvent } from "react";
import styles from "./PasswordGate.module.css";

interface PasswordGateProps {
  password: string;
  children: React.ReactNode;
}

export function PasswordGate({ password, children }: PasswordGateProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input === password) {
      setAuthenticated(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (authenticated) {
    return <>{children}</>;
  }

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h1 className={styles.title}>パスワードを入力</h1>
        <input
          className={styles.input}
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="パスワード"
          autoFocus
        />
        {error && <p className={styles.error}>パスワードが正しくありません</p>}
        <button className={styles.button} type="submit">
          ログイン
        </button>
      </form>
    </div>
  );
}
