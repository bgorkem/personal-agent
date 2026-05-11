# Personal Agent

A personal AI agent built step-by-step with the [Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk).
Companion code for a blog series — each post is a git tag.

## Posts

- [post-01-hello-agent](./blog/POST-01.md) — the simplest possible agent loop ← **you are here**

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

You should see:

```
personal-agent — type 'exit' to quit
─────────────────────────────────────

you ›
```

Try things like:

- `hello, who are you?`
- `what's the weather in london right now?` (uses WebSearch)
- `summarise the top story on hacker news` (uses WebFetch)

Type `exit` to quit.

## What's in this version

- `src/agent.ts` — the agent core, a single `runAgent(message)` function
- `src/cli.ts` — a 20-line readline loop that calls it

That's it. No memory, no scheduling, no skills. Those come next.

## License

MIT