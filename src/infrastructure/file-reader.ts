import fs from "fs";
import type { FileReader } from "../application/process-document.js";

export function createFileReader(): FileReader {
  return {
    readAsBase64(filePath: string): string {
      return fs.readFileSync(filePath).toString("base64");
    },
  };
}
