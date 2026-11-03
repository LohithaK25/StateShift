import { useState } from "react";

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

const positions: Record<string, { x: number; y: number }> = {
  client: { x: 90, y: 155 },
  "router-1": { x: 270, y: 80 },
  "router-2": { x: 470, y: 80 },
  "router-3": { x: 270, y: 235 },
  service: { x: 650, y: 155 },
};

function NetworkTopology({
  state,
  title,
}: {
  state: NetworkState;
  title: string;
}) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const pathNodeIds = new Set<string>();

  if (state.nodes.length > 0) {
    // Highlight the verified route when available in the latest result.
    // Route highlighting is supplied by the parent in the result panel.
  }

  return (
    <section className="panel topology-panel">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">NETWORK MAP</div>
          <h2>{title}</h2>
        </div>
        <div className="legend">
          <span><i className="legend-dot up" /> Operational</span>
          <span><i className="legend-dot down" /> Failed</span>
        </div>
      </div>

      <div className="topology-scroll">
        <svg
          className="topology"
          viewBox="0 0 740 315"
          role="img"
          aria-label="Network topology showing clients, routers, service and their connections"
        >
          {state.links.map((link) => {
            const source = positions[link.source];
            const target = positions[link.target];

            if (!source || !target) return null;

            const down = link.status === "down";

            return (
              <g key={link.id}>
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  className={`network-link ${down ? "failed" : "operational"}`}
                />
                <text
                  x={(source.x + target.x) / 2}
                  y={(source.y + target.y) / 2 - 12}
                  className={`link-label ${down ? "failed-label" : ""}`}
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
                      y={(source.y + target.y) / 2 + 4}
                      textAnchor="middle"
                      className="failure-cross"
                    >
                      ×
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
                    setSelectedNode(active ? null : node.id);
                  }
                }}
              >
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={node.type === "router" ? 31 : 35}
                  className={`node-halo ${down ? "down" : "up"} ${active ? "selected" : ""}`}
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
                  className={`node-status ${down ? "failed-label" : ""}`}
                >
                  {node.status.toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

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
    </section>
  );
}

function App() {
  const [scenario, setScenario] =
    useState<ScenarioName>("broken_link");
  const [result, setResult] = useState<AgentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"before" | "after">("before");

  async function runInvestigation() {
    setLoading(true);
    setError("");
    setResult(null);
    setView("before");

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scenario }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Agent execution failed.");
      }

      setResult(data as AgentResult);
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
    : null;

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
              <button
                key={option.id}
                className={`scenario-option ${scenario === option.id ? "active" : ""}`}
                onClick={() => {
                  setScenario(option.id);
                  setResult(null);
                  setError("");
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
                title={
                  view === "before"
                    ? "Initial network condition"
                    : "Final network condition"
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
                {result ? `${result.trace.length} TOOL CALLS` : "AWAITING RUN"}
              </span>
            </div>

            {loading ? (
              <div className="loading-state">
                <span className="spinner" />
                Muse Spark is inspecting the network and deciding what to do...
              </div>
            ) : result ? (
              <div className="trace-list">
                {result.trace.map((entry, index) => (
                  <div className="trace-entry" key={`${entry.turn}-${index}`}>
                    <div className="trace-index">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="trace-content">
                      <div className="trace-title">
                        <strong>{entry.tool.replaceAll("_", " ")}</strong>
                        <span>TURN {entry.turn}</span>
                      </div>
                      <code>{JSON.stringify(entry.args)}</code>
                      <pre>{JSON.stringify(entry.result, null, 2)}</pre>
                    </div>
                    <span className="trace-check">✓</span>
                  </div>
                ))}
              </div>
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
              <p>{result.agentResponse}</p>
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
