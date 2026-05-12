# Personal Agent

A personal AI agent built step-by-step with the [Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk).
Companion code for a blog series — each post is a git tag.

## Posts

- [post-01-hello-agent](./blog/POST-01.md) — the simplest possible agent loop
- [post-02-memory](./blog/POST-02.md) — giving the agent memory with SQLite + FTS5 ← **you are here**

## Requirements

- Node.js 20+
- An Anthropic API key ([get one here](https://console.anthropic.com/))

## Setup

```bash
git clone https://github.com/bgorkem/personal-agent
cd personal-agent
npm install
cp .env.example .env
# edit .env and paste your ANTHROPIC_API_KEY
```

## Run

```bash
npm start
```

Try things like:

- `remember that I prefer Earl Grey over coffee`
- `what do I like to drink?`
- `what have we talked about lately?`

The memory file lives at `data/agent.db` and is gitignored. Delete it any time to start fresh.

## What's in this version

- `src/agent.ts` — the agent core, with memory tools registered
- `src/memory.ts` — SQLite + FTS5 schema and CRUD functions
- `src/tools/memory-tools.ts` — the three tools the agent calls: save, search, list
- `src/cli.ts` — readline loop

## License

MIT
