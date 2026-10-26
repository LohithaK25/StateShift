import "dotenv/config";
import OpenAI from "openai";

const apiKey = process.env.MODEL_API_KEY;

if (!apiKey) {
  throw new Error("MODEL_API_KEY is missing. Check your .env file.");
}

const client = new OpenAI({
  apiKey,
  baseURL: "https://api.meta.ai/v1",
});

type NetworkState = {
  nodes: string[];
  links: Array<{
    from: string;
    to: string;
    status: "up" | "down";
  }>;
};

const demoNetwork: NetworkState = {
  nodes: ["client", "router-1", "router-2", "service"],
  links: [
    { from: "client", to: "router-1", status: "up" },
    { from: "router-1", to: "router-2", status: "down" },
    { from: "router-2", to: "service", status: "up" },
  ],
};

function inspectNetwork(): NetworkState {
  console.log("Executing local tool: inspect_network");
  return demoNetwork;
}

async function main() {
  const firstResponse = await client.chat.completions.create({
    model: "muse-spark-1.3",
    messages: [
      {
        role: "system",
        content:
          "You are StateShift, a network troubleshooting agent. Investigate the supplied network state. Use tools when needed. Do not claim a repair has been performed.",
      },
      {
        role: "user",
        content:
          "The service is unreachable. Investigate the network and explain the likely cause.",
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "inspect_network",
          description:
            "Inspect the current simulated network topology and link statuses.",
          parameters: {
            type: "object",
            properties: {},
            required: [],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: "auto",
  });

  const assistantMessage = firstResponse.choices[0]?.message;

  console.log("\nModel requested tools:");
  console.log(assistantMessage?.tool_calls);

  if (!assistantMessage?.tool_calls?.length) {
    console.log("\nModel response:");
    console.log(assistantMessage?.content);
    return;
  }

  const toolResults = assistantMessage.tool_calls.map((toolCall) => {
    if (toolCall.function.name !== "inspect_network") {
      throw new Error(`Unknown tool: ${toolCall.function.name}`);
    }

    const result = inspectNetwork();

    return {
      tool_call_id: toolCall.id,
      role: "tool" as const,
      content: JSON.stringify(result),
    };
  });

  const finalResponse = await client.chat.completions.create({
    model: "muse-spark-1.3",
    messages: [
      {
        role: "system",
        content:
          "You are StateShift, a network troubleshooting agent. Use tool results as evidence. Do not claim to have repaired anything.",
      },
      {
        role: "user",
        content:
          "The service is unreachable. Investigate the network and explain the likely cause.",
      },
      assistantMessage,
      ...toolResults,
    ],
  });

  console.log("\nAgent's final response:");
  console.log(finalResponse.choices[0]?.message.content);
}

main().catch((error) => {
  console.error("Muse Spark tool-call test failed:", error);
  process.exitCode = 1;
});