import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { ImagePreviewDialog } from "./ImagePreviewDialog";
import { RECEIPT_PNG_DATA_URL } from "./__fixtures__/sample-image";

const meta = {
  component: ImagePreviewDialog,
  args: {
    onClose: fn(),
  },
} satisfies Meta<typeof ImagePreviewDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    src: RECEIPT_PNG_DATA_URL,
    fileName: "receipt.png",
  },
};

export const LongFileName: Story = {
  args: {
    src: RECEIPT_PNG_DATA_URL,
    fileName: "very-long-receipt-file-name-that-should-be-truncated.png",
  },
};
