import { describe, it, expect, vi, afterEach } from "vitest";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import { createDocumentProcessor } from "./document-ai-client.js";

vi.mock("@google-cloud/documentai");

describe("createDocumentProcessor", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Document AIにリクエストを送信しentitiesを返す", async () => {
    const mockEntities = [{ type: "total_amount", mentionText: "1,234", confidence: 0.95 }];
    const mockProcessDocument = vi
      .fn()
      .mockResolvedValue([{ document: { entities: mockEntities } }]);

    vi.mocked(DocumentProcessorServiceClient).mockImplementation(function () {
      return { processDocument: mockProcessDocument } as unknown as DocumentProcessorServiceClient;
    } as unknown as ConstructorParameters<typeof DocumentProcessorServiceClient>[0] &
      (() => DocumentProcessorServiceClient));

    const processor = createDocumentProcessor("us");
    const result = await processor.process({
      name: "projects/p/locations/us/processors/x",
      content: "base64content",
      mimeType: "application/pdf",
    });

    expect(mockProcessDocument).toHaveBeenCalledWith({
      name: "projects/p/locations/us/processors/x",
      rawDocument: { content: "base64content", mimeType: "application/pdf" },
    });
    expect(result).toEqual(mockEntities);
  });

  it("documentがnullの場合、空配列を返す", async () => {
    const mockProcessDocument = vi.fn().mockResolvedValue([{ document: null }]);

    vi.mocked(DocumentProcessorServiceClient).mockImplementation(function () {
      return { processDocument: mockProcessDocument } as unknown as DocumentProcessorServiceClient;
    } as unknown as ConstructorParameters<typeof DocumentProcessorServiceClient>[0] &
      (() => DocumentProcessorServiceClient));

    const processor = createDocumentProcessor("us");
    const result = await processor.process({
      name: "projects/p/locations/us/processors/x",
      content: "base64content",
      mimeType: "application/pdf",
    });

    expect(result).toEqual([]);
  });

  it("entitiesがundefinedの場合、空配列を返す", async () => {
    const mockProcessDocument = vi.fn().mockResolvedValue([{ document: { entities: undefined } }]);

    vi.mocked(DocumentProcessorServiceClient).mockImplementation(function () {
      return { processDocument: mockProcessDocument } as unknown as DocumentProcessorServiceClient;
    } as unknown as ConstructorParameters<typeof DocumentProcessorServiceClient>[0] &
      (() => DocumentProcessorServiceClient));

    const processor = createDocumentProcessor("us");
    const result = await processor.process({
      name: "projects/p/locations/us/processors/x",
      content: "base64content",
      mimeType: "application/pdf",
    });

    expect(result).toEqual([]);
  });
});
