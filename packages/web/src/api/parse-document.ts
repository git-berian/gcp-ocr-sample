import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import type { ParseDocumentRequest, ParseDocumentResponse } from "./types";

const callable = httpsCallable<ParseDocumentRequest, ParseDocumentResponse>(
  functions,
  "parseDocumentCall",
);

export async function parseDocument(request: ParseDocumentRequest): Promise<ParseDocumentResponse> {
  const result = await callable(request);
  return result.data;
}
