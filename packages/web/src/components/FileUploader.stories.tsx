import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { FileUploader } from "./FileUploader";

const meta = {
  component: FileUploader,
  args: {
    onSubmit: fn(),
  },
} satisfies Meta<typeof FileUploader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    disabled: false,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
