// 抽出エンジンの種別と、Cloud Functions callable 名・表示ラベルの対応。
// エンジンは「呼び出す callable 名」で決まる（リクエスト本文には含めない）。

export type Engine = "document-ai" | "gemini" | "claude";

export const DEFAULT_ENGINE: Engine = "document-ai";

interface EngineDefinition {
  /** UI に表示するラベル */
  label: string;
  /** 呼び出す Cloud Functions callable 名 */
  callableName: string;
}

export const ENGINES: Record<Engine, EngineDefinition> = {
  "document-ai": { label: "Document AI", callableName: "parseDocumentCall" },
  gemini: { label: "Gemini", callableName: "parseDocumentGeminiCall" },
  claude: { label: "Claude", callableName: "parseDocumentClaudeCall" },
};

/** UI で列挙する順序（既定を先頭に） */
export const ENGINE_ORDER: Engine[] = ["document-ai", "gemini", "claude"];
