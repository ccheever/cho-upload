import { existsSync, mkdirSync, watch } from "node:fs";
import { readdir, stat } from "node:fs/promises";
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

type Subscriber = (payload: string) => void;
const subscribers = new Set<Subscriber>();

function registerSubscriber(handler: Subscriber) {
  subscribers.add(handler);
}

function unregisterSubscriber(handler: Subscriber) {
  subscribers.delete(handler);
}

function broadcastChange() {
  for (const subscriber of subscribers) {
    try {
      subscriber("refresh");
    } catch (error) {
      console.warn("Failed notifying subscriber", error);
    }
  }
}

function watchUploadsDirectory() {
  let debounceTimer;
  const DEBOUNCE_MS = 100;

  try {
    const watcher = watch(UPLOADS_DIR, { recursive: false }, (eventType, filename) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.log(`Change detected: ${eventType} - ${filename}`);
        broadcastChange();
      }, DEBOUNCE_MS);
    });

    // Clean up on process exit
    process.on("SIGINT", () => {
      watcher.close();
      process.exit();
    });
  } catch (error) {
    console.warn("Unable to start uploads watcher", error);
  }
}

// Run server
const server = Bun.serve({
  idleTimeout: 60, // Keep this long since it can take a while to upload an image on a bad connection like an airplane
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/events") {
      let subscriber: Subscriber | null = null;
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();

          subscriber = (payload: string) => {
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          };

          registerSubscriber(subscriber);

          controller.enqueue(encoder.encode('data: connected\n\n'));

          request.signal.addEventListener("abort", () => {
            if (subscriber) {
              unregisterSubscriber(subscriber);
              subscriber = null;
            }
            try {
              controller.close();
            } catch {}
          });
        },
        cancel() {
          if (subscriber) {
            unregisterSubscriber(subscriber);
            subscriber = null;
          }
        },
      });

      return new Response(stream, {
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
        },
      });
    }

    if (request.method === "GET" && url.pathname === "/") {
      const html = await renderHomePage();

      return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (request.method === "GET" && url.pathname.startsWith("/uploads/")) {
      const maybeName = decodeURIComponent(url.pathname.replace("/uploads/", ""));

      if (!isSafeFilename(maybeName)) {
        return new Response("Invalid filename", { status: 400 });
      }

      const filePath = path.join(UPLOADS_DIR, maybeName);

      if (!existsSync(filePath)) {
        return new Response("Not found", { status: 404 });
      }

      return new Response(Bun.file(filePath));
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
      broadcastChange();

      return Response.json(responseBody, {
        status: storedFiles.length > 0 ? 200 : 400,
      });
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Upload receiver listening on http://localhost:${server.port}`);

watchUploadsDirectory();

async function renderHomePage() {
  const files = await listUploadedFiles();
  const listMarkup =
    files.length > 0
      ? `<ul class="upload-list">${files
          .map((file) => {
            const href = `/uploads/${encodeURIComponent(file.name)}`;
            return `<li class="upload-item">
                <div class="details">
                  <strong>${escapeHtml(file.name)}</strong>
                  <span class="meta">${escapeHtml(file.sizeLabel)} • ${escapeHtml(file.timestamp)}</span>
                </div>
                <div class="actions">
                  <a href="${href}" target="_blank" rel="noopener">View</a>
                  <a href="${href}" download>Download</a>
                </div>
              </li>`;
          })
          .join("")}</ul>`
      : '<p class="empty">No files uploaded yet.</p>';

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Bun Upload Receiver</title>
      <style>
        :root { color-scheme: light dark; }
        body { font-family: system-ui, sans-serif; margin: 2rem auto 4rem; max-width: 640px; line-height: 1.5; padding: 0 1.25rem; }
        h1 { margin-bottom: 0.75rem; }
        form, section.uploads { border: 1px solid rgba(0,0,0,0.1); border-radius: 16px; padding: 1.5rem; backdrop-filter: blur(12px); background: rgba(255,255,255,0.72); }
        form { margin-bottom: 2rem; }
        label { font-weight: 600; }
        input[type="text"], input[type="file"] { display: block; margin-top: 0.5rem; margin-bottom: 1rem; width: 100%; }
        button { padding: 0.75rem 1.25rem; font-size: 1rem; background: #0a7ea4; color: white; border: 0; border-radius: 8px; cursor: pointer; }
        section.uploads h2 { margin: 0 0 0.5rem; }
        section.uploads p code { word-break: break-word; }
        .upload-list { list-style: none; padding: 0; margin: 1rem 0 0; display: flex; flex-direction: column; gap: 0.75rem; }
        .upload-item { display: flex; justify-content: space-between; gap: 1rem; align-items: center; border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; padding: 0.75rem 1rem; background: rgba(255,255,255,0.85); }
        .upload-item .details { min-width: 0; }
        .upload-item strong { display: block; word-break: break-word; }
        .upload-item .meta { font-size: 0.85rem; opacity: 0.7; display: block; }
        .actions { display: flex; gap: 0.75rem; flex-shrink: 0; }
        .actions a { color: #0a7ea4; text-decoration: none; font-weight: 600; }
        .empty { margin: 1rem 0 0; font-style: italic; opacity: 0.7; }
        @media (prefers-color-scheme: dark) {
          body { background: #0b141b; color: #f2f5f9; }
          form, section.uploads { border-color: rgba(255,255,255,0.12); background: rgba(20,28,36,0.85); }
          .upload-item { border-color: rgba(255,255,255,0.08); background: rgba(32,40,48,0.75); }
          .actions a { color: #4db9ff; }
        }
      </style>
    </head>
    <body>
      <h1>Upload Receiver</h1>
      <p>POST a file to <code>/upload</code>. This form uses <code>multipart/form-data</code>.</p>
      <form action="/upload" method="post" enctype="multipart/form-data">
        <label for="file">Choose file</label>
        <input id="file" name="file" type="file" required />
        <label for="note">Optional note</label>
        <input id="note" name="note" type="text" placeholder="Description" />
        <button type="submit">Send file</button>
      </form>
      <section class="uploads" id="uploads">
        <h2>Uploaded files</h2>
        <p>Files are saved to <code>${escapeHtml(UPLOADS_DIR)}</code>.</p>
        ${listMarkup}
      </section>
      <script type="module">
        const evtSource = new EventSource('/events');
        let debounceHandle = null;
        evtSource.onmessage = (event) => {
          if (event.data !== 'refresh') {
            return;
          }
          clearTimeout(debounceHandle);
          debounceHandle = setTimeout(() => {
            window.location.reload();
          }, 150);
        };
        evtSource.onerror = () => {
          evtSource.close();
          setTimeout(() => window.location.reload(), 2000);
        };
      </script>
    </body>
  </html>`;
}

async function listUploadedFiles() {
  try {
    const entries = await readdir(UPLOADS_DIR, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile() && isSafeFilename(entry.name));

    const details = await Promise.all(
      files.map(async (entry) => {
        const filePath = path.join(UPLOADS_DIR, entry.name);
        const info = await stat(filePath);

        return {
          name: entry.name,
          sizeLabel: formatBytes(info.size),
          timestamp: new Date(info.mtime).toLocaleString(),
          mtimeMs: info.mtimeMs,
        };
      })
    );

    return details.sort((a, b) => b.mtimeMs - a.mtimeMs);
  } catch (error) {
    console.error("Unable to read uploads directory", error);
    return [] as Array<{ name: string; sizeLabel: string; timestamp: string; mtimeMs: number }>;
  }
}

function isSafeFilename(name: string) {
  return /^[A-Za-z0-9_.-]+$/.test(name);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function escapeHtml(input: string) {
  return input.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}
