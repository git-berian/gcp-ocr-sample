import type { Meta, StoryObj } from "@storybook/react";
import { ResultTable } from "./ResultTable";

const meta = {
  component: ResultTable,
} satisfies Meta<typeof ResultTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    entities: [],
  },
};

export const WithEntities: Story = {
  args: {
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
};

export const SingleEntity: Story = {
  args: {
    entities: [
      {
        type: "total_amount",
        mentionText: "¥500",
        confidence: 0.99,
        normalizedValue: { text: "500" },
      },
    ],
  },
};
