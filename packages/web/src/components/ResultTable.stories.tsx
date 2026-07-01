import type { Meta, StoryObj } from "@storybook/react";
import { ResultTable } from "./ResultTable";

const meta = {
  component: ResultTable,
} satisfies Meta<typeof ResultTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    receipt: null,
  },
};

export const WithReceipt: Story = {
  args: {
    receipt: {
      supplierName: "Acme Corp",
      receiptDate: "2026-05-16",
      totalAmount: 1234,
      taxAmount: 112,
      registrationNumber: "T1234567890123",
      transcription: "領収書 Acme Corp ¥1,234 T1234567890123",
      meta: { source: "gemini" },
    },
  },
};

export const WithoutRegistration: Story = {
  args: {
    receipt: {
      supplierName: "個人商店",
      receiptDate: "2026-03-20",
      totalAmount: 500,
      taxAmount: null,
      registrationNumber: null,
      transcription: "領収書 500円",
      meta: { source: "document-ai" },
    },
  },
};
