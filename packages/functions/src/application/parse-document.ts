export interface DocumentProcessor {
  process(params: { name: string; content: string; mimeType: string }): Promise<DocumentEntity[]>;
}

export interface DocumentEntity {
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
  mimeType: string;
}

export async function parseDocument(
  params: ParseDocumentParams,
  processor: DocumentProcessor,
): Promise<DocumentEntity[]> {
  const name = `projects/${params.projectId}/locations/${params.location}/processors/${params.processorId}`;

  return processor.process({
    name,
    content: params.content,
    mimeType: params.mimeType,
  });
}
