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

This project was created using `bun init` in bun v1.2.21.
