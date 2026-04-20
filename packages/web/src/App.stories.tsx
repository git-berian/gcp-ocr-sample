import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { AppView } from "./App";
import type { FileJob } from "./api/types";

function createJob(overrides: Partial<FileJob> = {}): FileJob {
  return {
    id: crypto.randomUUID(),
    file: new File([""], "dummy.png", { type: "image/png" }),
    fileName: "dummy.png",
    status: "success",
    result: { entities: [] },
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
        result: {
          entities: [
            {
              type: "total_amount",
              mentionText: "¥1,234",
              confidence: 0.95,
              normalizedValue: { text: "1234" },
            },
            {
              type: "supplier_name",
              mentionText: "Acme Corp",
              confidence: 0.88,
              normalizedValue: { text: "Acme Corp" },
            },
            {
              type: "invoice_date",
              mentionText: "2024-01-15",
              confidence: 0.92,
              normalizedValue: { text: "2024-01-15" },
            },
          ],
        },
      }),
      createJob({
        fileName: "receipt-2.pdf",
        result: {
          entities: [
            {
              type: "total_amount",
              mentionText: "¥5,678",
              confidence: 0.91,
              normalizedValue: { text: "5678" },
            },
          ],
        },
      }),
    ],
    isProcessing: false,
  },
};

export const MixedStatus: Story = {
  args: {
    jobs: [
      createJob({ fileName: "success.png", status: "success", result: { entities: [] } }),
      createJob({ fileName: "processing.png", status: "processing", result: null }),
      createJob({ fileName: "error.png", status: "error", result: null, error: "API エラー" }),
      createJob({ fileName: "pending.png", status: "pending", result: null }),
    ],
    isProcessing: true,
  },
};
