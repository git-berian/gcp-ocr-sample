import type { MimeType } from "../domain/mime-type.js";

export interface ReceiptExtraction {
  supplierName: string | null;
  receiptDate: string | null; // YYYY-MM-DD（支払日）
  totalAmount: number | null;
  taxAmount: number | null;
  registrationNumber: string | null; // インボイス登録番号（T+13桁）。無ければ null
  transcription: string;
  meta?: ReceiptMeta;
}

export interface ReceiptMeta {
  source: "document-ai" | "gemini";
  confidence?: Record<string, number>;
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
