import { NetworkSimulator } from "../simulator/network.js";
import "dotenv/config";
import express from "express";
import cors from "cors";

import {
  runStateShiftAgent,
  type ScenarioName,
} from "../agent/agent.js";

import { scenarios } from "../simulator/scenarios.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

let activeRuns = 0;

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "StateShift API",
    activeRuns,
  });
});

app.get("/api/scenarios", (_req, res) => {
  res.json({
    scenarios: Object.entries(scenarios).map(([id, state]) => ({
      id,
      name: id.replaceAll("_", " "),
      initialState: new NetworkSimulator(state).inspect(),
    })),
  });
});

app.post("/api/run", async (req, res) => {
  const scenario = req.body?.scenario as string | undefined;

  if (
    !scenario ||
    !Object.prototype.hasOwnProperty.call(scenarios, scenario)
  ) {
    res.status(400).json({
      error: "Invalid scenario.",
      availableScenarios: Object.keys(scenarios),
    });
    return;
  }

  if (activeRuns >= 3) {
    res.status(429).json({
      error: "The agent is busy. Please try again shortly.",
    });
    return;
  }

  activeRuns++;

  try {
    const result = await runStateShiftAgent(
      scenario as ScenarioName,
    );

    res.json(result);
  } catch (error) {
    console.error("Agent execution failed:", error);

    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Agent execution failed.",
    });
  } finally {
    activeRuns--;
  }
});

app.post("/api/run/stream", async (req, res) => {
  const scenario = req.body?.scenario as string | undefined;

  if (
    !scenario ||
    !Object.prototype.hasOwnProperty.call(scenarios, scenario)
  ) {
    res.status(400).json({
      error: "Invalid scenario.",
      availableScenarios: Object.keys(scenarios),
    });
    return;
  }

  if (activeRuns >= 3) {
    res.status(429).json({
      error: "The agent is busy. Please try again shortly.",
    });
    return;
  }

  activeRuns++;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  res.flushHeaders();

  const sendEvent = (event: string, data: unknown) => {
    if (res.destroyed || res.writableEnded) return;

    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const result = await runStateShiftAgent(
      scenario as ScenarioName,
      (entry) => {
        sendEvent("trace", entry);
      },
      (state) => {
        sendEvent("state", state);
      },
    );

    sendEvent("complete", result);
    res.end();
  } catch (error) {
    console.error("Streaming agent execution failed:", error);

    sendEvent("error", {
      error:
        error instanceof Error
          ? error.message
          : "Agent execution failed.",
    });

    res.end();
  } finally {
    activeRuns--;
  }
});

app.listen(PORT, () => {
  console.log(`\nStateShift API running at http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});
