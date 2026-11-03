
import type { NetworkState } from "./types.js";

export const scenarios: Record<
  "broken_link" | "failed_router" | "redundant_path",
  NetworkState
> = {
  broken_link: {
    nodes: [
      { id: "client", type: "client", status: "up" },
      { id: "router-1", type: "router", status: "up" },
      { id: "router-2", type: "router", status: "up" },
      { id: "service", type: "service", status: "up" },
    ],
    links: [
      {
        id: "link-1",
        source: "client",
        target: "router-1",
        status: "up",
      },
      {
        id: "link-2",
        source: "router-1",
        target: "router-2",
        status: "down",
      },
      {
        id: "link-3",
        source: "router-2",
        target: "service",
        status: "up",
      },
    ],
  },

  failed_router: {
    nodes: [
      { id: "client", type: "client", status: "up" },
      { id: "router-1", type: "router", status: "down" },
      { id: "service", type: "service", status: "up" },
    ],
    links: [
      {
        id: "link-1",
        source: "client",
        target: "router-1",
        status: "up",
      },
      {
        id: "link-2",
        source: "router-1",
        target: "service",
        status: "up",
      },
    ],
  },

  redundant_path: {
    nodes: [
        { id: "client", type: "client", status: "up" },
        { id: "router-1", type: "router", status: "up" },
        { id: "router-2", type: "router", status: "up" },
        { id: "router-3", type: "router", status: "up" },
        { id: "service", type: "service", status: "up" },
    ],
    links: [
        { id: "link-1", source: "client", target: "router-1", status: "up" },
        { id: "link-2", source: "router-1", target: "router-2", status: "down" },
        { id: "link-3", source: "router-2", target: "service", status: "up" },
        { id: "link-4", source: "client", target: "router-3", status: "up" },
        { id: "link-5", source: "router-3", target: "service", status: "up" },
    ],
  },
};
