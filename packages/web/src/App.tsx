import { useParseDocuments } from "./hooks/useParseDocuments";
import { FileUploader } from "./components/FileUploader";
import { ResultTabs } from "./components/ResultTabs";
import { PasswordGate } from "./components/PasswordGate";
import type { FileJob } from "./api/types";
import "./App.css";
import styles from "./App.module.css";

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD ?? "";

export interface AppViewProps {
  jobs: FileJob[];
  isProcessing: boolean;
  onSubmit: (files: File[]) => void;
  onRetry: (jobId: string) => void;
}

export function AppView({ jobs, isProcessing, onSubmit, onRetry }: AppViewProps) {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>DocAI 経費パーサー</h1>
      <FileUploader onSubmit={onSubmit} disabled={isProcessing} />
      {jobs.length > 0 && <ResultTabs jobs={jobs} onRetry={onRetry} />}
    </div>
  );
}

export function App() {
  const { jobs, isProcessing, submitAll, retry } = useParseDocuments();

  const appView = (
    <AppView jobs={jobs} isProcessing={isProcessing} onSubmit={submitAll} onRetry={retry} />
  );

  if (!APP_PASSWORD) {
    return appView;
  }

  return <PasswordGate password={APP_PASSWORD}>{appView}</PasswordGate>;
}
