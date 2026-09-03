import type { Meta, StoryObj } from "@storybook/react";
import { FilePreviewList } from "./FilePreviewList";
import { RECEIPT_PNG_BASE64, base64ToFile } from "./__fixtures__/sample-image";

const meta = {
  component: FilePreviewList,
} satisfies Meta<typeof FilePreviewList>;

export default meta;
type Story = StoryObj<typeof meta>;

const image = (name: string) => base64ToFile(RECEIPT_PNG_BASE64, name, "image/png");
const pdf = (name: string) => new File(["dummy"], name, { type: "application/pdf" });

export const Default: Story = {
  args: {
    files: [image("receipt-1.png"), image("receipt-2.png"), pdf("invoice.pdf")],
  },
};

export const SingleImage: Story = {
  args: {
    files: [image("receipt.png")],
  },
};

export const LongFileName: Story = {
  args: {
    files: [image("very-long-receipt-file-name-that-should-be-truncated.png")],
  },
};
