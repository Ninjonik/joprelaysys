import type { PlacedPiece } from "../../board-demo";
import { applyBoardStateUpdates, getBoardPieces, getPiece } from "./board-state";
import { getRuntimeDeviceKinds } from "./device-kinds";
import { getDefaultPieceState, getPieceDefinition, getStateModelKind } from "./piece-catalog";
import { getActiveNodeGroups, type AbsolutePort, type PortSide } from "./route-ports";
import { clearReservedSwitchState, reserveSwitchState } from "./switch-actions";
import type { PieceStateUpdate, TestingBoardState, TestingRuntimeOutcome } from "./types";


const ROUTE_TRIGGER_SELECTED_STATE = "armed";
const ROUTE_TRIGGER_IDLE_STATE = "idle";

function cellSideKey(x: number, y: number, side: PortSide) {
  return `${x}:${y}:${side}`;
}

const OPPOSITE_SIDE: Record<PortSide, PortSide> = {
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
};

const SIDE_OFFSET: Record<PortSide, { dx: number; dy: number }> = {
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
  top: { dx: 0, dy: -1 },
  bottom: { dx: 0, dy: 1 },
};

function isRouteNode(piece: PlacedPiece) {
  const kind = getStateModelKind(piece);
  return (
      kind === "trackOccupancy"
      || kind === "switchPosition"
      || kind === "switchCrossover"
      || kind === "signalAspect"
      || getRuntimeDeviceKinds(piece.pieceKey).includes("routeTrigger")
  );
}

function isTrackLikeRouteNode(piece: PlacedPiece) {
  const kind = getStateModelKind(piece);
  return kind === "trackOccupancy" || kind === "switchPosition" || kind === "switchCrossover";
}

function isSignalRouteNode(piece: PlacedPiece) {
  return getStateModelKind(piece) === "signalAspect";
}

function getProceedState(piece: PlacedPiece) {
  const stateModel = getPieceDefinition(piece).stateModel;
  const states = "states" in stateModel ? stateModel.states.map((state) => state.id) : [];

  if (states.includes("green")) return "green";
  if (states.includes("clear")) return "clear";
  if (states.includes("proceed")) return "proceed";
  if (states.includes("white")) return "white";

  return piece.state;
}

function shouldClearRouteState(piece: PlacedPiece) {
  if (isTrackLikeRouteNode(piece) && piece.state === "reserved") {
    return true;
  }

  if ((getStateModelKind(piece) === "switchPosition" || getStateModelKind(piece) === "switchCrossover") && piece.state.includes(".reserved")) {
    return true;
  }

  if (isSignalRouteNode(piece)) {
    return piece.state === "green" || piece.state === "clear" || piece.state === "proceed" || piece.state === "white";
  }

  return getRuntimeDeviceKinds(piece.pieceKey).includes("routeTrigger") && piece.state === ROUTE_TRIGGER_SELECTED_STATE;
}

function buildClearRouteUpdates(board: TestingBoardState) {
  const updates: PieceStateUpdate[] = [];

  for (const piece of getBoardPieces(board)) {
    if (!shouldClearRouteState(piece)) {
      continue;
    }

    if (getStateModelKind(piece) === "switchPosition" || getStateModelKind(piece) === "switchCrossover") {
      updates.push({ pieceId: piece.id, state: clearReservedSwitchState(piece.state) });
    } else if (getRuntimeDeviceKinds(piece.pieceKey).includes("routeTrigger")) {
      updates.push({ pieceId: piece.id, state: ROUTE_TRIGGER_IDLE_STATE });
    } else {
      updates.push({ pieceId: piece.id, state: getDefaultPieceState(piece) });
    }
  }

  return updates;
}

function addGraphEdge(graph: Map<string, Set<string>>, a: string, b: string) {
  if (a === b) {
    return;
  }

  const aEdges = graph.get(a) ?? new Set<string>();
  const bEdges = graph.get(b) ?? new Set<string>();
  aEdges.add(b);
  bEdges.add(a);
  graph.set(a, aEdges);
  graph.set(b, bEdges);
}

function nodeId(pieceId: string, suffix: string) {
  return suffix ? `${pieceId}#${suffix}` : pieceId;
}

function pieceIdFromNode(node: string) {
  const hashIndex = node.indexOf("#");
  return hashIndex === -1 ? node : node.slice(0, hashIndex);
}

/**
 * Builds a graph over *node groups* (piece, or piece+branch-group for
 * multi-branch pieces like crossovers) using explicit port geometry rather
 * than raw cell-boundary adjacency. Two ports connect only if one piece's
 * port faces directly into the matching opposite-side port of a neighbor -
 * this is what prevents unrelated parallel tracks or a switch's inactive
 * branch from producing false edges.
 */
function buildRouteGraph(board: TestingBoardState) {
  const routePieces = getBoardPieces(board).filter(isRouteNode);
  const graph = new Map<string, Set<string>>();

  type IndexedPort = { node: string; port: AbsolutePort };
  const portsBySocket = new Map<string, IndexedPort[]>();

  for (const piece of routePieces) {
    const groups = getActiveNodeGroups(piece);

    for (const group of groups) {
      const node = nodeId(piece.id, group.suffix);
      graph.set(node, graph.get(node) ?? new Set<string>());

      for (const port of group.ports) {
        const key = cellSideKey(port.x, port.y, port.side);
        portsBySocket.set(key, [...(portsBySocket.get(key) ?? []), { node, port }]);
      }
    }
  }

  for (const [, indexedPorts] of portsBySocket) {
    for (const { node, port } of indexedPorts) {
      const offset = SIDE_OFFSET[port.side];
      const neighborKey = cellSideKey(port.x + offset.dx, port.y + offset.dy, OPPOSITE_SIDE[port.side]);
      const neighbors = portsBySocket.get(neighborKey) ?? [];

      for (const neighbor of neighbors) {
        addGraphEdge(graph, node, neighbor.node);
      }
    }
  }

  return graph;
}

function findRoutePath(board: TestingBoardState, startId: string, destinationId: string) {
  const graph = buildRouteGraph(board);
  const queue: string[][] = [[startId]];
  const visited = new Set([startId]);

  while (queue.length > 0) {
    const path = queue.shift();

    if (!path) {
      continue;
    }

    const current = path[path.length - 1];

    if (current === destinationId) {
      return path;
    }

    for (const next of graph.get(current) ?? []) {
      if (visited.has(next)) {
        continue;
      }

      visited.add(next);
      queue.push([...path, next]);
    }
  }

  return null;
}

function buildReserveRouteUpdates(board: TestingBoardState, path: string[]) {
  const updates: PieceStateUpdate[] = [];
  const seenPieceIds = new Set<string>();

  for (const node of path) {
    const pieceId = pieceIdFromNode(node);

    if (seenPieceIds.has(pieceId)) {
      continue;
    }
    seenPieceIds.add(pieceId);

    const piece = getPiece(board, pieceId);

    if (!piece) {
      continue;
    }

    if (getStateModelKind(piece) === "trackOccupancy") {
      updates.push({ pieceId, state: "reserved" });
    } else if (getStateModelKind(piece) === "switchPosition" || getStateModelKind(piece) === "switchCrossover") {
      updates.push({ pieceId, state: reserveSwitchState(piece) });
    } else if (isSignalRouteNode(piece)) {
      updates.push({ pieceId, state: getProceedState(piece) });
    }
  }

  return updates;
}

export function planRouteAction(board: TestingBoardState, pieceId: string): TestingRuntimeOutcome {
  const piece = getPiece(board, pieceId);

  if (!piece || !getRuntimeDeviceKinds(piece.pieceKey).includes("routeTrigger")) {
    return { immediate: [], delayed: [] };
  }

  const clearUpdates = buildClearRouteUpdates(board);
  const selectedTrigger = getBoardPieces(board).find((candidate) => (
      candidate.id !== pieceId
      && getRuntimeDeviceKinds(candidate.pieceKey).includes("routeTrigger")
      && candidate.state === ROUTE_TRIGGER_SELECTED_STATE
  ));

  if (!selectedTrigger) {
    return {
      immediate: [...clearUpdates, { pieceId, state: ROUTE_TRIGGER_SELECTED_STATE }],
      delayed: [],
    };
  }

  const boardAfterClear = applyBoardStateUpdates(board, clearUpdates);
  const path = findRoutePath(boardAfterClear, selectedTrigger.id, pieceId);


  for (const p of getBoardPieces(boardAfterClear)) {
    if (!isRouteNode(p)) continue;
    const groups = getActiveNodeGroups(p);
    console.log(
        p.pieceKey,
        { x: p.x, y: p.y, rotation: p.rotation, mirrored: p.mirrored, state: p.state },
        "groups:",
        groups.map(g => ({
          suffix: g.suffix,
          ports: g.ports.map(port => `${port.id}@(${port.x},${port.y})-${port.side}`),
        })),
    );
  }

  console.log(
      "PATH:",
      path?.map((id) => {
        const p = getPiece(boardAfterClear, id);
        return p ? { key: p.pieceKey, anchor: [p.x, p.y] } : null;
      })
  );

  if (!path) {
    return {
      immediate: clearUpdates,
      delayed: [],
    };
  }

  return {
    immediate: [...clearUpdates, ...buildReserveRouteUpdates(boardAfterClear, path)],
    delayed: [],
  };
}