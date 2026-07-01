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

const mockExtract = vi.fn();
vi.mock("../infrastructure/document-ai-client.js", () => ({
  createDocumentAiReceiptExtractor: () => ({ extract: mockExtract }),
}));

const mockReceipt = {
  supplierName: "テスト商店",
  receiptDate: "2026-05-16",
  totalAmount: 4800,
  taxAmount: 436,
  registrationNumber: "T1234567890123",
  transcription: "領収書",
  meta: { source: "document-ai" as const },
};

function createMockRequest(overrides: Partial<{ data: unknown; auth: unknown }> = {}) {
  return {
    data: { content: "base64data", mimeType: "application/pdf" },
    ...overrides,
  } as Parameters<typeof handleParseDocumentCall>[0];
}

describe("handleParseDocumentCall", () => {
  beforeEach(() => {
    mockExtract.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("正常なリクエストで receipt を返す", async () => {
    mockExtract.mockResolvedValue(mockReceipt);

    const result = await handleParseDocumentCall(createMockRequest());

    expect(result).toEqual({ receipt: mockReceipt });
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

  it("抽出エラーで internal の HttpsError を投げる", async () => {
    mockExtract.mockRejectedValue(new Error("API error"));

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
    mockExtract.mockRejectedValue("string error");

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
