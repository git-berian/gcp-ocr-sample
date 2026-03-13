import { fileURLToPath } from "url";
import { loadAppConfig } from "./infrastructure/config.js";
import { createFileReader } from "./infrastructure/file-reader.js";
import { createDocumentProcessor } from "./infrastructure/document-ai-client.js";
import { processDocument } from "./application/process-document.js";
import { guessMimeType } from "./domain/mime-type.js";

export async function main(): Promise<void> {
  const config = loadAppConfig();
  const fileReader = createFileReader();
  const processor = createDocumentProcessor(config.location);

  const entities = await processDocument(config, fileReader, processor, guessMimeType);

  console.log("=== entities ===");
  console.log(JSON.stringify(entities, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e: unknown) => {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("ERROR:", err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  });
}
