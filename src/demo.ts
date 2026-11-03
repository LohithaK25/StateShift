
import { NetworkSimulator } from "./simulator/network.js";
import { scenarios } from "./simulator/scenarios.js";

const sim = new NetworkSimulator(scenarios.broken_link);

console.log("=== INITIAL STATE ===");
console.log(JSON.stringify(sim.inspect(), null, 2));

console.log("\n=== BEFORE REPAIR ===");
console.log(sim.testConnectivity("client", "service"));

console.log("\n=== REPAIR ===");
console.log("Repair link-2:", sim.repairLink("link-2"));

console.log("\n=== AFTER REPAIR ===");
console.log(sim.testConnectivity("client", "service"));
