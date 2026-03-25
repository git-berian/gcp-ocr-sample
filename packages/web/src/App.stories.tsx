import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { AppView } from "./App";

const meta = {
  component: AppView,
  args: {
    onSubmit: fn(),
  },
} satisfies Meta<typeof AppView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initial: Story = {
  args: {
    result: null,
    error: "",
    isLoading: false,
  },
};

export const WithError: Story = {
  args: {
    result: null,
    error: "ドキュメントの解析に失敗しました。ファイル形式を確認してもう一度お試しください。",
    isLoading: false,
  },
};

export const WithResults: Story = {
  args: {
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
    error: "",
    isLoading: false,
  },
};
