import { useParseDocument } from "./hooks/useParseDocument";
import { FileUploader } from "./components/FileUploader";
import { ResultTable } from "./components/ResultTable";
import { ErrorMessage } from "./components/ErrorMessage";
import { PasswordGate } from "./components/PasswordGate";
import type { ParseDocumentResponse } from "./api/types";
import "./App.css";
import styles from "./App.module.css";

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD ?? "";

export interface AppViewProps {
  result: ParseDocumentResponse | null;
  error: string;
  isLoading: boolean;
  onSubmit: (file: File) => void;
}

export function AppView({ result, error, isLoading, onSubmit }: AppViewProps) {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>DocAI 経費パーサー</h1>
      <FileUploader onSubmit={onSubmit} disabled={isLoading} />
      {isLoading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>解析中...</p>
        </div>
      )}
      {error && <ErrorMessage message={error} />}
      {result && <ResultTable entities={result.entities} />}
      {result && (
        <details className={styles.rawResponse}>
          <summary>生データ</summary>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}

export function App() {
  const { result, error, isLoading, submit } = useParseDocument();

  const appView = <AppView result={result} error={error} isLoading={isLoading} onSubmit={submit} />;

  if (!APP_PASSWORD) {
    return appView;
  }

  return <PasswordGate password={APP_PASSWORD}>{appView}</PasswordGate>;
}
