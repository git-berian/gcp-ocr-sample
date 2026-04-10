import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HttpsError } from "firebase-functions/v2/https";
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

  it("バリデーションエラーで invalid-argument の HttpsError を投げる", async () => {
    const request = createMockRequest({ data: {} });

    await expect(handleParseDocumentCall(request)).rejects.toSatisfy((error: HttpsError) => {
      expect(error).toBeInstanceOf(HttpsError);
      expect(error.code).toBe("invalid-argument");
      expect(error.message).toBe("content は必須で、空でない文字列（base64）である必要があります");
      return true;
    });
  });

  it("Document AI処理エラーで internal の HttpsError を投げる", async () => {
    mockProcess.mockRejectedValue(new Error("API error"));

    await expect(handleParseDocumentCall(createMockRequest())).rejects.toSatisfy(
      (error: HttpsError) => {
        expect(error).toBeInstanceOf(HttpsError);
        expect(error.code).toBe("internal");
        expect(error.message).toBe("内部サーバーエラー");
        return true;
      },
    );
  });

  it("Error以外の例外でも internal の HttpsError を投げる", async () => {
    mockProcess.mockRejectedValue("string error");

    await expect(handleParseDocumentCall(createMockRequest())).rejects.toSatisfy(
      (error: HttpsError) => {
        expect(error).toBeInstanceOf(HttpsError);
        expect(error.code).toBe("internal");
        expect(error.message).toBe("内部サーバーエラー");
        return true;
      },
    );
  });
});
