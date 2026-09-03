import type { Meta, StoryObj } from "@storybook/react";
import { FilePreviewTile } from "./FilePreviewTile";
import { RECEIPT_PNG_BASE64, base64ToFile } from "./__fixtures__/sample-image";

const meta = {
  component: FilePreviewTile,
  decorators: [
    (Story) => (
      <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 160 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FilePreviewTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Image: Story = {
  args: {
    file: base64ToFile(RECEIPT_PNG_BASE64, "receipt.png", "image/png"),
  },
};

export const Pdf: Story = {
  args: {
    file: new File(["dummy"], "invoice.pdf", { type: "application/pdf" }),
  },
};

export const LongFileName: Story = {
  args: {
    file: base64ToFile(
      RECEIPT_PNG_BASE64,
      "very-long-receipt-file-name-that-should-be-truncated.png",
      "image/png",
    ),
  },
};
