import { query } from "@anthropic-ai/claude-agent-sdk";
import "dotenv/config";

/**
 * The agent core. Every transport (CLI, HTTP, Telegram) will call this.
 *
 * For now it's a thin wrapper around the SDK's query() function with a
 * small set of built-in tools enabled. We deliberately don't add memory,
 * scheduling, or skills yet — those come in later posts.
 */
export async function runAgent(userMessage: string): Promise<string> {
  const chunks: string[] = [];

  for await (const message of query({
    prompt: userMessage,
    options: {
      // Built-in tools we let the agent use. Keep this small for now.
      allowedTools: ["WebSearch", "WebFetch"],

      // Be permissive on our own machine. We'll tighten this later.
      permissionMode: "bypassPermissions",

      // Cap a single turn so we don't run away if something goes wrong.
      maxTurns: 10,
    },
  })) {
    // The SDK streams a sequence of message objects. We only print the
    // final assistant text; tool calls happen silently in the background.
    if (message.type === "result" && message.subtype === "success") {
      chunks.push(message.result);
    }
  }

  return chunks.join("\n").trim();
}