# Repository Guidelines

## Project Structure & Module Organization
This repo is still bootstrapping; follow these conventions as features land. Place TypeScript source in `src/` and group by feature (`src/upload/handlers.ts`, `src/upload/storage/`). Keep shared utilities in `src/lib/`. Maintain `tests/` mirroring `src/` paths (`tests/upload/handlers.spec.ts`). CLI or maintenance scripts belong in `scripts/`, and developer docs in `docs/`. Assets that ship with the app go under `public/`. If you introduce a new directory, add a README file explaining its purpose.

## Build, Test, and Development Commands
Install dependencies with `npm install`. Use `npm run dev` to start the local dev server (expect it to target `src/index.ts`); prefer watch mode while iterating. Build production artifacts with `npm run build`, which should emit to `dist/`. Run static analysis through `npm run lint`, and execute the full test suite with `npm test`. Please keep these script names consistent inside `package.json` so contributors can rely on them.

## Coding Style & Naming Conventions
Write TypeScript and favor ES modules. Use 2-space indentation, trailing commas where valid, and format with Prettier (`npm run lint -- --fix` should invoke it). Use `camelCase` for variables/functions, `PascalCase` for exported types and React components, and `UPPER_SNAKE_CASE` only for constants that mirror environment variables. When adding new configuration, update `.env.example`.

## Testing Guidelines
Prefer Vitest for unit and integration tests; store files as `tests/**/**.spec.ts`. Each feature should ship with at least one happy-path test and one failure-path scenario. Run `npm test -- --coverage` before pushing; keep coverage above 80% overall. For manual QA steps, document them in the PR description and add fixtures under `tests/fixtures/`.

## Commit & Pull Request Guidelines
Current history only includes `Initial commit`. Adopt Conventional Commits going forward (`feat: add S3 upload route`). Each PR should reference its issue, describe the change, list verification steps, and include relevant screenshots or terminal output when altering UX. Ensure the branch is up to date with `main` before requesting review.

## Security & Configuration Tips
Never commit `.env` files or credentials; rely on `.env.example` for defaults. Use environment variables for secrets and prefer parameterized configuration over hard-coded values. Rotate API keys immediately if you suspect exposure.
