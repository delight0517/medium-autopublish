// 아주 작은 .env 로더 (외부 의존성 없음)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export function loadEnv() {
  const file = path.join(root, ".env");
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(m[1] in process.env)) process.env[m[1]] = val;
    }
  }
  return {
    DEVTO_API_KEY: process.env.DEVTO_API_KEY || "",
    MEDIUM_AUTH_DIR: path.resolve(
      root,
      process.env.MEDIUM_AUTH_DIR || "./.auth"
    ),
    root,
  };
}
