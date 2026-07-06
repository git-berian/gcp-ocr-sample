import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { AppView } from "./App";
import type { FileJob, ReceiptExtraction } from "./api/types";

function makeReceipt(overrides: Partial<ReceiptExtraction> = {}): ReceiptExtraction {
  return {
    supplierName: "Acme Corp",
    receiptDate: "2026-05-16",
    totalAmount: 1234,
    taxAmount: 112,
    registrationNumber: "T1234567890123",
    transcription: "領収書 Acme Corp ¥1,234",
    meta: { source: "gemini" },
    ...overrides,
  };
}

function createJob(overrides: Partial<FileJob> = {}): FileJob {
  return {
    id: crypto.randomUUID(),
    file: new File([""], "dummy.png", { type: "image/png" }),
    fileName: "dummy.png",
    engine: "document-ai",
    status: "success",
    result: { receipt: makeReceipt() },
    error: "",
    ...overrides,
  };
}

const meta = {
  component: AppView,
  args: {
    onSubmit: fn(),
    onRetry: fn(),
  },
} satisfies Meta<typeof AppView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initial: Story = {
  args: {
    jobs: [],
    isProcessing: false,
  },
};

export const WithError: Story = {
  args: {
    jobs: [
      createJob({
        fileName: "receipt.png",
        status: "error",
        result: null,
        error: "ドキュメントの解析に失敗しました。ファイル形式を確認してもう一度お試しください。",
      }),
    ],
    isProcessing: false,
  },
};

export const WithResults: Story = {
  args: {
    jobs: [
      createJob({
        fileName: "receipt-1.png",
        result: { receipt: makeReceipt({ supplierName: "Acme Corp", totalAmount: 1234 }) },
      }),
      createJob({
        fileName: "receipt-2.pdf",
        result: {
          receipt: makeReceipt({
            supplierName: "Beta Store",
            totalAmount: 5678,
            registrationNumber: null,
          }),
        },
      }),
    ],
    isProcessing: false,
  },
};

export const MixedStatus: Story = {
  args: {
    jobs: [
      createJob({ fileName: "success.png", status: "success" }),
      createJob({ fileName: "processing.png", status: "processing", result: null }),
      createJob({ fileName: "error.png", status: "error", result: null, error: "API エラー" }),
      createJob({ fileName: "pending.png", status: "pending", result: null }),
    ],
    isProcessing: true,
  },
};
