import { initializeApp } from "firebase/app";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
});

const functions = getFunctions(app, "asia-northeast1");

if (import.meta.env.DEV) {
  connectFunctionsEmulator(functions, "localhost", 8080);
}

export { functions };
