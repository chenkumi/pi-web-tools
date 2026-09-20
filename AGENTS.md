# AGENTS.md

## Project

`pi-web-tools` is a TypeScript ESM pi extension for rendered public-web fetching and optional web search. Runtime source is shipped directly from `src/`; there is no build step. Target Node.js is **22+** and the tested pi package version is **0.85.1** under the `@earendil-works/*` namespace.

## Entry points

- `src/index.ts` registers `web_fetch`, conditional REST `web_search`, OpenAI native-search injection, and `/web-tools status`.
- `src/config.ts` defines and validates `~/.pi/agent/web-search.json`; keep its schema behavior aligned with `schemas/web_search.schema.json`, `examples/web-search.json`, and `README.md`.
- `src/fetch/` owns Playwright lifecycle, network restrictions, and content extraction.
- `src/search.ts` implements the Brave/Exa REST providers; `src/native-openai.ts` modifies Responses payloads only.

## Constraints

- Preserve the three distinct search modes: native OpenAI injection **does not** register a same-named function tool; Brave/Exa do. Do not silently fall back across providers or alter pi-managed OpenAI credentials.
- Treat fetched pages and search results as untrusted data. Do not weaken public-HTTP(S)-only restrictions, private-address blocking, redirect checks, response-size bounds, or the no-login/CAPTCHA-bypass policy without explicit approval.
- Keep browser startup lazy and ensure session shutdown cancels work and closes the fetch service.
- Configuration must fail closed for search registration/injection while leaving `web_fetch` available with safe defaults. Do not include secret values, response bodies, or auth headers in errors/logs.
- The pi Responses decoder currently drops native OpenAI source objects and URL-citation annotations. If changing native search behavior, retain the guidance to emit explicit Markdown source URLs; do not claim annotations are preserved.

## Development

```sh
npm install
npm run browser:install  # required before real Chromium integration tests
npm run typecheck
npm test
npm run test:integration
npm pack --dry-run
```

- Unit tests are in `tests/unit/` and use mocks; integration tests are in `tests/integration/` and use a local fixture server plus real Chromium.
- Add or update focused tests for behavior changes. Do not treat mocked provider tests as validation of real provider credentials/backends.
- Before changing user-facing configuration, tool behavior, limits, or security semantics, update `README.md` and the example/schema when applicable.

## Packaging

`package.json` publishes only `src`, `schemas`, `examples`, `README.md`, and `LICENSE`. Keep required runtime code and user-facing configuration artifacts within those paths, and verify with `npm pack --dry-run`.
