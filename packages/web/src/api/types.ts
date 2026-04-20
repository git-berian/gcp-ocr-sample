export interface ParseDocumentRequest {
  content: string;
  mimeType: string;
}

export interface Entity {
  type: string;
  mentionText: string;
  confidence: number;
  normalizedValue?: { text?: string; [key: string]: unknown };
}

export interface ParseDocumentResponse {
  entities: Entity[];
}

export type FileJobStatus = "pending" | "processing" | "success" | "error";

export interface FileJob {
  id: string;
  file: File;
  fileName: string;
  status: FileJobStatus;
  result: ParseDocumentResponse | null;
  error: string;
}
