import type { MimeType } from "../domain/mime-type.js";

export interface DocumentProcessor {
  process(params: { name: string; content: string; mimeType: string }): Promise<ExtractedField[]>;
}

export interface ExtractedField {
  type?: string | null;
  mentionText?: string | null;
  confidence?: number | null;
  [key: string]: unknown;
}

export interface ParseDocumentParams {
  projectId: string;
  location: string;
  processorId: string;
  content: string;
  mimeType: MimeType;
}

export async function parseDocument(
  params: ParseDocumentParams,
  processor: DocumentProcessor,
): Promise<ExtractedField[]> {
  const name = `projects/${params.projectId}/locations/${params.location}/processors/${params.processorId}`;

  return processor.process({
    name,
    content: params.content,
    mimeType: params.mimeType.value,
  });
}
