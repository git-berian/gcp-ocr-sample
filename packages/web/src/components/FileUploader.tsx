import { useState, useCallback, type FormEvent, type DragEvent } from "react";
import { SUPPORTED_MIME_TYPES } from "../utils/file";

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

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <form onSubmit={handleSubmit}>
      <div
        data-testid="drop-zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: `2px dashed ${isDragging ? "#0066cc" : "#ccc"}`,
          padding: "24px",
          textAlign: "center",
        }}
      >
        <label>
          File
          <input
            type="file"
            accept={SUPPORTED_MIME_TYPES.join(",")}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {file && <p>Selected: {file.name}</p>}
      </div>
      <button type="submit" disabled={disabled || !file}>
        Parse
      </button>
    </form>
  );
}
