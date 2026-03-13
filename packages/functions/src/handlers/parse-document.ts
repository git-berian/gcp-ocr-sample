import type { HttpFunction } from "@google-cloud/functions-framework";
import { validateParseDocumentRequest } from "../infrastructure/request-validator.js";
import { loadFunctionsConfig } from "../infrastructure/config.js";
import { createDocumentProcessor } from "../infrastructure/document-ai-client.js";
import { parseDocument } from "../application/parse-document.js";

export const handleParseDocument: HttpFunction = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  const validation = validateParseDocumentRequest(req.body);
  if (!validation.ok) {
    res.status(400).json({ error: validation.message });
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

    res.status(200).json({ entities });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("parseDocument failed:", message);
    res.status(500).json({ error: "Internal server error" });
  }
};
