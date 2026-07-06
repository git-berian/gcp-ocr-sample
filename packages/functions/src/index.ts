import { onCall, onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { handleParseDocumentCall } from "./handlers/parse-document-call.js";
import { handleParseDocument } from "./handlers/parse-document.js";
import { handleParseDocumentGeminiCall } from "./handlers/parse-document-gemini-call.js";
import { handleParseDocumentGemini } from "./handlers/parse-document-gemini.js";
import { handleParseDocumentClaudeCall } from "./handlers/parse-document-claude-call.js";
import { handleParseDocumentClaude } from "./handlers/parse-document-claude.js";

const functionsApiKey = defineSecret("FUNCTIONS_API_KEY");
// Claude 直接 API 経路（CLAUDE_TRANSPORT=api）用。vertex 経路では未使用（ADR-0013）。
const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");

/** Hosting（Web）用 — onCall */
export const parseDocumentCall = onCall({ region: "asia-northeast1" }, handleParseDocumentCall);

/** 外部サービス用 — onRequest + API キー認証 */
export const parseDocumentHttp = onRequest(
  { region: "asia-northeast1", secrets: [functionsApiKey] },
  handleParseDocument,
);

/** Hosting（Web）用 — Gemini onCall（ADC 認証） */
export const parseDocumentGeminiCall = onCall(
  { region: "asia-northeast1" },
  handleParseDocumentGeminiCall,
);

/** 外部サービス用 — Gemini onRequest + API キー認証 */
export const parseDocumentGeminiHttp = onRequest(
  { region: "asia-northeast1", secrets: [functionsApiKey] },
  handleParseDocumentGemini,
);

/** Hosting（Web）用 — Claude onCall（api 経路は ANTHROPIC_API_KEY、vertex 経路は ADC） */
export const parseDocumentClaudeCall = onCall(
  { region: "asia-northeast1", secrets: [anthropicApiKey] },
  handleParseDocumentClaudeCall,
);

/** 外部サービス用 — Claude onRequest + 呼び出し側 API キー認証（+ api 経路は ANTHROPIC_API_KEY） */
export const parseDocumentClaudeHttp = onRequest(
  { region: "asia-northeast1", secrets: [functionsApiKey, anthropicApiKey] },
  handleParseDocumentClaude,
);
