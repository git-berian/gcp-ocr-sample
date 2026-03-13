export interface ParseDocumentRequest {
  content: string;
  mimeType: string;
}

export interface Entity {
  type: string;
  mentionText: string;
  confidence: number;
  normalizedValue?: string;
}

export interface ParseDocumentResponse {
  entities: Entity[];
}

export interface ApiError {
  error: string;
}
