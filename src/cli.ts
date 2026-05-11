import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { runAgent } from "./agent.ts";

const rl = readline.createInterface({ input: stdin, output: stdout });

console.log("personal-agent — type 'exit' to quit");
console.log("─────────────────────────────────────");

while (true) {
  const input = (await rl.question("\nyou › ")).trim();

  if (!input) continue;
  if (input === "exit" || input === "quit") break;

  try {
    const reply = await runAgent(input);
    console.log(`\nagent › ${reply}`);
  } catch (err) {
    console.error("\nerror:", err instanceof Error ? err.message : err);
  }
}

rl.close();
console.log("\nbye.");