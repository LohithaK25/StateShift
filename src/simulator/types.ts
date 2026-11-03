
export type NodeStatus = "up" | "down";
export type LinkStatus = "up" | "down";

export interface NetworkNode {
  id: string;
  type: "client" | "router" | "service";
  status: NodeStatus;
}

export interface NetworkLink {
  id: string;
  source: string;
  target: string;
  status: LinkStatus;
}

export interface NetworkState {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

export interface ConnectivityResult {
  reachable: boolean;
  path: string[];
  reason: string;
}
