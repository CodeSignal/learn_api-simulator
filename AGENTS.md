# Repository Guidelines

This repository contains a template for building embedded applications using
the Bespoke Simulation framework. For complete template documentation, see
[BESPOKE-TEMPLATE.md](./BESPOKE-TEMPLATE.md).

## Overview

This template provides:
- CodeSignal Design System integration
- Consistent layout components (header, sidebar, main content area)
- Help modal system
- Local development server with WebSocket support
- Standardized file structure and naming conventions

## Quick Start

1. **Customize the HTML template** (`client/index.html`):
   - Replace `<!-- APP_TITLE -->` with your page title
   - Replace `<!-- APP_NAME -->` with your app name
   - Add your main content at `<!-- APP_SPECIFIC_MAIN_CONTENT -->`
   - Add app-specific CSS links at `<!-- APP_SPECIFIC_CSS -->`
   - Add app-specific JavaScript at `<!-- APP_SPECIFIC_SCRIPTS -->`

2. **Create your application files**:
   - App-specific CSS (e.g., `my-app.css`)
   - App-specific JavaScript (e.g., `my-app.js`)
   - Help content (based on `help-content-template.html`)

3. **Start the development server**:
   ```bash
   npm start
   ```
   Server runs on `http://localhost:3000`

## Key Conventions

### File Naming

- CSS files: kebab-case (e.g., `my-app.css`)
- JavaScript files: kebab-case (e.g., `my-app.js`)
- Data files: kebab-case (e.g., `solution.json`)
- Image files: kebab-case (e.g., `overview.png`)

### Error Handling

- Wrap all async operations in try-catch blocks
- Provide meaningful error messages to users
- Log errors to console for debugging
- Implement retry logic for network operations
- Handle localStorage quota exceeded errors
- Validate data before saving operations

## Development Workflow

### Build and Test

```bash
# Start development server
npm start

# Development mode (same as start)
npm run dev
```

### WebSocket Messaging

The server provides a `POST /message` endpoint for real-time messaging:

```bash
curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Your message here"}'
```

This sends alerts to connected clients. Requires `ws` package:
```bash
npm install
```

## Template Documentation

For detailed information about:
- Design System usage and components
- CSS implementation guidelines
- JavaScript API (HelpModal)
- Component reference and examples
- Customization options

See [BESPOKE-TEMPLATE.md](./BESPOKE-TEMPLATE.md).

## Project Structure

```
client/
  ├── index.html              # Main HTML template
  ├── app.js                  # Application logic
  ├── bespoke-template.css    # Template-specific styles
  ├── help-modal.js           # Help modal system
  ├── help-content-template.html  # Help content template
  └── design-system/          # CodeSignal Design System
      ├── colors/
      ├── spacing/
      ├── typography/
      └── components/
server.js                      # Development server
```

## Notes for AI Agents

When working on applications built with this template:

1. **Always reference BESPOKE-TEMPLATE.md** for template-specific
   implementation details
2. **Follow the conventions** listed above for file naming
3. **Use Design System components** directly - see BESPOKE-TEMPLATE.md for
   component classes and usage
4. **Maintain consistency** with the template's structure and patterns
5. **Keep guidelines up to date** by editing this AGENTS.md file as the codebase evolves

## API Simulator Architecture

- The simulator UI is built with **React 18 + TypeScript (strict)** via Vite. All app code lives in `client/src` using the following structure:
  - `components/` (layout, request, response, steps, history, common)
  - `hooks/` (config/session/progress/history helpers)
  - `services/` (HTTP client + logging API)
  - `state/store.tsx`, `types/`, `lib/`, `styles/`
- Tailwind CSS is enabled in `client/src/styles/tailwind.css` with `prefix: "tw-"`, `important: ".bespoke"`, and `preflight` disabled. Use CodeSignal Design System classes for primitives (buttons, inputs, cards) and Tailwind utilities for layout/spacing only.
- React mounts into `#api-sim-root` defined in `client/index.html`. Do not change the Bespoke layout outside the provided placeholder slots.
- The simulator is config-driven: default configs live under `client/public/config/`. Load configs with `useConfig` and validate before rendering. Never hardcode task data.

## Server Logging API

- `server.js` now exposes REST endpoints for logging and grading storage:
  - `POST /api/events` — append JSON lines to `.api-sim-data/events.jsonl`
  - `GET /api/events?limit=N` — fetch the latest events
  - `POST /api/progress` — atomically write `.api-sim-data/progress.json`
  - `GET /api/progress` — read the current progress snapshot (404 if missing)
  - `POST /api/reset` — dev-only helper that clears data files when `PORT=3001`
- Events must include `timestamp`, `sessionId`, `taskId`, `eventType`, and optional `stepId`/`payload`. Use `logEvent`/`saveProgress` helpers in the client to hit these endpoints.
- To test locally, run `npm run start:dev` (Vite on :3000, API on :3001) and inspect `.api-sim-data/` for logged files.

## Reminders

- Keep BESPOKE-TEMPLATE.md untouched; document new conventions here instead.
- Continue following CodeSignal Design System guidance for spacing, typography, and accessibility.

## Cursor Cloud specific instructions

- Dependencies are refreshed automatically on startup via the update script (`npm install` + `git submodule update --init --recursive`); you should not need to run these manually.
- `client/design-system` is a **git submodule** (CodeSignal Design System). If it is empty, the CSS links in `client/index.html` 404 and the UI renders unstyled. The update script initializes it, but if styling looks broken re-run `git submodule update --init --recursive`.
- Run the dev environment with `npm run start:dev` (see `package.json`): it concurrently starts Vite on **:3000** (the UI) and the API server on **:3001**. Open the app at `http://localhost:3000`; manual/guided requests target the demo API at `http://localhost:3001/demo-api/*`. Both must be running for end-to-end use.
- Automated check: `node scripts/smoke-test.mjs` exercises the demo CRUD endpoints, but the API server must already be running (e.g. via `npm run start:dev` or `npm run dev:api`) or it will fail to connect.
- There is **no `lint` or `test` npm script and no ESLint config** in the repo, even though ESLint/Prettier are installed as devDependencies. There is no out-of-the-box lint/unit-test command; don't waste time looking for one. Ad hoc formatting check: `npx prettier --check .`.
- `vite build` prints benign font-resolution warnings (`/fonts/...woff didn't resolve at build time`) that resolve at runtime; the build still succeeds.
- Production mode (`npm run start:prod`) forces port 3000 and requires a prior `npm run build` (it throws if `dist/` is missing). For development always prefer `npm run start:dev`.
