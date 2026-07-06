import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCallable, mockHttpsCallable } = vi.hoisted(() => {
  const mockCallable = vi.fn();
  return {
    mockCallable,
    // httpsCallable(functions, name) → callable。呼び出し名を検証できるようにする。
    mockHttpsCallable: vi.fn(() => mockCallable),
  };
});

vi.mock("firebase/functions", () => ({
  httpsCallable: mockHttpsCallable,
}));

vi.mock("./firebase", () => ({
  functions: {},
}));

const REQUEST = { content: "base64data", mimeType: "image/png" };

const RESPONSE = {
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

// callable はモジュール内でエンジンごとにキャッシュされるため、
// テスト間の相互干渉を避けるべくモジュールを都度リセットして import する。
async function importParseDocument() {
  vi.resetModules();
  return (await import("./parse-document")).parseDocument;
}

describe("parseDocument", () => {
  beforeEach(() => {
    mockCallable.mockReset();
    mockHttpsCallable.mockClear();
  });

  it("エンジン未指定なら Document AI の callable を呼ぶ", async () => {
    mockCallable.mockResolvedValue({ data: RESPONSE });
    const parseDocument = await importParseDocument();

    const result = await parseDocument(REQUEST);

    expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), "parseDocumentCall");
    expect(mockCallable).toHaveBeenCalledWith(REQUEST);
    expect(result).toEqual(RESPONSE);
  });

  it.each([
    ["document-ai", "parseDocumentCall"],
    ["gemini", "parseDocumentGeminiCall"],
    ["claude", "parseDocumentClaudeCall"],
  ] as const)("engine=%s のとき %s を呼ぶ", async (engine, callableName) => {
    mockCallable.mockResolvedValue({ data: RESPONSE });
    const parseDocument = await importParseDocument();

    const result = await parseDocument(REQUEST, engine);

    expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), callableName);
    expect(mockCallable).toHaveBeenCalledWith(REQUEST);
    expect(result).toEqual(RESPONSE);
  });

  it("同一エンジンの callable は初回のみ生成しキャッシュする", async () => {
    mockCallable.mockResolvedValue({ data: RESPONSE });
    const parseDocument = await importParseDocument();

    await parseDocument(REQUEST, "gemini");
    await parseDocument(REQUEST, "gemini");

    expect(mockHttpsCallable).toHaveBeenCalledTimes(1);
    expect(mockCallable).toHaveBeenCalledTimes(2);
  });

  it("エラー時に例外を投げる", async () => {
    mockCallable.mockRejectedValue(new Error("functions/internal"));
    const parseDocument = await importParseDocument();

    await expect(parseDocument(REQUEST, "gemini")).rejects.toThrow("functions/internal");
  });
});
