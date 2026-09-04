import { useParseDocuments } from "./hooks/useParseDocuments";
import { FileUploader } from "./components/FileUploader";
import { ResultTabs } from "./components/ResultTabs";
import type { FileJob } from "./api/types";
import type { Engine } from "./api/engines";
import "./App.css";
import styles from "./App.module.css";

export interface AppViewProps {
  jobs: FileJob[];
  isProcessing: boolean;
  onSubmit: (files: File[], engine: Engine) => void;
  onRetry: (jobId: string) => void;
}

export function AppView({ jobs, isProcessing, onSubmit, onRetry }: AppViewProps) {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>経費パーサー</h1>
      <FileUploader onSubmit={onSubmit} disabled={isProcessing} />
      {jobs.length > 0 && <ResultTabs jobs={jobs} onRetry={onRetry} />}
    </div>
  );
}

export function App() {
  const { jobs, isProcessing, submitAll, retry } = useParseDocuments();

  return <AppView jobs={jobs} isProcessing={isProcessing} onSubmit={submitAll} onRetry={retry} />;
}
