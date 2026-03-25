import { useState, useCallback, type FormEvent, type DragEvent } from "react";
import { SUPPORTED_MIME_TYPES, isValidMimeType } from "../utils/file";
import styles from "./FileUploader.module.css";

interface FileUploaderProps {
  onSubmit: (file: File) => void;
  disabled: boolean;
}

export function FileUploader({ onSubmit, disabled }: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (file) {
      onSubmit(file);
    }
  };

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile && isValidMimeType(droppedFile.type)) {
        setFile(droppedFile);
      }
    },
    [disabled],
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
            onChange={(e) => {
              const selected = e.target.files?.[0] ?? null;
              setFile(selected && isValidMimeType(selected.type) ? selected : null);
            }}
          />
        </label>
        {file && <p className={styles.selectedFile}>選択済み: {file.name}</p>}
      </div>
      <button type="submit" className={styles.submitButton} disabled={disabled || !file}>
        解析
      </button>
    </form>
  );
}
