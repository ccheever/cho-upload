import { mkdirSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

// Get options
//     Resolve with precedence: CLI > env > defaults
let { values } = parseArgs({
  options: {
    port: { type: "string", short: "p" },
    "uploads-dir": { type: "string", short: "u" },
  },
});

let PORT = Number(values.port ?? process.env.PORT ?? 3400);
let UPLOADS_DIR = path.resolve(
  values["uploads-dir"] ??
    process.env.UPLOADS_DIR ??
    path.join(process.cwd(), "uploads")
);

// Make upload directory if it doesn't exist
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

function sanitizeFileName(input: string | undefined | null) {
  const fallback = "upload.bin";
  const trimmed = input?.trim() ?? fallback;
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
  return safe.length > 0 ? safe : fallback;
}


// Run server
const server = Bun.serve({
  idleTimeout: 60, // Keep this long since it can take a while to upload an image on a bad connection like an airplane
  port: PORT,
  async fetch(request) {
    console.log("(request).");
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      let uploadHtml = await Bun.file("./upload-test-webpage.html").text();

      // return new Response(readFileSync("./upload-test-webpage.html", "utf8"), {
      return new Response(uploadHtml, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (request.method === "POST" && url.pathname === "/upload") {
      const formData = await request.formData();
      const storedFiles: Array<{
        field: string;
        savedAs: string;
        originalName: string;
        size: number;
      }> = [];
      const textFields: Record<string, string[]> = {};

      for (const [field, value] of formData.entries()) {
        if (typeof value === "string") {
          if (!textFields[field]) {
            textFields[field] = [];
          }
          textFields[field].push(value);
          continue;
        }

        if (value instanceof File) {
          const originalName = value.name || "upload.bin";
          const safeName = `${Date.now()}-${sanitizeFileName(originalName)}`;
          const filePath = path.join(UPLOADS_DIR, safeName);

          await Bun.write(filePath, value);

          storedFiles.push({
            field,
            savedAs: safeName,
            originalName,
            size: value.size,
          });
        }
      }

      const responseBody = {
        ok: true,
        message:
          storedFiles.length > 0
            ? "Files saved successfully."
            : "No files detected in upload.",
        files: storedFiles,
        fields: textFields,
        directory: UPLOADS_DIR,
      };

      console.info("Upload received", responseBody);

      return Response.json(responseBody, {
        status: storedFiles.length > 0 ? 200 : 400,
      });
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Upload receiver listening on http://localhost:${server.port}`);
