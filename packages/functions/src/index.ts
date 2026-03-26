import { onRequest } from "firebase-functions/v2/https";
import { handleParseDocument } from "./handlers/parse-document.js";

export const parseDocument = onRequest({ region: "asia-northeast1" }, handleParseDocument);
