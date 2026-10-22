import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const PHOTO_URL = "https://www.figma.com/api/mcp/asset/f49d5065-b7ce-4e2e-8c69-e702250a1ebd.png";
const target = fileURLToPath(new URL("../public/studio.png", import.meta.url));

if (existsSync(target)) {
  process.exit(0);
}

try {
  const response = await fetch(PHOTO_URL, { signal: AbortSignal.timeout(30000) });
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok || !type.startsWith("image/")) {
    throw new Error(`unexpected response (${response.status} ${type})`);
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, Buffer.from(await response.arrayBuffer()));
  console.log("Saved the studio photo to public/studio.png");
} catch (error) {
  console.warn(
    `\nCould not download the studio photo (${error.message}).\n` +
      "The app still works; the left panel will be plain green.\n" +
      "To add it: export the image from Figma (frame node 6-43) and save it as public/studio.png\n"
  );
}
