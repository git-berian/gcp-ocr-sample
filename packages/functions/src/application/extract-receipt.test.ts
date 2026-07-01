import { describe, it, expect, vi } from "vitest";
import { extractReceipt } from "./extract-receipt.js";
import type { ReceiptExtractor, ReceiptExtraction } from "./extract-receipt.js";
import { MimeType } from "../domain/mime-type.js";

describe("extractReceipt", () => {
  const mockReceipt: ReceiptExtraction = {
    supplierName: "テスト商店",
    receiptDate: "2026-05-16",
    totalAmount: 4800,
    taxAmount: 436,
    lineItems: [{ description: "コーヒー", amount: 500 }],
    transcription: "領収書",
  };

  function createMockExtractor(): ReceiptExtractor {
    return { extract: vi.fn().mockResolvedValue(mockReceipt) };
  }

  it("mimeType.value を渡して extract を呼び、結果を返す", async () => {
    const extractor = createMockExtractor();
    const result = await extractReceipt(
      { content: "base64content", mimeType: MimeType.from("image/jpeg") },
      extractor,
    );

    expect(extractor.extract).toHaveBeenCalledWith({
      content: "base64content",
      mimeType: "image/jpeg",
    });
    expect(result).toEqual(mockReceipt);
  });
});
