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

export interface ApiError {
  error: string;
}
