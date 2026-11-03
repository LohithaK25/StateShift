
import test from "node:test";
import assert from "node:assert/strict";

import { NetworkSimulator } from "../src/simulator/network.js";
import { scenarios } from "../src/simulator/scenarios.js";

test("broken link blocks connectivity", () => {
  const sim = new NetworkSimulator(scenarios.broken_link);

  const result = sim.testConnectivity("client", "service");

  assert.equal(result.reachable, false);
});

test("repairing a link restores connectivity", () => {
  const sim = new NetworkSimulator(scenarios.broken_link);

  assert.equal(sim.repairLink("link-2"), true);

  const result = sim.testConnectivity("client", "service");

  assert.equal(result.reachable, true);
  assert.deepEqual(result.path, [
    "client",
    "router-1",
    "router-2",
    "service",
  ]);
});

test("failed router blocks connectivity", () => {
  const sim = new NetworkSimulator(scenarios.failed_router);

  assert.equal(
    sim.testConnectivity("client", "service").reachable,
    false,
  );
});

test("restarting a router restores connectivity", () => {
  const sim = new NetworkSimulator(scenarios.failed_router);

  assert.equal(sim.restartNode("router-1"), true);

  assert.equal(
    sim.testConnectivity("client", "service").reachable,
    true,
  );
});

test("invalid repair does not succeed", () => {
  const sim = new NetworkSimulator(scenarios.broken_link);

  assert.equal(sim.repairLink("missing-link"), false);
});

test("inspection cannot mutate internal state", () => {
  const sim = new NetworkSimulator(scenarios.broken_link);

  const snapshot = sim.inspect();
  const link = snapshot.links.find(
    (item) => item.id === "link-2",
  );

  assert.ok(link, "Expected link-2 to exist");
  link.status = "up";

  assert.equal(
    sim.testConnectivity("client", "service").reachable,
    false,
  );
});
