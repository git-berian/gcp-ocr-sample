import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleParseDocumentCall } from "./parse-document-call.js";

vi.mock("../infrastructure/config.js", () => ({
  loadFunctionsConfig: () => ({
    projectId: "test-project",
    location: "us",
    processorId: "proc-123",
  }),
}));

const mockProcess = vi.fn();
vi.mock("../infrastructure/document-ai-client.js", () => ({
  createDocumentProcessor: () => ({ process: mockProcess }),
}));

function createMockRequest(overrides: Partial<{ data: unknown; auth: unknown }> = {}) {
  return {
    data: { content: "base64data", mimeType: "application/pdf" },
    ...overrides,
  } as Parameters<typeof handleParseDocumentCall>[0];
}

describe("handleParseDocumentCall", () => {
  beforeEach(() => {
    mockProcess.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("正常なリクエストでentitiesを返す", async () => {
    const mockEntities = [{ type: "total_amount", mentionText: "1,234", confidence: 0.95 }];
    mockProcess.mockResolvedValue(mockEntities);

    const result = await handleParseDocumentCall(createMockRequest());

    expect(result).toEqual({ entities: mockEntities });
  });

  it("バリデーションエラーで HttpsError を投げる", async () => {
    const request = createMockRequest({ data: {} });

    await expect(handleParseDocumentCall(request)).rejects.toThrow(
      "content は必須で、空でない文字列（base64）である必要があります",
    );
  });

  it("Document AI処理エラーで HttpsError を投げる", async () => {
    mockProcess.mockRejectedValue(new Error("API error"));

    await expect(handleParseDocumentCall(createMockRequest())).rejects.toThrow(
      "内部サーバーエラー",
    );
  });
});
