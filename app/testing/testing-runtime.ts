import catalogData from "../data/piece-catalog.json";
import type { PieceLink, PlacedPiece } from "../board-demo";

const BOARD_TILE = 42;

type CellPieceId = string | null;

export type TestingBoardCell = {
  x: number;
  y: number;
  pieceId: CellPieceId;
};

export type TestingBoardState = {
  columns: number;
  rows: number;
  tileSize: number;
  cells: TestingBoardCell[][];
  piecesById: Record<string, PlacedPiece>;
  pieceIds: string[];
  links: PieceLink[];
};

export type TestingBoardRecord = TestingBoardState & {
  revision: number;
  updatedAt: string;
};

export type TestingBoardRecordInput = TestingBoardState;

export type PieceStateUpdate = {
  pieceId: string;
  state: string;
};

export type SelectorDirection = "left" | "right";

export type LineblockControl =
  | "requestConsent"
  | "dispatchTrain"
  | "grantConsent"
  | "cancelConsent"
  | "confirmTrainEnd"
  | "grantClearance";

export type TestingAction =
  | { type: "selector"; pieceId: string; direction: SelectorDirection }
  | { type: "lineblock"; pieceId: string; control: LineblockControl }
  | { type: "routeTrigger"; pieceId: string };

export type TestingRuntimeOutcome = {
  immediate: PieceStateUpdate[];
  delayed: Array<{
    delayMs: number;
    updates: PieceStateUpdate[];
  }>;
};

export type RuntimeDeviceKind =
  | "switchSelector"
  | "lineblock"
  | "signal"
  | "occupancySensor"
  | "shuntingSignal"
  | "routeTrigger"
  | "other";

type DeviceKindRule = {
  deviceKind: RuntimeDeviceKind;
  keys?: string[];
  prefixes?: string[];
};

type SwitchTarget = {
  pieceId: string;
  partIndex: number;
};

type LineblockState = {
  lineFree: boolean;
  consentReceived: boolean;
  consentGranted: boolean;
  requestClearance: boolean;
};

const SWITCH_TRAVEL_MS = 5000;

const deviceKindRules: DeviceKindRule[] = [
  { deviceKind: "switchSelector", keys: ["button.switchSelector"] },
  { deviceKind: "lineblock", keys: ["button.lineblock"] },
  { deviceKind: "shuntingSignal", prefixes: ["signal.shunt"] },
  { deviceKind: "signal", prefixes: ["signal."] },
  { deviceKind: "occupancySensor", prefixes: ["track."] },
  {
    deviceKind: "routeTrigger",
    keys: [
      "signal.premain",
      "signal.premain.noocp",
      "button.departure",
      "button.shunt",
      "button.shunt.noocp",
      "button.shuntBufferSignal",
    ],
  },
];

function createCells(columns: number, rows: number) {
  return Array.from({ length: rows }, (_, y) =>
    Array.from({ length: columns }, (_, x) => ({
      x,
      y,
      pieceId: null as CellPieceId,
    })),
  );
}

export function createTestingBoardState({
  columns,
  rows,
  tileSize,
  pieces,
  links,
}: {
  columns: number;
  rows: number;
  tileSize: number;
  pieces: PlacedPiece[];
  links: PieceLink[];
}): TestingBoardState {
  const cells = createCells(columns, rows);
  const piecesById: Record<string, PlacedPiece> = {};
  const pieceIds: string[] = [];

  for (const piece of pieces) {
    piecesById[piece.id] = piece;
    pieceIds.push(piece.id);

    const bounds = catalogData.pieces[piece.pieceKey].bounds;

    for (let dy = 0; dy < bounds.height; dy += 1) {
      for (let dx = 0; dx < bounds.width; dx += 1) {
        const x = piece.x + dx;
        const y = piece.y + dy;

        if (y >= 0 && y < rows && x >= 0 && x < columns) {
          cells[y]![x] = { x, y, pieceId: piece.id };
        }
      }
    }
  }

  return {
    columns,
    rows,
    tileSize,
    cells,
    piecesById,
    pieceIds,
    links,
  };
}

export function createTestingBoardStateFromRecord(record: TestingBoardRecord, tileSize: number) {
  return { ...record, tileSize };
}

export function getBoardPieces(board: TestingBoardState) {
  return board.pieceIds.map((pieceId) => board.piecesById[pieceId]).filter(Boolean);
}

export function createEmptyTestingBoardRecord(): TestingBoardRecord {
  return {
    ...createTestingBoardState({
      columns: 24,
      rows: 14,
      tileSize: BOARD_TILE,
      pieces: [],
      links: [],
    }),
    revision: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function sanitizeTestingBoardRecordInput(input: TestingBoardRecordInput, revision: number): TestingBoardRecord {
  const pieces = getBoardPieces(input);

  return {
    ...createTestingBoardState({
      columns: Number.isFinite(input.columns) ? input.columns : 24,
      rows: Number.isFinite(input.rows) ? input.rows : 14,
      tileSize: Number.isFinite(input.tileSize) ? input.tileSize : BOARD_TILE,
      pieces,
      links: Array.isArray(input.links) ? input.links : [],
    }),
    revision,
    updatedAt: new Date().toISOString(),
  };
}

export function applyBoardRecordStateUpdates(record: TestingBoardRecord, updates: PieceStateUpdate[]) {
  if (updates.length === 0) {
    return record;
  }

  const updateMap = new Map(updates.map((update) => [update.pieceId, update.state]));
  let changed = false;
  const piecesById = { ...record.piecesById };

  for (const [pieceId, piece] of Object.entries(piecesById)) {
    const nextState = updateMap.get(pieceId);

    if (!nextState || nextState === piece.state) {
      continue;
    }

    piecesById[pieceId] = { ...piece, state: nextState };
    changed = true;
  }

  return changed
    ? {
        ...record,
        piecesById,
        revision: record.revision + 1,
        updatedAt: new Date().toISOString(),
      }
    : record;
}

export function getPiece(board: TestingBoardState, pieceId: string) {
  return board.piecesById[pieceId] ?? null;
}

export function applyBoardStateUpdates(board: TestingBoardState, updates: PieceStateUpdate[]) {
  if (updates.length === 0) {
    return board;
  }

  const nextPiecesById = { ...board.piecesById };
  let changed = false;

  for (const update of updates) {
    const piece = nextPiecesById[update.pieceId];

    if (!piece || piece.state === update.state) {
      continue;
    }

    nextPiecesById[update.pieceId] = { ...piece, state: update.state };
    changed = true;
  }

  return changed ? { ...board, piecesById: nextPiecesById } : board;
}

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

function planSelectorAction(board: TestingBoardState, pieceId: string, direction: SelectorDirection): TestingRuntimeOutcome {
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

  for (const target of targets) {
    const targetPiece = getPiece(board, target.pieceId);

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

function getRemoteDelay() {
  return 3000 + Math.floor(Math.random() * 2001);
}

function parseLineblockState(rawState: string): LineblockState {
  return {
    lineFree: !rawState.startsWith("lineBusy"),
    consentReceived: rawState.includes("consentReceived"),
    consentGranted: rawState.includes("consentGranted"),
    requestClearance: rawState.includes("requestClearance"),
  };
}

function serializeLineblockState(state: LineblockState) {
  if (!state.lineFree && state.requestClearance) return "lineBusy.requestClearance";
  if (state.consentReceived && state.requestClearance) return "consentReceived.requestClearance";
  if (state.consentGranted && state.requestClearance) return "consentGranted.requestClearance";
  if (!state.lineFree) return "lineBusy";
  if (state.requestClearance) return "requestClearance";
  if (state.consentReceived) return "consentReceived";
  if (state.consentGranted) return "consentGranted";
  return "clear";
}

function planLineblockAction(board: TestingBoardState, pieceId: string, control: LineblockControl): TestingRuntimeOutcome {
  const piece = getPiece(board, pieceId);

  if (!piece) {
    return { immediate: [], delayed: [] };
  }

  const current = parseLineblockState(piece.state);
  const next = { ...current };
  const delayed: TestingRuntimeOutcome["delayed"] = [];

  if (control === "requestConsent" && current.lineFree && !current.consentReceived && !current.consentGranted) {
    delayed.push({
      delayMs: getRemoteDelay(),
      updates: [{ pieceId, state: serializeLineblockState({ ...next, consentReceived: true }) }],
    });
  }

  if (control === "dispatchTrain" && current.lineFree && current.consentReceived) {
    next.lineFree = false;
    next.consentReceived = false;
    delayed.push({
      delayMs: getRemoteDelay(),
      updates: [{ pieceId, state: serializeLineblockState({ ...next, requestClearance: true }) }],
    });
  }

  if (control === "grantConsent" && current.lineFree && !current.consentReceived) {
    next.consentGranted = true;
  }

  if (control === "cancelConsent" && current.consentGranted) {
    next.consentGranted = false;
  }

  if (control === "confirmTrainEnd" && !current.lineFree) {
    next.requestClearance = true;
  }

  if (control === "grantClearance" && current.requestClearance) {
    next.requestClearance = false;
    delayed.push({
      delayMs: getRemoteDelay(),
      updates: [{ pieceId, state: serializeLineblockState({ ...next, lineFree: true }) }],
    });
  }

  return {
    immediate: [{ pieceId, state: serializeLineblockState(next) }],
    delayed,
  };
}

function planRouteAction(board: TestingBoardState, pieceId: string): TestingRuntimeOutcome {
  const piece = getPiece(board, pieceId);

  if (!piece) {
    return { immediate: [], delayed: [] };
  }

  return { immediate: [], delayed: [] };
}

export function getRuntimeDeviceKinds(pieceKey: string): RuntimeDeviceKind[] {
  const matches = deviceKindRules.flatMap((rule) => {
    if (rule.keys?.includes(pieceKey)) {
      return [rule.deviceKind];
    }

    if (rule.prefixes?.some((prefix) => pieceKey.startsWith(prefix))) {
      return [rule.deviceKind];
    }

    return [];
  });

  return matches.length > 0 ? matches : ["other"];
}

export function planRuntimeAction(board: TestingBoardState, action: TestingAction) {
  if (action.type === "selector") {
    return planSelectorAction(board, action.pieceId, action.direction);
  }

  if (action.type === "lineblock") {
    return planLineblockAction(board, action.pieceId, action.control);
  }

  if (action.type === "routeTrigger") {
    return planRouteAction(board, action.pieceId);
  }

  return { immediate: [], delayed: [] };
}
