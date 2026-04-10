import { describe, it, expect, vi, afterEach } from "vitest";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import { createDocumentProcessor } from "./document-ai-client.js";

vi.mock("@google-cloud/documentai");

function setupMockClient(mockProcessDocument: ReturnType<typeof vi.fn>) {
  vi.mocked(DocumentProcessorServiceClient).mockImplementation(function () {
    return { processDocument: mockProcessDocument } as unknown as DocumentProcessorServiceClient;
  } as unknown as ConstructorParameters<typeof DocumentProcessorServiceClient>[0] &
    (() => DocumentProcessorServiceClient));
}

const defaultProcessParams = {
  name: "projects/p/locations/us/processors/x",
  content: "base64content",
  mimeType: "application/pdf",
};

describe("createDocumentProcessor", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Document AIにリクエストを送信しentitiesを返す", async () => {
    const mockEntities = [{ type: "total_amount", mentionText: "1,234", confidence: 0.95 }];
    const mockProcessDocument = vi
      .fn()
      .mockResolvedValue([{ document: { entities: mockEntities } }]);
    setupMockClient(mockProcessDocument);

    const processor = createDocumentProcessor("us");
    const result = await processor.process(defaultProcessParams);

    expect(mockProcessDocument).toHaveBeenCalledWith({
      name: "projects/p/locations/us/processors/x",
      rawDocument: { content: "base64content", mimeType: "application/pdf" },
    });
    expect(result).toEqual(mockEntities);
  });

  it("documentがnullの場合、空配列を返す", async () => {
    const mockProcessDocument = vi.fn().mockResolvedValue([{ document: null }]);
    setupMockClient(mockProcessDocument);

    const processor = createDocumentProcessor("us");
    const result = await processor.process(defaultProcessParams);

    expect(result).toEqual([]);
  });

  it("entitiesがundefinedの場合、空配列を返す", async () => {
    const mockProcessDocument = vi.fn().mockResolvedValue([{ document: { entities: undefined } }]);
    setupMockClient(mockProcessDocument);

    const processor = createDocumentProcessor("us");
    const result = await processor.process(defaultProcessParams);

    expect(result).toEqual([]);
  });

  it("processDocumentが失敗した場合、エラーが呼び出し元に伝播する", async () => {
    const mockProcessDocument = vi.fn().mockRejectedValue(new Error("Document AI API error"));
    setupMockClient(mockProcessDocument);

    const processor = createDocumentProcessor("us");

    await expect(processor.process(defaultProcessParams)).rejects.toThrow("Document AI API error");
  });
});
