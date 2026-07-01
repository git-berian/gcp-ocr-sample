import type { MimeType } from "../domain/mime-type.js";

export interface ReceiptLineItem {
  description: string;
  amount: number | null;
}

export interface ReceiptExtraction {
  supplierName: string | null;
  receiptDate: string | null; // YYYY-MM-DD
  totalAmount: number | null;
  taxAmount: number | null;
  lineItems: ReceiptLineItem[];
  transcription: string;
}

export interface ReceiptExtractor {
  extract(params: { content: string; mimeType: string }): Promise<ReceiptExtraction>;
}

export interface ExtractReceiptParams {
  content: string;
  mimeType: MimeType;
}

export async function extractReceipt(
  params: ExtractReceiptParams,
  extractor: ReceiptExtractor,
): Promise<ReceiptExtraction> {
  return extractor.extract({
    content: params.content,
    mimeType: params.mimeType.value,
  });
}
