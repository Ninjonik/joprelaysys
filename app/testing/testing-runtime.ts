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
    expected?: PieceStateUpdate[];
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
const ROUTE_TRIGGER_SELECTED_STATE = "armed";
const ROUTE_TRIGGER_IDLE_STATE = "idle";

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

function getPieceDefinition(piece: PlacedPiece) {
  return catalogData.pieces[piece.pieceKey];
}

function getStateModelKind(piece: PlacedPiece) {
  return getPieceDefinition(piece).stateModel.kind;
}

function getDefaultPieceState(piece: PlacedPiece) {
  const stateModel = getPieceDefinition(piece).stateModel;
  return "defaultState" in stateModel ? stateModel.defaultState : piece.state;
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

function clearReservedSwitchState(state: string) {
  return state
    .replace(/\.reserved/g, ".clear")
    .replace(/\.moving\.part[01]/g, ".clear");
}

function reserveSwitchState(piece: PlacedPiece) {
  if (piece.pieceKey.startsWith("switch.crossover")) {
    const current = parseCrossoverState(piece.state);
    current.top.aspect = "reserved";
    current.bottom.aspect = "reserved";
    return serializeCrossoverState(current);
  }

  const [route = "normal"] = piece.state.split(".");
  return `${route}.reserved`;
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

  for (const link of board.links) {
    if (routePieceIds.has(link.a.pieceId) && routePieceIds.has(link.b.pieceId)) {
      addGraphEdge(graph, link.a.pieceId, link.b.pieceId);
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

function planRouteAction(board: TestingBoardState, pieceId: string): TestingRuntimeOutcome {
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
