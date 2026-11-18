# GEMINI.md — Project Guidelines for Healers

See [AGENTS.md](file:///E:/Antigravity/Projects/Healers/AGENTS.md) for full guidelines, architectural constraints, and performance patterns.

## Critical Highlights for Gemini / Antigravity Agents

1. **Zero Runtime NPM Packages**: Do NOT add any dependencies to `package.json`. Everything must use native Node.js built-ins (`node:https`, `node:test`, `fetch`) and pure vanilla JavaScript/CSS on the frontend.
2. **Database Access**: Upstash Redis is accessed exclusively via HTTP REST API (`fetch`) using `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Never introduce a Redis socket client.
3. **Audio Streaming**: All audio is proxied through `/api/stream?file_id=...` with full HTTP Range request forwarding (`206 Partial Content`). Never expose `TELEGRAM_BOT_TOKEN` to the browser.
4. **Performance Patterns**: Always use `DocumentFragment` for batched DOM rendering, reuse the module-scoped `Intl.Collator` instance for string sorting, pre-compute `Set`/`Map` lookup tables before loops, and run independent Redis REST calls in parallel with `Promise.all`.
5. **Testing**: Run tests with `node --test tests/*.test.js`.
