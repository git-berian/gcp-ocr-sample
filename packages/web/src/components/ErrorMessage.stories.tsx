import type { Meta, StoryObj } from "@storybook/react";
import { ErrorMessage } from "./ErrorMessage";

const meta = {
  component: ErrorMessage,
} satisfies Meta<typeof ErrorMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    message: "エラーが発生しました。もう一度お試しください。",
  },
};

export const LongMessage: Story = {
  args: {
    message:
      "非常に長いエラーメッセージです。複数行にわたって折り返される場合のコンポーネントの表示を確認するためのテスト用テキストです。",
  },
};

export const Empty: Story = {
  args: {
    message: "",
  },
};
