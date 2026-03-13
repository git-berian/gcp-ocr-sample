import { http } from "@google-cloud/functions-framework";
import { handleParseDocument } from "./handlers/parse-document.js";

http("parseDocument", handleParseDocument);
