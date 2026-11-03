import { useEffect, useRef, useState } from "react";

type ScenarioName = "broken_link" | "failed_router" | "redundant_path";

interface NetworkNode {
  id: string;
  type: "client" | "router" | "service";
  status: "up" | "down";
}

interface NetworkLink {
  id: string;
  source: string;
  target: string;
  status: "up" | "down";
}

interface NetworkState {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

interface TraceEntry {
  turn: number;
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
}

interface AgentResult {
  scenario: ScenarioName;
  initialState: NetworkState;
  finalState: NetworkState;
  agentResponse: string;
  verification: {
    reachable: boolean;
    path: string[];
    reason: string;
  };
  repairActions: number;
  trace: TraceEntry[];
  status: "verified" | "not_verified";
}

const scenarioOptions: {
  id: ScenarioName;
  title: string;
  description: string;
}[] = [
  {
    id: "broken_link",
    title: "Broken link",
    description: "A failed connection interrupts the service path.",
  },
  {
    id: "failed_router",
    title: "Failed router",
    description: "A router failure makes the service unreachable.",
  },
  {
    id: "redundant_path",
    title: "Redundant route",
    description: "A backup route keeps service available despite a failure.",
  },
];

function getTracePresentation(entry: TraceEntry) {
  const presentations: Record<
    string,
    { title: string; description: string; stage: string }
  > = {
    inspect_network: {
      title: "Inspect network",
      description: "Read the current state of network nodes and links.",
      stage: "INSPECTION",
    },
    test_connectivity: {
      title: "Test connectivity",
      description: "Check whether the client can reach the service.",
      stage: "DIAGNOSIS",
    },
    repair_link: {
      title: "Repair network link",
      description: "Attempt to restore a failed network connection.",
      stage: "REPAIR",
    },
    restart_node: {
      title: "Restart network node",
      description: "Attempt to recover a failed network node.",
      stage: "REPAIR",
    },
  };

  const presentation = presentations[entry.tool] ?? {
    title: entry.tool.replaceAll("_", " "),
    description: "Agent tool execution.",
    stage: "EXECUTION",
  };

  const result =
    typeof entry.result === "object" && entry.result !== null
      ? (entry.result as Record<string, unknown>)
      : {};

  let outcome = "RESULT RECEIVED";
  let tone = "neutral";

  if (typeof result.success === "boolean") {
    outcome = result.success ? "EXECUTED" : "DENIED / FAILED";
    tone = result.success ? "success" : "failure";
  } else if (typeof result.reachable === "boolean") {
    outcome = result.reachable ? "REACHABLE" : "UNREACHABLE";
    tone = result.reachable ? "success" : "failure";
  } else if (typeof result.error === "string") {
    outcome = "ERROR";
    tone = "failure";
  } else if (
    Array.isArray(result.nodes) &&
    Array.isArray(result.links)
  ) {
    outcome = "NETWORK STATE RECEIVED";
    tone = "success";
  }

  return {
    ...presentation,
    outcome,
    tone,
  };
}

function formatTraceValue(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function formatAgentResponse(response: string): string {
  return response
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ");
}

const positions: Record<string, { x: number; y: number }> = {
  client: { x: 90, y: 155 },
  "router-1": { x: 270, y: 80 },
  "router-2": { x: 470, y: 80 },
  "router-3": { x: 270, y: 235 },
  service: { x: 650, y: 155 },
};

function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(198, 243, 106, 0.13)",
}: {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(
    event: React.MouseEvent<HTMLDivElement>
  ) {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();

    cardRef.current.style.setProperty(
      "--mouse-x",
      `${event.clientX - rect.left}px`
    );

    cardRef.current.style.setProperty(
      "--mouse-y",
      `${event.clientY - rect.top}px`
    );

    cardRef.current.style.setProperty(
      "--spotlight-color",
      spotlightColor
    );
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`card-spotlight ${className}`}
    >
      {children}
    </div>
  );
}

function NetworkTopology({
  state,
  verifiedPath = [],
}: {
  state: NetworkState;
  verifiedPath?: string[];
}) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const pathNodeIds = new Set(verifiedPath);
  const pathEdges = new Set<string>();

  for (let i = 0; i < verifiedPath.length - 1; i++) {
    const a = verifiedPath[i];
    const b = verifiedPath[i + 1];

    if (a && b) {
      pathEdges.add([a, b].sort().join("::"));
    }
  }

  return (
    <div className="topology-visual">
      <div className="topology-scroll">
        <svg
          className="topology"
          viewBox="0 0 740 315"
          role="img"
          aria-label="Network topology showing operational, failed and verified connections"
        >
          {state.links.map((link) => {
            const source = positions[link.source];
            const target = positions[link.target];

            if (!source || !target) return null;

            const down = link.status === "down";
            const onPath = pathEdges.has(
              [link.source, link.target].sort().join("::")
            );

            return (
              <g key={link.id}>
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  className={`network-link ${
                    down ? "failed" : "operational"
                  } ${onPath ? "verified" : ""}`}
                />

                <text
                  x={(source.x + target.x) / 2}
                  y={(source.y + target.y) / 2 - 12}
                  className={`link-label ${
                    down ? "failed-label" : ""
                  } ${onPath ? "verified-label" : ""}`}
                  textAnchor="middle"
                >
                  {link.id}
                </text>

                {down && (
                  <g>
                    <circle
                      cx={(source.x + target.x) / 2}
                      cy={(source.y + target.y) / 2}
                      r="13"
                      className="failure-marker"
                    />
                    <text
                      x={(source.x + target.x) / 2}
                      y={(source.y + target.y) / 2 + 5}
                      textAnchor="middle"
                      className="failure-cross"
                    >
                      {"\u00D7"}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {state.nodes.map((node) => {
            const point = positions[node.id];
            if (!point) return null;

            const down = node.status === "down";
            const active = selectedNode === node.id;
            const onPath = pathNodeIds.has(node.id);

            return (
              <g
                key={node.id}
                className="node-group"
                onClick={() =>
                  setSelectedNode(active ? null : node.id)
                }
                role="button"
                tabIndex={0}
                aria-label={`${node.id}, ${node.status}`}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedNode(active ? null : node.id);
                  }
                }}
              >
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={node.type === "router" ? 31 : 35}
                  className={`node-halo ${down ? "down" : "up"} ${
                    active ? "selected" : ""
                  } ${onPath ? "on-path" : ""}`}
                />

                <circle
                  cx={point.x}
                  cy={point.y}
                  r={node.type === "router" ? 25 : 29}
                  className={`node-core ${down ? "down" : "up"}`}
                />

                <text
                  x={point.x}
                  y={point.y + 5}
                  textAnchor="middle"
                  className="node-symbol"
                >
                  {node.type === "client"
                    ? "C"
                    : node.type === "service"
                      ? "S"
                      : "R"}
                </text>

                <text
                  x={point.x}
                  y={point.y + 52}
                  textAnchor="middle"
                  className="node-name"
                >
                  {node.id}
                </text>

                <text
                  x={point.x}
                  y={point.y + 68}
                  textAnchor="middle"
                  className={`node-status ${
                    down ? "failed-label" : ""
                  }`}
                >
                  {node.status.toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {verifiedPath.length > 0 && (
        <div className="verified-route-note">
          <span className="verified-route-dot" />
          VERIFIED ROUTE
          <strong>{verifiedPath.join("  →  ")}</strong>
        </div>
      )}

      <div className="topology-footer">
        <span>{state.nodes.length} nodes</span>
        <span>{state.links.length} connections</span>
        <span>
          {state.links.filter((link) => link.status === "down").length} failed
          links
        </span>
      </div>

      {selectedNode && (
        <div className="selection-note">
          Selected node: <strong>{selectedNode}</strong>
          <button onClick={() => setSelectedNode(null)}>Clear</button>
        </div>
      )}
    </div>
  );
}

function App() {
  const [scenario, setScenario] =
    useState<ScenarioName>("broken_link");
  const [result, setResult] = useState<AgentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [liveTrace, setLiveTrace] = useState<TraceEntry[]>([]);
  const [liveNetworkState, setLiveNetworkState] = useState<NetworkState | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<"before" | "after">("before");
  const [scenarioStates, setScenarioStates] = useState<
    Partial<Record<ScenarioName, NetworkState>>
  >({});

  useEffect(() => {
    let cancelled = false;

    async function loadScenarios() {
        try {
        const response = await fetch("/api/scenarios");

        if (!response.ok) {
            throw new Error("Could not load network scenarios.");
        }

        const data = await response.json() as {
            scenarios: Array<{
            id: ScenarioName;
            initialState: NetworkState;
            }>;
        };

        if (!cancelled) {
            const states: Partial<Record<ScenarioName, NetworkState>> = {};

            for (const item of data.scenarios) {
            states[item.id] = item.initialState;
            }

            setScenarioStates(states);
        }
        } catch (err) {
        if (!cancelled) {
            setError(
            err instanceof Error
                ? err.message
                : "Could not load network scenarios."
            );
        }
        }
    }

    loadScenarios();

    return () => {
        cancelled = true;
    };
  }, []);

  async function runInvestigation() {
    setLoading(true);
    setError("");
    setResult(null);
    setLiveTrace([]);
    setView("before");
    setLiveNetworkState(scenarioStates[scenario] ?? null);

    try {
        const response = await fetch("/api/run/stream", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
        },
        body: JSON.stringify({ scenario }),
        });

        if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            errorData.error ?? "Agent execution failed.",
        );
        }

        if (!response.body) {
        throw new Error("Streaming response body is unavailable.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = "";
        const completion: { result: AgentResult | null } = {
            result: null,
        };

        function processEvent(block: string) {
        let eventName = "message";
        const dataLines: string[] = [];

        for (const line of block.split("\n")) {
            if (line.startsWith("event:")) {
            eventName = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trimStart());
            }
        }

        if (dataLines.length === 0) return;

        const payload = JSON.parse(dataLines.join("\n"));

        if (eventName === "trace") {
            setLiveTrace((prev) => [...prev, payload as TraceEntry]);
        } else if (eventName === "state") {
            setLiveNetworkState(payload as NetworkState);
        } else if (eventName === "complete") {
            completion.result = payload as AgentResult;
        } else if (eventName === "error") {
            throw new Error(
                (payload as { error?: string }).error ?? "Agent execution failed"
            );
        }
        }

        while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, "\n");

        let boundary = buffer.indexOf("\n\n");

        while (boundary !== -1) {
            const block = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);

            processEvent(block);
            boundary = buffer.indexOf("\n\n");
        }
        }

        buffer += decoder.decode();

        if (buffer.trim()) {
        processEvent(buffer);
        }

        if (!completion.result) {
        throw new Error(
            "The investigation stream ended without a completion event.",
        );
        }

        setResult(completion.result);
        setLiveTrace(completion.result.trace);
        setView("after");
    } catch (err) {
        setError(
        err instanceof Error
            ? err.message
            : "Could not connect to the StateShift API.",
        );
    } finally {
        setLoading(false);
    }
  }

  const displayedState = result
    ? view === "before"
        ? result.initialState
        : result.finalState
    : liveNetworkState ?? scenarioStates[scenario] ?? null;

  const selectedScenario = scenarioOptions.find(
    (item) => item.id === scenario,
  );

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brand-mark">S</span>
          <span>STATESHIFT<span className="brand-period">.</span></span>
        </a>

        <div className="topbar-right">
          <span className="system-indicator">
            <i /> SIMULATION ENVIRONMENT
          </span>
          <span className="model-tag">MUSE SPARK</span>
        </div>
      </header>

      <section className="hero">
        <div className="eyebrow"><span /> AUTONOMOUS NETWORK RECOVERY</div>
        <h1>
          Networks fail.
          <br />
          <span>StateShift responds.</span>
        </h1>
        <p>
          An AI agent that investigates network failures, takes constrained
          repair actions, and independently verifies service recovery.
        </p>
      </section>

      <section className="workspace">
        <aside className="control-panel panel">
          <div className="eyebrow">01 / CONFIGURATION</div>
          <h2>Choose a scenario</h2>
          <p className="muted">
            Select a simulated network condition for the agent to investigate.
          </p>

          <div className="scenario-list">
            {scenarioOptions.map((option, index) => (
              <SpotlightCard
                key={option.id}
                className="scenario-spotlight"
              >
              <button
                className={`scenario-option ${scenario === option.id ? "active" : ""}`}
                onClick={() => {
                  setScenario(option.id);
                  setResult(null);
                  setError("");
                  setLiveNetworkState(null);
                }}
                disabled={loading}
              >
                <span className="scenario-number">0{index + 1}</span>
                <span className="scenario-copy">
                  <strong>{option.title}</strong>
                  <small>{option.description}</small>
                </span>
                <span className="scenario-arrow">↗</span>
              </button>
              </SpotlightCard>
            ))}
          </div>

          <button
            className="run-button"
            onClick={runInvestigation}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" /> INVESTIGATING...
              </>
            ) : (
              <>RUN AI INVESTIGATION <span>↗</span></>
            )}
          </button>

          <div className="control-footnote">
            <span className="lock-symbol">◇</span>
            Constrained actions · Max 2 repairs · Independent verification
          </div>
        </aside>

        <div className="main-column">
          <section className="panel topology-panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">02 / LIVE TOPOLOGY</div>
                <h2>Network state</h2>
              </div>
              <div className="state-switch">
                <button
                  className={!result || view === "before" ? "selected" : ""}
                  onClick={() => setView("before")}
                  disabled={!result}
                >
                  BEFORE
                </button>
                <button
                  className={result && view === "after" ? "selected" : ""}
                  onClick={() => setView("after")}
                  disabled={!result}
                >
                  AFTER
                </button>
              </div>
            </div>

            {displayedState ? (
              <NetworkTopology
                state={displayedState}
                verifiedPath={
                    result &&
                    view === "after" &&
                    result.verification.reachable
                        ? result.verification.path
                        : []
                }
              />
            ) : (
              <div className="empty-topology">
                <div className="empty-icon">⌘</div>
                <strong>Network awaiting investigation</strong>
                <span>
                  Select a scenario and run the agent to inspect the topology.
                </span>
                <div className="empty-nodes">
                  <i /> <span /> <i /> <span /> <i />
                </div>
              </div>
            )}
          </section>

          <section className="panel trace-panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">03 / AGENT EXECUTION</div>
                <h2>Investigation trace</h2>
              </div>
              <span className="trace-count">
                {loading
                  ? `${liveTrace.length} TOOL CALLS · LIVE`
                  : result
                    ? `${result.trace.length} TOOL CALLS`
                    : "AWAITING RUN"}
              </span>
            </div>

            {loading || result ? (
              <>
                {loading && (
                    <div className="loading-state">
                        <span className="spinner" />
                        Muse Spark is inspecting the network and deciding what to do...
                    </div>
                )}

                <div className="trace-list">
                {(result?.trace ?? liveTrace).map((entry, index) => {
                    const presentation = getTracePresentation(entry);

                    return (
                    <article
                        className="trace-entry"
                        key={`${entry.turn}-${index}`}
                    >
                        <div className="trace-index">
                        {String(index + 1).padStart(2, "0")}
                        </div>

                        <div className="trace-content">
                        <div className="trace-title">
                            <div>
                            <span className="trace-stage">
                                {presentation.stage}
                            </span>
                            <strong>{presentation.title}</strong>
                            </div>

                            <span className="trace-turn">
                            TURN {entry.turn}
                            </span>
                        </div>

                        <p className="trace-description">
                            {presentation.description}
                        </p>

                        {Object.keys(entry.args).length > 0 && (
                            <div className="trace-arguments">
                            {Object.entries(entry.args).map(([key, value]) => (
                                <span className="trace-argument" key={key}>
                                <span>{key}</span>
                                <strong>{formatTraceValue(value)}</strong>
                                </span>
                            ))}
                            </div>
                        )}

                        <div className={`trace-outcome ${presentation.tone}`}>
                            <span className="trace-outcome-dot" />
                            {presentation.outcome}
                        </div>

                        <details className="trace-raw">
                            <summary>Inspect raw tool output</summary>
                            <pre>
                            {JSON.stringify(entry.result, null, 2)}
                            </pre>
                        </details>
                        </div>

                        <span
                            className={`trace-check ${presentation.tone}`}
                            title="Tool call completed"
                            aria-label="Tool call completed"
                        >
                        {"\u2022"}
                        </span>
                    </article>
                    );
                })}
              </div>
            </>
            ) : (
              <div className="trace-empty">
                Agent tool calls and observations will appear here.
              </div>
            )}
          </section>
        </div>
      </section>

      {error && (
        <div className="error-banner">
          <strong>Investigation failed</strong>
          <span>{error}</span>
        </div>
      )}

      {result && (
        <section className="results-section">
          <div className="eyebrow">04 / VERIFICATION & OUTCOME</div>
          <div className="result-grid">
            <div className={`verification-card ${result.verification.reachable ? "success" : "failure"}`}>
              <div className="verification-icon">
                {result.verification.reachable ? "✓" : "!"}
              </div>
              <div className="eyebrow">INDEPENDENT VERIFICATION</div>
              <h2>
                {result.verification.reachable
                  ? "Service recovery verified"
                  : "Recovery not verified"}
              </h2>
              <p>{result.verification.reason}</p>
              <div className="route-display">
                {result.verification.path.length > 0
                  ? result.verification.path.join("  →  ")
                  : "No operational route"}
              </div>
            </div>

            <div className="outcome-card panel">
              <div className="eyebrow">AGENT DECISION</div>
              <h2>Investigation summary</h2>
              <p>{formatAgentResponse(result.agentResponse)}</p>
              <div className="outcome-stats">
                <div>
                  <strong>{result.repairActions}</strong>
                  <span>REPAIR ACTIONS</span>
                </div>
                <div>
                  <strong>{result.trace.length}</strong>
                  <span>TOOL CALLS</span>
                </div>
                <div>
                  <strong>{result.status === "verified" ? "PASS" : "FAIL"}</strong>
                  <span>VERIFICATION</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <footer className="footer">
        <span>STATESHIFT <span className="brand-period">.</span></span>
        <span>BUILT WITH META MUSE SPARK</span>
        <span>VERIFIABLE AI · NETWORK SIMULATION</span>
      </footer>
    </main>
  );
}

export default App;
