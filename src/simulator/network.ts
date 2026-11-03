
import type {
  NetworkState,
  ConnectivityResult,
} from "./types.js";

export class NetworkSimulator {
  private state: NetworkState;

  constructor(initialState: NetworkState) {
    this.state = structuredClone(initialState);
    this.validateState();
  }

  private validateState(): void {
    const nodeIds = new Set(this.state.nodes.map(n => n.id));
    const linkIds = new Set(this.state.links.map(l => l.id));

    if (nodeIds.size !== this.state.nodes.length) {
      throw new Error("Duplicate node IDs");
    }

    if (linkIds.size !== this.state.links.length) {
      throw new Error("Duplicate link IDs");
    }

    for (const link of this.state.links) {
      if (!nodeIds.has(link.source) || !nodeIds.has(link.target)) {
        throw new Error(`Invalid endpoints for ${link.id}`);
      }
    }
  }

  inspect(): NetworkState {
    return structuredClone(this.state);
  }

  testConnectivity(
    source: string,
    target: string,
  ): ConnectivityResult {
    const nodes = new Map(
      this.state.nodes.map(node => [node.id, node]),
    );

    if (!nodes.has(source) || !nodes.has(target)) {
      return {
        reachable: false,
        path: [],
        reason: "Source or target does not exist",
      };
    }

    if (
      nodes.get(source)?.status !== "up" ||
      nodes.get(target)?.status !== "up"
    ) {
      return {
        reachable: false,
        path: [],
        reason: "Source or target is down",
      };
    }

    const queue: string[][] = [[source]];
    const visited = new Set<string>([source]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const current = path[path.length - 1];

      if (current === target) {
        return {
          reachable: true,
          path,
          reason: "Connectivity verified",
        };
      }

      for (const link of this.state.links) {
        if (link.status !== "up") continue;

        let neighbor: string | undefined;

        if (link.source === current) {
          neighbor = link.target;
        } else if (link.target === current) {
          neighbor = link.source;
        }

        if (
          neighbor &&
          !visited.has(neighbor) &&
          nodes.get(neighbor)?.status === "up"
        ) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }

    return {
      reachable: false,
      path: [],
      reason: "No operational path exists",
    };
  }

  repairLink(linkId: string): boolean {
    const link = this.state.links.find(l => l.id === linkId);

    if (!link) return false;

    link.status = "up";
    return true;
  }

  restartNode(nodeId: string): boolean {
    const node = this.state.nodes.find(n => n.id === nodeId);

    if (!node) return false;

    node.status = "up";
    return true;
  }
}
