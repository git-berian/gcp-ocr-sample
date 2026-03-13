import { useParseDocument } from "./hooks/useParseDocument";
import { FileUploader } from "./components/FileUploader";
import { ResultTable } from "./components/ResultTable";
import { ErrorMessage } from "./components/ErrorMessage";
import type { ParseDocumentResponse } from "./api/types";
import "./App.css";

export interface AppViewProps {
  result: ParseDocumentResponse | null;
  error: string;
  isLoading: boolean;
  onSubmit: (file: File) => void;
}

export function AppView({ result, error, isLoading, onSubmit }: AppViewProps) {
  return (
    <div>
      <h1>DocAI Expense Parser</h1>
      <FileUploader onSubmit={onSubmit} disabled={isLoading} />
      {isLoading && <p>Parsing...</p>}
      {error && <ErrorMessage message={error} />}
      {result && <ResultTable entities={result.entities} />}
    </div>
  );
}

export function App() {
  const { result, error, isLoading, submit } = useParseDocument();

  return <AppView result={result} error={error} isLoading={isLoading} onSubmit={submit} />;
}
