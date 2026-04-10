import { useState, useCallback } from "react";
import { parseDocument } from "../api/parse-document";
import { fileToBase64, isValidMimeType, SUPPORTED_MIME_TYPES } from "../utils/file";
import type { ParseDocumentResponse } from "../api/types";

interface UseParseDocumentReturn {
  result: ParseDocumentResponse | null;
  error: string;
  isLoading: boolean;
  submit: (file: File) => Promise<void>;
}

export function useParseDocument(): UseParseDocumentReturn {
  const [result, setResult] = useState<ParseDocumentResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const submit = useCallback(async (file: File) => {
    if (!isValidMimeType(file.type)) {
      setResult(null);
      setError(
        `サポートされていないファイル形式: ${file.type}。対応形式: ${SUPPORTED_MIME_TYPES.join(", ")}`,
      );
      return;
    }

    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      let content: string;
      try {
        content = await fileToBase64(file);
      } catch {
        setError("ファイルの読み込みに失敗しました");
        return;
      }

      const response = await parseDocument({ content, mimeType: file.type });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "予期しないエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { result, error, isLoading, submit };
}
