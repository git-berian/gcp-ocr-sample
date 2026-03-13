import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import type { DocumentProcessor, DocumentEntity } from "../application/parse-document.js";

export function createDocumentProcessor(location: string): DocumentProcessor {
  const client = new DocumentProcessorServiceClient({
    apiEndpoint: `${location}-documentai.googleapis.com`,
  });

  return {
    async process(params: {
      name: string;
      content: string;
      mimeType: string;
    }): Promise<DocumentEntity[]> {
      const [result] = await client.processDocument({
        name: params.name,
        rawDocument: { content: params.content, mimeType: params.mimeType },
      });

      const entities = result.document?.entities ?? [];
      return entities as DocumentEntity[];
    },
  };
}
