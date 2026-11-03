
import "dotenv/config";
import { runStateShiftAgent } from "./agent.js";
import type { ScenarioName } from "./agent.js";

async function main(): Promise<void> {
  const scenarioName = (process.env.SCENARIO ?? "broken_link") as ScenarioName;

  const result = await runStateShiftAgent(scenarioName);

  console.log("\n=== STATESHIFT AGENT STARTED ===");

  for (const entry of result.trace) {
    console.log(`\n[TOOL] ${entry.tool}`);
    console.log("[ARGS]", entry.args);
    console.log("[RESULT]", entry.result);
  }

  console.log("\n=== AGENT RESPONSE ===");
  console.log(result.agentResponse);

  console.log("\n=== INDEPENDENT VERIFICATION ===");
  console.log(result.verification);

  console.log("\n=== FINAL NETWORK STATE ===");
  console.log(JSON.stringify(result.finalState, null, 2));

  console.log("\n=== STATESHIFT RESULT ===");
  console.log(
    result.status === "verified"
      ? "SERVICE RECOVERY VERIFIED"
      : "SERVICE RECOVERY NOT VERIFIED",
  );
}

main().catch((error) => {
  console.error("\nStateShift agent failed:", error);
  process.exitCode = 1;
});
