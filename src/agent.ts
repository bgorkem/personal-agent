import { query } from "@anthropic-ai/claude-agent-sdk";
import "dotenv/config";
import { memoryMcpServer, memoryToolNames } from "./tools/memory-tools.ts"

/**
 * One-paragraph system prompt. Notice we don't list every tool or instruction —
 * the tool descriptions themselves do that work. This prompt's only job is to
 * remind the agent it HAS memory at all, so it doesn't forget to use it.
 *
 * Try removing this prompt and watching the agent confidently make stuff up
 * instead of searching its memory first. The difference is striking.
 */
const SYSTEM_PROMPT = `
You are a personal assistant with long-term memory. Before answering questions
about the user, their preferences, ongoing projects, or anything they may have
told you previously, search your memory first. When the user shares something
worth remembering across conversations, save it. Be proactive about both.
`.trim();

export async function runAgent(userMessage: string): Promise<string> {
  const chunks: string[] = [];

  for await (const message of query({
    prompt: userMessage,
    options: {
      systemPrompt: SYSTEM_PROMPT,

      // Register the in-process MCP server that exposes our memory tools.
      mcpServers: { memory: memoryMcpServer },

      // Built-in tools + our three memory tools (fully-qualified names).
      allowedTools: ["WebSearch", "WebFetch", ...memoryToolNames],

      permissionMode: "bypassPermissions",
      maxTurns: 10,
    },
  })) {
    if (message.type === "result" && message.subtype === "success") {
      chunks.push(message.result);
    }
  }

  return chunks.join("\n").trim();
}
