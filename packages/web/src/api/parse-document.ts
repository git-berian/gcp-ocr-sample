import { post } from "./client";
import type { ParseDocumentRequest, ParseDocumentResponse } from "./types";

export async function parseDocument(request: ParseDocumentRequest): Promise<ParseDocumentResponse> {
  return post<ParseDocumentRequest, ParseDocumentResponse>("/parse", request);
}
