import fs from "fs";
import path from "path";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function guessMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "image/jpeg";
}

async function main() {
  const projectId = mustEnv("GCP_PROJECT_ID");
  const location = mustEnv("DOCAI_LOCATION"); // 例: us / eu / asia-northeast1（プロセッサと一致）
  const processorId = mustEnv("DOCAI_PROCESSOR_ID");
  const fileName = mustEnv("FILE_NAME"); // input配下のファイル名（例 receipt.jpg）

  const filePath = `/input/${fileName}`;
  const mimeType = process.env.MIME_TYPE || guessMimeType(filePath);

  const client = new DocumentProcessorServiceClient({
    apiEndpoint: `${location}-documentai.googleapis.com`,
  });

  const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

  const content = fs.readFileSync(filePath).toString("base64");

  const [result] = await client.processDocument({
    name,
    rawDocument: { content, mimeType },
  });

  const doc = result.document;

  console.log("=== entities ===");
  console.log(JSON.stringify(doc?.entities ?? [], null, 2));
}

main().catch((e) => {
  console.error("ERROR:", e?.message || e);
  if (e?.stack) console.error(e.stack);
  process.exit(1);
});