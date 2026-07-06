import type { Engine } from "./engines";

export interface ParseDocumentRequest {
  content: string;
  mimeType: string;
}

export interface ReceiptMeta {
  source: Engine;
  confidence?: Record<string, number>;
}

export interface ReceiptExtraction {
  supplierName: string | null;
  receiptDate: string | null; // YYYY-MM-DD（支払日）
  totalAmount: number | null;
  taxAmount: number | null;
  registrationNumber: string | null; // インボイス登録番号。無ければ null
  transcription: string;
  meta?: ReceiptMeta;
}

export interface ParseDocumentResponse {
  receipt: ReceiptExtraction;
}

export type FileJobStatus = "pending" | "processing" | "success" | "error";

export interface FileJob {
  id: string;
  file: File;
  fileName: string;
  engine: Engine;
  status: FileJobStatus;
  result: ParseDocumentResponse | null;
  error: string;
}
