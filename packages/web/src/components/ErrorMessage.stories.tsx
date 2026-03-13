import type { Meta, StoryObj } from "@storybook/react";
import { ErrorMessage } from "./ErrorMessage";

const meta = {
  component: ErrorMessage,
} satisfies Meta<typeof ErrorMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    message: "Something went wrong. Please try again.",
  },
};

export const LongMessage: Story = {
  args: {
    message:
      "A very long error message that might wrap across multiple lines to test how the component handles longer text content in the error display area.",
  },
};

export const Empty: Story = {
  args: {
    message: "",
  },
};
