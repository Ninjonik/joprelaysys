import type { PlacedPiece } from "../../board-demo";
import { applyBoardStateUpdates, getBoardPieces, getPiece } from "./board-state";
import { getRuntimeDeviceKinds } from "./device-kinds";
import { getDefaultPieceState, getPieceDefinition, getStateModelKind } from "./piece-catalog";
import { clearReservedSwitchState, reserveSwitchState } from "./switch-actions";
import type { PieceStateUpdate, TestingBoardState, TestingRuntimeOutcome } from "./types";

const ROUTE_TRIGGER_SELECTED_STATE = "armed";
const ROUTE_TRIGGER_IDLE_STATE = "idle";

function getPieceOccupiedCells(piece: PlacedPiece) {
  const definition = getPieceDefinition(piece);
  return definition.occupied.map(([offsetX, offsetY]) => ({
    x: piece.x + offsetX,
    y: piece.y + offsetY,
  }));
}

function cellKey(x: number, y: number) {
  return `${x}:${y}`;
}

function areCellsAdjacent(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

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

function buildRouteGraph(board: TestingBoardState) {
  const routePieces = getBoardPieces(board).filter(isRouteNode);
  const routePieceIds = new Set(routePieces.map((piece) => piece.id));
  const graph = new Map<string, Set<string>>();
  const piecesByCell = new Map<string, string[]>();

  for (const piece of routePieces) {
    graph.set(piece.id, graph.get(piece.id) ?? new Set<string>());

    for (const cell of getPieceOccupiedCells(piece)) {
      const key = cellKey(cell.x, cell.y);
      piecesByCell.set(key, [...(piecesByCell.get(key) ?? []), piece.id]);
    }
  }

  for (const piece of routePieces) {
    for (const cell of getPieceOccupiedCells(piece)) {
      const candidates = [
        ...(piecesByCell.get(cellKey(cell.x, cell.y)) ?? []),
        ...(piecesByCell.get(cellKey(cell.x + 1, cell.y)) ?? []),
        ...(piecesByCell.get(cellKey(cell.x - 1, cell.y)) ?? []),
        ...(piecesByCell.get(cellKey(cell.x, cell.y + 1)) ?? []),
        ...(piecesByCell.get(cellKey(cell.x, cell.y - 1)) ?? []),
      ];

      for (const candidateId of candidates) {
        const candidate = board.piecesById[candidateId];

        if (!candidate || candidate.id === piece.id) {
          continue;
        }

        if (getPieceOccupiedCells(candidate).some((candidateCell) => (
          (candidateCell.x === cell.x && candidateCell.y === cell.y) || areCellsAdjacent(candidateCell, cell)
        ))) {
          addGraphEdge(graph, piece.id, candidate.id);
        }
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

  for (const pieceId of path) {
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
