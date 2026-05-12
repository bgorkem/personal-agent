import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { saveMemory, searchMemories, listRecentMemories } from "../memory.ts";

/**
 * These three tools are how the agent talks to its memory.
 *
 * Tool *descriptions* are prompt engineering. The text below — the `description`
 * field and the `.describe()` on each Zod field — is what the model reads when
 * deciding whether to call the tool and what to pass in. Read these as if you
 * were the agent: are the instructions clear? Is it obvious when to use this?
 */

const saveMemoryTool = tool(
  "save_memory",
  "Save a piece of information to long-term memory. Use this when the user " +
    "tells you something worth remembering across conversations — preferences, " +
    "facts about them, decisions, ongoing projects, recurring people. " +
    "Don't save trivia from search results or things you can easily look up again. " +
    "If unsure, prefer saving — small over-recall is better than forgetting.",
  {
    text: z
      .string()
      .min(1)
      .describe(
        "The memory itself, written as a complete self-contained sentence. " +
          "Good: 'User prefers tea over coffee, especially Earl Grey.' " +
          "Bad: 'tea' (too short, no context when retrieved later).",
      ),
    tags: z
      .array(z.string())
      .default([])
      .describe(
        "Short lowercase keywords for categorisation, e.g. ['preferences', 'food']. " +
          "Reuse existing tags when possible — check list_recent_memories first if unsure " +
          "what tags you've used before. 1-4 tags is plenty.",
      ),
  },
  async ({ text, tags }) => {
    const memory = saveMemory(text, tags);
    return {
      content: [
        {
          type: "text" as const,
          text: `Saved memory #${memory.id}: "${memory.text}" [${memory.tags.join(", ") || "no tags"}]`,
        },
      ],
    };
  },
);

const searchMemoryTool = tool(
  "search_memory",
  "Search long-term memory for relevant past information. Use this BEFORE " +
    "answering questions about the user's preferences, history, projects, or " +
    "anything they might have told you previously. A few keywords work best — " +
    "the search uses keyword matching, not semantic similarity.",
  {
    query: z
      .string()
      .min(1)
      .describe(
        "Keywords to search for. Use 1-5 short words, not full sentences. " +
          "Good: 'coffee preferences'. Bad: 'what does the user like to drink in the morning'.",
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(5)
      .describe("Max number of results to return. Default 5 is usually fine."),
  },
  async ({ query, limit }) => {
    const memories = searchMemories(query, limit);
    if (memories.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No memories matched "${query}".`,
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text" as const,
          text: memories
            .map(
              (m) =>
                `#${m.id} [${m.created_at}] (${m.tags.join(", ") || "no tags"}): ${m.text}`,
            )
            .join("\n"),
        },
      ],
    };
  },
);

const listRecentTool = tool(
  "list_recent_memories",
  "List the most recently saved memories in reverse chronological order. " +
    "Use this when the user asks 'what have we talked about lately' or when " +
    "you want to check which tags you've been using before saving a new memory.",
  {
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
      .describe("How many recent memories to list. Default 10."),
  },
  async ({ limit }) => {
    const memories = listRecentMemories(limit);
    if (memories.length === 0) {
      return {
        content: [
          { type: "text" as const, text: "No memories saved yet." },
        ],
      };
    }
    return {
      content: [
        {
          type: "text" as const,
          text: memories
            .map(
              (m) =>
                `#${m.id} [${m.created_at}] (${m.tags.join(", ") || "no tags"}): ${m.text}`,
            )
            .join("\n"),
        },
      ],
    };
  },
);

/**
 * Bundle the three tools into an in-process MCP server. The SDK treats this
 * the same as a remote MCP server, but it runs in our Node process — no
 * subprocess, no network. Just function calls.
 */
export const memoryMcpServer = createSdkMcpServer({
  name: "memory",
  version: "0.1.0",
  tools: [saveMemoryTool, searchMemoryTool, listRecentTool],
});

// The fully-qualified tool names the agent sees, used when allowing tools.
export const memoryToolNames = [
  "mcp__memory__save_memory",
  "mcp__memory__search_memory",
  "mcp__memory__list_recent_memories",
] as const;
