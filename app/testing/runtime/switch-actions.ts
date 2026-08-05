import type { PlacedPiece } from "../../board-demo";
import { applyBoardRecordStateUpdates, getBoardPieces, getPiece } from "./board-state";
import { getStateModelKind } from "./piece-catalog";
import type {
  PieceStateUpdate,
  SelectorDirection,
  TestingBoardRecord,
  TestingBoardState,
  TestingRuntimeOutcome,
} from "./types";

type SwitchTarget = {
  pieceId: string;
  partIndex: number;
};

const SWITCH_TRAVEL_MS = 5000;

function getLinkedSwitchTargets(board: TestingBoardState, selectorId: string): SwitchTarget[] {
  return board.links.flatMap((link) => {
    if (link.a.pieceId === selectorId && link.a.kind === "selector" && link.b.kind === "switchPart") {
      return [{ pieceId: link.b.pieceId, partIndex: link.b.partIndex }];
    }

    if (link.b.pieceId === selectorId && link.b.kind === "selector" && link.a.kind === "switchPart") {
      return [{ pieceId: link.a.pieceId, partIndex: link.a.partIndex }];
    }

    return [];
  });
}

function isMovingSwitchState(state: string) {
  return state === "moving" || state.includes(".moving");
}

function settleMovingSwitchState(piece: PlacedPiece) {
  if (piece.pieceKey.startsWith("switch.crossover")) {
    const current = parseCrossoverState(piece.state);

    if (current.top.aspect === "moving") {
      current.top.aspect = "clear";
    }

    if (current.bottom.aspect === "moving") {
      current.bottom.aspect = "clear";
    }

    return serializeCrossoverState(current);
  }

  if (piece.state === "moving") {
    return `${piece.pieceKey.startsWith("switch.extended") ? "reverse" : "normal"}.clear`;
  }

  const [route = "normal", aspect = "clear"] = piece.state.split(".");
  return aspect === "moving" ? `${route}.clear` : piece.state;
}

function isMovingSwitchTarget(piece: PlacedPiece, partIndex: number) {
  if (!isMovingSwitchState(piece.state)) {
    return false;
  }

  if (piece.pieceKey.startsWith("switch.crossover")) {
    const current = parseCrossoverState(piece.state);
    const section = partIndex === 0 ? current.top : current.bottom;
    return section.aspect === "moving";
  }

  return piece.state === "moving" || piece.state.includes(`.moving.part${partIndex}`);
}

export function parseCrossoverState(rawState: string) {
  const normalized = rawState.includes("top:") && rawState.includes("bottom:")
    ? rawState
    : "top:normal.clear;bottom:normal.clear";
  const sections = normalized.split(";");
  const state = {
    top: { route: "normal" as "normal" | "reverse", aspect: "clear" as "clear" | "reserved" | "moving" },
    bottom: { route: "normal" as "normal" | "reverse", aspect: "clear" as "clear" | "reserved" | "moving" },
  };

  for (const section of sections) {
    const [name, value = "normal.clear"] = section.split(":");
    const [route, aspect] = value.split(".");

    if (name !== "top" && name !== "bottom") {
      continue;
    }

    state[name] = {
      route: route === "reverse" ? "reverse" : "normal",
      aspect: aspect === "reserved" || aspect === "moving" ? aspect : "clear",
    };
  }

  return state;
}

export function serializeCrossoverState(state: ReturnType<typeof parseCrossoverState>) {
  return `top:${state.top.route}.${state.top.aspect};bottom:${state.bottom.route}.${state.bottom.aspect}`;
}

function getRequestedRoute(direction: SelectorDirection) {
  return direction === "left" ? "normal" : "reverse";
}

function getSwitchTargetRoute(piece: PlacedPiece, partIndex: number) {
  if (piece.pieceKey.startsWith("switch.crossover")) {
    const current = parseCrossoverState(piece.state);
    return partIndex === 0 ? current.top.route : current.bottom.route;
  }

  const [route] = piece.state.split(".");
  return route === "reverse" ? "reverse" : "normal";
}

function buildSwitchTargetState(piece: PlacedPiece, partIndex: number, direction: SelectorDirection, phase: "moving" | "settled") {
  const route = getRequestedRoute(direction);

  if (piece.pieceKey.startsWith("switch.crossover")) {
    const current = parseCrossoverState(piece.state);
    const section = partIndex === 0 ? "top" : "bottom";
    current[section] = {
      route,
      aspect: phase === "moving" ? "moving" : "clear",
    };
    return serializeCrossoverState(current);
  }

  if (phase === "moving") {
    return `${route}.moving.part${partIndex}`;
  }

  return `${route}.clear`;
}

export function clearReservedSwitchState(state: string) {
  return state
    .replace(/\.reserved/g, ".clear")
    .replace(/\.moving\.part[01]/g, ".clear");
}

export function reserveSwitchState(piece: PlacedPiece) {
  if (piece.pieceKey.startsWith("switch.crossover")) {
    const current = parseCrossoverState(piece.state);
    current.top.aspect = "reserved";
    current.bottom.aspect = "reserved";
    return serializeCrossoverState(current);
  }

  const [route = "normal"] = piece.state.split(".");
  return `${route}.reserved`;
}

export function isSelectorLocked(board: TestingBoardState, selectorId: string) {
  const selector = getPiece(board, selectorId);

  if (!selector) {
    return true;
  }

  return getLinkedSwitchTargets(board, selectorId).some((target) => {
    const piece = getPiece(board, target.pieceId);
    return piece ? isMovingSwitchTarget(piece, target.partIndex) : false;
  });
}

export function planSelectorAction(board: TestingBoardState, pieceId: string, direction: SelectorDirection): TestingRuntimeOutcome {
  if (isSelectorLocked(board, pieceId)) {
    return { immediate: [], delayed: [] };
  }

  const selector = getPiece(board, pieceId);
  const targets = getLinkedSwitchTargets(board, pieceId);

  if (!selector || targets.length === 0) {
    return { immediate: [], delayed: [] };
  }

  if ((selector.state === "left" && direction === "right") || (selector.state === "right" && direction === "left")) {
    return {
      immediate: [{ pieceId, state: "off" }],
      delayed: [],
    };
  }

  const allTargetsAlreadySet = targets.every((target) => {
    const targetPiece = getPiece(board, target.pieceId);
    return targetPiece ? getSwitchTargetRoute(targetPiece, target.partIndex) === getRequestedRoute(direction) : false;
  });

  if (allTargetsAlreadySet) {
    return selector.state === direction
      ? { immediate: [], delayed: [] }
      : { immediate: [{ pieceId, state: direction }], delayed: [] };
  }

  const immediate: PieceStateUpdate[] = [{ pieceId, state: direction }];
  const settled: PieceStateUpdate[] = [{ pieceId, state: direction }];
  const expected: PieceStateUpdate[] = [];

  for (const target of targets) {
    const targetPiece = getPiece(board, target.pieceId);

    if (!targetPiece) {
      continue;
    }

    const movingState = buildSwitchTargetState(targetPiece, target.partIndex, direction, "moving");
    immediate.push({
      pieceId: target.pieceId,
      state: movingState,
    });
    expected.push({ pieceId: target.pieceId, state: movingState });
    settled.push({
      pieceId: target.pieceId,
      state: buildSwitchTargetState(targetPiece, target.partIndex, direction, "settled"),
    });
  }

  return {
    immediate,
    delayed: [{ delayMs: SWITCH_TRAVEL_MS, expected, updates: settled }],
  };
}

export function settleExpiredSwitchTravel(record: TestingBoardRecord, now = new Date()) {
  const updatedAt = Date.parse(record.updatedAt);

  if (!Number.isFinite(updatedAt) || now.getTime() - updatedAt < SWITCH_TRAVEL_MS) {
    return record;
  }

  const updates = getBoardPieces(record).flatMap((piece) => {
    if ((getStateModelKind(piece) !== "switchPosition" && getStateModelKind(piece) !== "switchCrossover") || !isMovingSwitchState(piece.state)) {
      return [];
    }

    return [{ pieceId: piece.id, state: settleMovingSwitchState(piece) }];
  });

  return applyBoardRecordStateUpdates(record, updates);
}
