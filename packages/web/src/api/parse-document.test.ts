import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseDocument } from "./parse-document";

const { mockCallable } = vi.hoisted(() => ({
  mockCallable: vi.fn(),
}));

vi.mock("firebase/functions", () => ({
  httpsCallable: () => mockCallable,
}));

vi.mock("./firebase", () => ({
  functions: {},
}));

describe("parseDocument", () => {
  beforeEach(() => {
    mockCallable.mockReset();
  });

  it("httpsCallable で parseDocumentCall を呼び出し、結果を返す", async () => {
    const mockResponse = {
      receipt: {
        supplierName: "テスト商店",
        receiptDate: "2026-05-16",
        totalAmount: 4800,
        taxAmount: 436,
        registrationNumber: "T1234567890123",
        transcription: "書き起こし",
        meta: { source: "gemini" },
      },
    };
    mockCallable.mockResolvedValue({ data: mockResponse });

    const result = await parseDocument({
      content: "base64data",
      mimeType: "image/png",
    });

    expect(mockCallable).toHaveBeenCalledWith({
      content: "base64data",
      mimeType: "image/png",
    });
    expect(result).toEqual(mockResponse);
  });

  it("エラー時に例外を投げる", async () => {
    mockCallable.mockRejectedValue(new Error("functions/internal"));

    await expect(parseDocument({ content: "base64data", mimeType: "image/png" })).rejects.toThrow(
      "functions/internal",
    );
  });
});
