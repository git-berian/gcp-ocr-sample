import type { ReceiptExtraction } from "../../../src/api/types";

export const MOCK_RECEIPT: ReceiptExtraction = {
  supplierName: "テスト商店",
  receiptDate: "2026-05-16",
  totalAmount: 4800,
  taxAmount: 436,
  registrationNumber: "T1234567890123",
  transcription: "領収書 テスト商店 ¥4,800 T1234567890123",
  meta: { source: "gemini" },
};

export const MOCK_API_RESPONSE = { receipt: MOCK_RECEIPT };

export function createTestFile(
  name: string = "receipt.pdf",
  type: string = "application/pdf",
  content: string = "dummy-content",
): File {
  return new File([content], name, { type });
}
