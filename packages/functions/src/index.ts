import { onCall, onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { handleParseDocumentCall } from "./handlers/parse-document-call.js";
import { handleParseDocument } from "./handlers/parse-document.js";

const apiKey = defineSecret("API_KEY");

/** Hosting（Web）用 — onCall */
export const parseDocumentCall = onCall({ region: "asia-northeast1" }, handleParseDocumentCall);

/** 外部サービス用 — onRequest + API キー認証 */
export const parseDocumentHttp = onRequest(
  { region: "asia-northeast1", secrets: [apiKey] },
  handleParseDocument,
);
