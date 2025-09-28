# upload-receiver

A minimal Bun + TypeScript server that persists uploaded files to disk.

## Install

```bash
bun install
```

## Run the web server

```bash
# Default port: 3000
bun run index.ts

# Or pick a custom port
PORT=4000 bun run index.ts
```

Once running, open <http://localhost:3000> to use the built-in form or send a
`multipart/form-data` request to `POST /upload`. Uploaded files are stored in the
`uploads/` directory that sits alongside `index.ts`.

## Inspect uploads

Visit the root page while the server is running to see a live list of every file
in the uploads directory. Each entry includes size, timestamp, and quick links
to view or download the stored asset. Keep the tab open while uploading—thanks
to server-sent events and a filesystem watcher, the list refreshes automatically
whenever new files arrive.

This project was created using `bun init` in bun v1.2.21.
