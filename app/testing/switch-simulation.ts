import type { PieceStateUpdate, RuntimeOutcome, RuntimePiece, RuntimeSnapshot, SelectorDirection } from "./runtime-types";
import { getLinkedSwitchTargets, getPiece } from "./runtime-snapshot";

const SWITCH_TRAVEL_MS = 5000;

function isMovingSwitchState(state: string) {
  return state === "moving" || state.includes(".moving");
}

function parseCrossoverState(rawState: string) {
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

function serializeCrossoverState(state: ReturnType<typeof parseCrossoverState>) {
  return `top:${state.top.route}.${state.top.aspect};bottom:${state.bottom.route}.${state.bottom.aspect}`;
}

function getSwitchTargetRoute(piece: RuntimePiece, partIndex: number) {
  if (piece.pieceKey.startsWith("switch.crossover")) {
    const current = parseCrossoverState(piece.state);
    return partIndex === 0 ? current.top.route : current.bottom.route;
  }

  const [route] = piece.state.split(".");
  return route === "reverse" ? "reverse" : "normal";
}

function getRequestedRoute(direction: SelectorDirection) {
  return direction === "left" ? "normal" : "reverse";
}

function buildSwitchTargetState(piece: RuntimePiece, partIndex: number, direction: SelectorDirection, phase: "moving" | "settled") {
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

export function isSelectorLocked(snapshot: RuntimeSnapshot, selectorId: string) {
  const selector = getPiece(snapshot, selectorId);

  if (!selector) {
    return true;
  }

  const targets = getLinkedSwitchTargets(snapshot, selectorId);
  return targets.some((target) => {
    const piece = getPiece(snapshot, target.pieceId);
    return piece ? isMovingSwitchState(piece.state) : false;
  });
}

export function planSelectorAction(snapshot: RuntimeSnapshot, pieceId: string, direction: SelectorDirection): RuntimeOutcome {
  if (isSelectorLocked(snapshot, pieceId)) {
    return { immediate: [], delayed: [] };
  }

  const selector = getPiece(snapshot, pieceId);
  const targets = getLinkedSwitchTargets(snapshot, pieceId);

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
    const targetPiece = getPiece(snapshot, target.pieceId);
    return targetPiece ? getSwitchTargetRoute(targetPiece, target.partIndex) === getRequestedRoute(direction) : false;
  });

  if (allTargetsAlreadySet) {
    if (selector.state === direction) {
      return { immediate: [], delayed: [] };
    }

    return {
      immediate: [{ pieceId, state: direction }],
      delayed: [],
    };
  }

  const immediate: PieceStateUpdate[] = [{ pieceId, state: direction }];
  const settled: PieceStateUpdate[] = [{ pieceId, state: direction }];

  for (const target of targets) {
    const targetPiece = getPiece(snapshot, target.pieceId);
    if (!targetPiece) {
      continue;
    }

    immediate.push({
      pieceId: target.pieceId,
      state: buildSwitchTargetState(targetPiece, target.partIndex, direction, "moving"),
    });
    settled.push({
      pieceId: target.pieceId,
      state: buildSwitchTargetState(targetPiece, target.partIndex, direction, "settled"),
    });
  }

  return {
    immediate,
    delayed: [{ delayMs: SWITCH_TRAVEL_MS, updates: settled }],
  };
}
