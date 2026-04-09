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
      entities: [{ type: "total", mentionText: "1000", confidence: 0.95 }],
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
