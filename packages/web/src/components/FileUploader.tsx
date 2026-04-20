import { useState, useCallback, type FormEvent, type DragEvent } from "react";
import { SUPPORTED_MIME_TYPES, isValidMimeType } from "../utils/file";
import styles from "./FileUploader.module.css";

const MAX_FILES = 20;

interface FileUploaderProps {
  onSubmit: (files: File[]) => void;
  disabled: boolean;
}

export function FileUploader({ onSubmit, disabled }: FileUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [warning, setWarning] = useState("");

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const valid = Array.from(newFiles).filter((f) => isValidMimeType(f.type));
    setFiles((prev) => {
      const merged = [...prev, ...valid];
      if (merged.length > MAX_FILES) {
        const dropped = merged.length - MAX_FILES;
        setWarning(`上限${MAX_FILES}件を超えたため、${dropped}件が追加されませんでした`);
        return merged.slice(0, MAX_FILES);
      }
      setWarning("");
      return merged;
    });
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (files.length > 0) {
      onSubmit(files);
    }
  };

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      addFiles(e.dataTransfer.files);
    },
    [disabled, addFiles],
  );

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      setIsDragging(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClear = () => {
    setFiles([]);
    setWarning("");
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div
        data-testid="drop-zone"
        className={styles.dropZone}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: `2px dashed ${isDragging ? "var(--color-primary)" : "var(--color-border)"}`,
        }}
      >
        <label className={styles.label}>
          ファイル
          <input
            type="file"
            className={styles.fileInput}
            accept={SUPPORTED_MIME_TYPES.join(",")}
            disabled={disabled}
            multiple
            onChange={(e) => addFiles(e.target.files)}
          />
        </label>
        {files.length > 0 && (
          <div className={styles.fileList}>
            <p className={styles.fileCount}>選択済み: {files.length}件</p>
            <ul className={styles.fileNames}>
              {files.map((f, i) => (
                <li key={i}>{f.name}</li>
              ))}
            </ul>
            <button
              type="button"
              className={styles.clearButton}
              onClick={handleClear}
              disabled={disabled}
            >
              クリア
            </button>
          </div>
        )}
      </div>
      {warning && <p className={styles.warning}>{warning}</p>}
      <button
        type="submit"
        className={styles.submitButton}
        disabled={disabled || files.length === 0}
      >
        解析
      </button>
    </form>
  );
}
