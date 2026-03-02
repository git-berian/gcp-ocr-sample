export interface AppConfig {
  projectId: string;
  location: string;
  processorId: string;
  fileName: string;
  mimeTypeOverride?: string;
}

export interface FileReader {
  readAsBase64(filePath: string): string;
}

export interface DocumentProcessor {
  process(params: { name: string; content: string; mimeType: string }): Promise<DocumentEntity[]>;
}

export interface DocumentEntity {
  type?: string | null;
  mentionText?: string | null;
  confidence?: number | null;
  [key: string]: unknown;
}

export async function processDocument(
  config: AppConfig,
  fileReader: FileReader,
  processor: DocumentProcessor,
  guessMimeType: (filePath: string) => string,
): Promise<DocumentEntity[]> {
  const filePath = `/app/input/${config.fileName}`;
  const mimeType = config.mimeTypeOverride ?? guessMimeType(filePath);
  const content = fileReader.readAsBase64(filePath);
  const name = `projects/${config.projectId}/locations/${config.location}/processors/${config.processorId}`;

  return processor.process({ name, content, mimeType });
}
