import type { HttpFunction } from "@google-cloud/functions-framework";
import { validateParseDocumentRequest } from "../infrastructure/request-validator.js";
import { loadFunctionsConfig } from "../infrastructure/config.js";
import { createDocumentProcessor } from "../infrastructure/document-ai-client.js";
import { parseDocument } from "../application/parse-document.js";

export const handleParseDocument: HttpFunction = async (req, res) => {
  console.log(`[${req.method}] ${req.path}`);

  if (req.method !== "POST") {
    const body = { error: "Method not allowed. Use POST." };
    console.log(`[RES] 405`, JSON.stringify(body));
    res.status(405).json(body);
    return;
  }

  const validation = validateParseDocumentRequest(req.body);
  if (!validation.ok) {
    const body = { error: validation.message };
    console.log(`[RES] 400`, JSON.stringify(body));
    res.status(400).json(body);
    return;
  }

  try {
    const config = loadFunctionsConfig();
    const processor = createDocumentProcessor(config.location);

    const entities = await parseDocument(
      {
        projectId: config.projectId,
        location: config.location,
        processorId: config.processorId,
        content: validation.data.content,
        mimeType: validation.data.mimeType,
      },
      processor,
    );

    const body = { entities };
    console.log(`[RES] 200 entities=${entities.length}`);
    res.status(200).json(body);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("parseDocument failed:", message);
    const body = { error: "Internal server error" };
    console.log(`[RES] 500`, JSON.stringify(body));
    res.status(500).json(body);
  }
};
