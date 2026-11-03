import "dotenv/config";
import OpenAI from "openai";

import { NetworkSimulator } from "../simulator/network.js";
import { scenarios } from "../simulator/scenarios.js";

const apiKey = process.env.MODEL_API_KEY;

if (!apiKey) {
  throw new Error("MODEL_API_KEY is missing.");
}

const client = new OpenAI({
  apiKey,
  baseURL: "https://api.meta.ai/v1",
});

const MODEL = "muse-spark-1.3";
const MAX_TURNS = 6;
const MAX_REPAIR_ACTIONS = 2;
let repairActions = 0;

const scenarioName =
  process.env.SCENARIO ?? "broken_link";

const selectedScenario = scenarios[
  scenarioName as keyof typeof scenarios
];

if (!selectedScenario) {
  throw new Error(`Unknown scenario: ${scenarioName}`);
}

const simulator = new NetworkSimulator(selectedScenario);

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "inspect_network",
      description: "Inspect all network nodes and links.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "test_connectivity",
      description:
        "Test whether a source node can reach a target node.",
      parameters: {
        type: "object",
        properties: {
          source: { type: "string" },
          target: { type: "string" },
        },
        required: ["source", "target"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "repair_link",
      description:
        "Restore a network link to operational status.",
      parameters: {
        type: "object",
        properties: {
          link_id: { type: "string" },
        },
        required: ["link_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "restart_node",
      description:
        "Restart a failed network node.",
      parameters: {
        type: "object",
        properties: {
          node_id: { type: "string" },
        },
        required: ["node_id"],
        additionalProperties: false,
      },
    },
  },
];

function executeTool(name: string, args: unknown): unknown {
  const input =
    typeof args === "object" && args !== null
      ? (args as Record<string, unknown>)
      : {};

  switch (name) {
    case "inspect_network":
      return simulator.inspect();

    case "test_connectivity": {
      const { source, target } = input;

      if (
        typeof source !== "string" ||
        typeof target !== "string"
      ) {
        return { success: false, error: "Invalid connectivity arguments." };
      }

      return simulator.testConnectivity(source, target);
    }

    case "repair_link": {
        const { link_id } = input;

        if (typeof link_id !== "string") {
            return { success: false, error: "Invalid link ID." };
        }

        if (simulator.testConnectivity("client", "service").reachable) {
            return {
            success: false,
            error: "Repair denied: service is already reachable.",
            };
        }

        if (repairActions >= MAX_REPAIR_ACTIONS) {
            return {
            success: false,
            error: "Repair action limit reached.",
            };
        }

        const link = simulator.inspect().links.find(
            item => item.id === link_id,
        );

        if (!link || link.status !== "down") {
            return {
            success: false,
            error: "Repair denied: link does not exist or is already operational.",
            };
        }

        const success = simulator.repairLink(link_id);

        if (success) repairActions++;

        return {
            success,
            message: success
            ? `Link ${link_id} restored.`
            : `Link ${link_id} could not be restored.`,
        };
    }

    case "restart_node": {
        const { node_id } = input;

        if (typeof node_id !== "string") {
            return { success: false, error: "Invalid node ID." };
        }

        if (simulator.testConnectivity("client", "service").reachable) {
            return {
            success: false,
            error: "Restart denied: service is already reachable.",
            };
        }

        if (repairActions >= MAX_REPAIR_ACTIONS) {
            return {
            success: false,
            error: "Repair action limit reached.",
            };
        }

        const node = simulator.inspect().nodes.find(
            item => item.id === node_id,
        );

        if (!node || node.status !== "down") {
            return {
            success: false,
            error: "Restart denied: node does not exist or is already operational.",
            };
        }

        const success = simulator.restartNode(node_id);

        if (success) repairActions++;

        return {
            success,
            message: success
            ? `Node ${node_id} restarted.`
            : `Node ${node_id} could not be restarted.`,
        };
    }

    default:
      return { success: false, error: `Unknown tool: ${name}` };
  }
}

async function runAgent(): Promise<void> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `
You are StateShift, an autonomous network troubleshooting agent.

Your objective is to restore connectivity between client and service.

Rules:
1. Inspect the network before making changes.
2. Test client-to-service connectivity before deciding on a repair.
3. If connectivity is already working, do not modify the network.
4. Use observed node and link states to diagnose failures.
5. Only repair a component that is confirmed to be down.
6. Never invent node IDs or link IDs.
7. You may perform at most two successful repair actions.
8. Verify connectivity after every repair.
9. Never claim recovery without verification.
10. Explain why you acted or why no repair was necessary.

Explain your investigation and final result clearly.
      `,
    },
    {
      role: "user",
      content:
        "The client cannot reach the service. Investigate the network, repair the problem if possible, and verify recovery.",
    },
  ];

  console.log("\n=== STATESHIFT AGENT STARTED ===");

  let agentResponse = "";

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    console.log(`\n--- Agent turn ${turn} ---`);

    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools,
      tool_choice: "auto",
    });

    const assistantMessage = response.choices[0]?.message;

    if (!assistantMessage) {
      throw new Error("Muse Spark returned an empty response.");
    }

    messages.push(assistantMessage);

    const toolCalls = assistantMessage.tool_calls ?? [];

    if (toolCalls.length === 0) {
      agentResponse =
        typeof assistantMessage.content === "string"
          ? assistantMessage.content
          : "";

      break;
    }

    for (const toolCall of toolCalls) {
      if (toolCall.type !== "function") {
        continue;
      }

      let result: unknown;

      try {
        const args = JSON.parse(toolCall.function.arguments);

        console.log(`\n[TOOL] ${toolCall.function.name}`);
        console.log("[ARGS]", args);

        result = executeTool(toolCall.function.name, args);
      } catch (error) {
        result = {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Tool execution failed.",
        };
      }

      console.log("[RESULT]", result);

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  console.log("\n=== AGENT RESPONSE ===");
  console.log(agentResponse || "Agent reached its turn limit.");

  // Independent verification by the simulator.
  console.log("\n=== INDEPENDENT VERIFICATION ===");

  const verification = simulator.testConnectivity(
    "client",
    "service",
  );

  console.log(verification);

  console.log("\n=== FINAL NETWORK STATE ===");
  console.log(JSON.stringify(simulator.inspect(), null, 2));

  console.log("\n=== STATESHIFT RESULT ===");
  console.log(
    verification.reachable
      ? "SERVICE RECOVERY VERIFIED"
      : "SERVICE RECOVERY NOT VERIFIED",
  );
}

runAgent().catch((error) => {
  console.error("\nStateShift agent failed:", error);
  process.exitCode = 1;
});
