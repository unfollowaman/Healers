# Healers — Development Knowledge & Architecture

## System Overview
- **Name**: Healers (Telegram-backed personal music streaming web app)
- **Deployment**: Vercel Serverless Functions (`api/*.js`) + Vercel Cron
- **Storage**: Telegram Bot API (channel posts) + Upstash Redis (REST API)
- **Frontend**: Vanilla HTML5, CSS3, ES6+ JavaScript, Canvas CRT visualizer, MediaSession API
- **Testing**: Node.js native test runner (`node --test tests/*.test.js`)
- **Key Constraints**: Zero runtime npm dependencies, zero build steps, bot token never exposed to frontend.

## Critical Files
- `AGENTS.md` - Primary rules, constraints, database keys, and guidelines for AI agents
- `GEMINI.md` - Workspace rules recognized directly by Antigravity
- `ARCHITECTURE.md` - Detailed technical specification and algorithm math
- `README.md` - User-facing setup, API documentation, and keyboard shortcuts
- `.Jules/bolt.md` - Recorded performance optimizations (Intl.Collator, DocumentFragment, Map lookups)
- `.Jules/palette.md` - Recorded accessibility & interaction patterns (hotkey safety, ARIA labels, focus traps)
