import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const PORT = Number.parseInt(process.env.PORT ?? '3400', 10);
const uploadDirectory = join(import.meta.dir, 'uploads');

if (!existsSync(uploadDirectory)) {
  mkdirSync(uploadDirectory, { recursive: true });
}

function sanitizeFileName(input: string | undefined | null) {
  const fallback = 'upload.bin';
  const trimmed = input?.trim() ?? fallback;
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, '_');
  return safe.length > 0 ? safe : fallback;
}

function htmlPage() {
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Bun Upload Receiver</title>
      <style>

        body { font-family: system-ui, sans-serif; margin: 2rem auto; max-width: 520px; line-height: 1.5; }
        form { border: 1px solid #ccc; padding: 1.5rem; border-radius: 12px; }
        label { font-weight: 600; }
        input[type="text"], input[type="file"] { display: block; margin-top: 0.5rem; margin-bottom: 1rem; width: 100%; }
        button { padding: 0.75rem 1.25rem; font-size: 1rem; background: #0a7ea4; color: white; border: 0; border-radius: 8px; cursor: pointer; }
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
    </body>
  </html>`;
}

const server = Bun.serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(htmlPage(), {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }

    if (request.method === 'POST' && url.pathname === '/upload') {
      const formData = await request.formData();
      const storedFiles: Array<{
        field: string;
        savedAs: string;
        originalName: string;
        size: number;
      }> = [];
      const textFields: Record<string, string[]> = {};

      for (const [field, value] of formData.entries()) {
        if (typeof value === 'string') {
          if (!textFields[field]) {
            textFields[field] = [];
          }
          textFields[field].push(value);
          continue;
        }

        if (value instanceof File) {
          const originalName = value.name || 'upload.bin';
          const safeName = `${Date.now()}-${sanitizeFileName(originalName)}`;
          const filePath = join(uploadDirectory, safeName);

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
        message: storedFiles.length > 0 ? 'Files saved successfully.' : 'No files detected in upload.',
        files: storedFiles,
        fields: textFields,
        directory: uploadDirectory,
      };

      console.info('Upload received', responseBody);

      return Response.json(responseBody, { status: storedFiles.length > 0 ? 200 : 400 });
    }

    return new Response('Not found', { status: 404 });
  },
});

console.log(`Upload receiver listening on http://localhost:${server.port}`);
