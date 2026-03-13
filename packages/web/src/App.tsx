import { useParseDocument } from "./hooks/useParseDocument";
import { FileUploader } from "./components/FileUploader";
import { ResultTable } from "./components/ResultTable";
import { ErrorMessage } from "./components/ErrorMessage";
import "./App.css";

export function App() {
  const { result, error, isLoading, submit } = useParseDocument();

  return (
    <div>
      <h1>DocAI Expense Parser</h1>
      <FileUploader onSubmit={submit} disabled={isLoading} />
      {isLoading && <p>Parsing...</p>}
      {error && <ErrorMessage message={error} />}
      {result && <ResultTable entities={result.entities} />}
    </div>
  );
}
