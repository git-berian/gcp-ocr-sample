import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { handleParseDocument } from "./handlers/parse-document.js";
import { handleParseDocumentGemini } from "./handlers/parse-document-gemini.js";
import { handleParseDocumentClaude } from "./handlers/parse-document-claude.js";

const functionsApiKey = defineSecret("FUNCTIONS_API_KEY");
// Claude 直接 API 経路（CLAUDE_TRANSPORT=api）用。vertex 経路では未使用（ADR-0013）。
const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");

// 入口は onRequest に一本化している（ADR-0015）。Web / 外部サービスのいずれからも
// FUNCTIONS_API_KEY による Bearer 認証で呼び出す。

/** Document AI — onRequest + API キー認証 */
export const parseDocumentHttp = onRequest(
  { region: "asia-northeast1", secrets: [functionsApiKey] },
  handleParseDocument,
);

/** Gemini — onRequest + API キー認証 */
export const parseDocumentGeminiHttp = onRequest(
  { region: "asia-northeast1", secrets: [functionsApiKey] },
  handleParseDocumentGemini,
);

/** Claude — onRequest + 呼び出し側 API キー認証（+ api 経路は ANTHROPIC_API_KEY） */
export const parseDocumentClaudeHttp = onRequest(
  { region: "asia-northeast1", secrets: [functionsApiKey, anthropicApiKey] },
  handleParseDocumentClaude,
);
