// 抽出エンジンの種別と、Functions エンドポイント名・表示ラベルの対応。
// エンジンは「呼び出すエンドポイント」で決まる（リクエスト本文には含めない）。

export type Engine = "document-ai" | "gemini" | "claude";

export const DEFAULT_ENGINE: Engine = "document-ai";

interface EngineDefinition {
  /** UI に表示するラベル */
  label: string;
  /** 呼び出す Functions のエンドポイント名（onRequest。`packages/functions/src/index.ts`） */
  endpoint: string;
}

export const ENGINES: Record<Engine, EngineDefinition> = {
  "document-ai": { label: "Document AI", endpoint: "parseDocumentHttp" },
  gemini: { label: "Gemini", endpoint: "parseDocumentGeminiHttp" },
  claude: { label: "Claude", endpoint: "parseDocumentClaudeHttp" },
};

/** UI で列挙する順序（既定を先頭に） */
export const ENGINE_ORDER: Engine[] = ["document-ai", "gemini", "claude"];
