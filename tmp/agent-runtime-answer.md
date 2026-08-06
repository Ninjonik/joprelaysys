# Answers for route/port transform questions and current runtime sources

Repo inspected: `C:\Users\admin\WebstormProjects\joprelaysys`

Date: 2026-08-05

## 1. Answers to the 4 open questions

### Q1: Does `mirrored: true` apply as an extra flip on top of the chosen `pieceKey` shape?

Yes. In the current editor/rendering code, `mirrored` is an additional horizontal/X-axis flip applied on top of whatever catalog `pieceKey` was chosen.

Important consequence: `pieceKey` and `mirrored` are independent. A catalog key like `switch.single.mirror` already selects the mirrored asset/geometry variant. Setting `mirrored: true` on that piece applies another horizontal flip on top of it.

So visually/math-wise:

- `switch.single` + `mirrored: true` is approximately the visual mirror of `switch.single`.
- `switch.single.mirror` + `mirrored: false` is the catalog mirror variant.
- `switch.single.mirror` + `mirrored: true` is effectively a double mirror visually.

Do not treat `mirrored` as a synonym for choosing `.mirror` in `pieceKey`. It is a transform flag.

Current evidence:

```ts
function transformLocalCell(cell: GridCell, width: number, height: number, rotation: PieceRotation, mirrored: PieceMirror) {
  const rotated = rotation === 180 ? rotateCell180(cell.x, cell.y, width, height) : cell;
  return mirrored ? mirrorCellX(rotated.x, rotated.y, width) : rotated;
}

function buildCssTransform(rotation: PieceRotation, mirrored: PieceMirror) {
  const transforms: string[] = [];

  if (rotation === 180) {
    transforms.push("rotate(180deg)");
  }

  if (mirrored) {
    transforms.push("scaleX(-1)");
  }

  return transforms.length > 0 ? transforms.join(" ") : undefined;
}
```

### Q2: Is 180° rotation a point-rotation around the bounding box center?

Yes.

For grid cells, the current formula is:

```ts
newX = width - 1 - x
newY = height - 1 - y
```

For SVG/overlay points, the current formula is:

```ts
newX = width - x
newY = height - y
```

Current evidence:

```ts
function rotatePoint180(x: number, y: number, width: number, height: number) {
  return {
    x: width - x,
    y: height - y,
  };
}

function rotateCell180(x: number, y: number, width: number, height: number) {
  return {
    x: width - 1 - x,
    y: height - 1 - y,
  };
}
```

### Q3: Order of operations: mirror-then-rotate, or rotate-then-mirror?

The explicit app math is rotate first, then mirror.

Current evidence:

```ts
function transformLocalCell(cell: GridCell, width: number, height: number, rotation: PieceRotation, mirrored: PieceMirror) {
  const rotated = rotation === 180 ? rotateCell180(cell.x, cell.y, width, height) : cell;
  return mirrored ? mirrorCellX(rotated.x, rotated.y, width) : rotated;
}

function transformOverlayPoint(x: number, y: number, width: number, height: number, rotation: PieceRotation, mirrored: PieceMirror) {
  const rotated = rotation === 180 ? rotatePoint180(x, y, width, height) : { x, y };
  return mirrored ? mirrorPointX(rotated.x, rotated.y, width) : rotated;
}
```

For port side labels, applying the same order means:

- rotation 180 only: `north <-> south`, `east <-> west`
- mirror X only: `east <-> west`, `north/south` unchanged
- rotation 180 then mirror X: `north <-> south`, `east/west` end up unchanged

### Q4: Do ports transform the same way occupied cells do?

There is no first-class "port" object in the current runtime yet.

The closest existing model is switch linkable part cells in `app/board-demo.tsx`. Those cells do transform using the same `transformLocalCell(...)` logic: rotate first, then mirror.

So for new port work, the safest/current-consistent rule is:

- port coordinates should transform the same way as occupied/linkable cells;
- port side/direction should transform consistently with the same rotate-then-mirror operation;
- do not copy `route-actions.ts` as-is for transform-aware geometry, because its current `getPieceOccupiedCells(...)` ignores `rotation` and `mirrored`.

Current runtime route graph function that ignores transforms:

```ts
function getPieceOccupiedCells(piece: PlacedPiece) {
  const definition = getPieceDefinition(piece);
  return definition.occupied.map(([offsetX, offsetY]) => ({
    x: piece.x + offsetX,
    y: piece.y + offsetY,
  }));
}
```

Current editor/linkable switch-part code that does account for transforms:

```ts
const cells = localCells.map((cell) => {
  const transformed = transformLocalCell(
    cell,
    definition.bounds.width,
    definition.bounds.height,
    placedPiece.rotation,
    placedPiece.mirrored,
  );

  return {
    x: placedPiece.x + transformed.x,
    y: placedPiece.y + transformed.y,
  };
});
```

## Switch state / selector mapping currently encoded

In `app/testing/runtime/switch-actions.ts`:

```ts
function getRequestedRoute(direction: SelectorDirection) {
  return direction === "left" ? "normal" : "reverse";
}
```

So:

- selector left-click / `direction: "left"` means switch route `"normal"`
- selector right-click / `direction: "right"` means switch route `"reverse"`

For crossover switches:

```ts
const section = partIndex === 0 ? "top" : "bottom";
```

So:

- `partIndex: 0` means `top`
- `partIndex: 1` means `bottom`

For normal non-crossover switches, the route is global to the switch state; `partIndex` is only used while building temporary moving states like:

```ts
return `${route}.moving.part${partIndex}`;
```

Reservation does not choose a new branch. It preserves the current route and changes the aspect to reserved:

```ts
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
```

Catalog state labels:

- `switch.single`: `normal` = `1 to 2`, `reverse` = `1 to 3`
- `switch.extended`: `normal` = `1 to 3`, `reverse` = `1 to 2`, `stem` = `1 only`

## Current source files requested

### `app/testing/runtime/piece-catalog.ts`

```ts
import catalogData from "../../data/piece-catalog.json";
import type { PlacedPiece } from "../../board-demo";

export function getPieceDefinition(piece: PlacedPiece) {
  return catalogData.pieces[piece.pieceKey];
}

export function getStateModelKind(piece: PlacedPiece) {
  return getPieceDefinition(piece).stateModel.kind;
}

export function getDefaultPieceState(piece: PlacedPiece) {
  const stateModel = getPieceDefinition(piece).stateModel;
  return "defaultState" in stateModel ? stateModel.defaultState : piece.state;
}
```

### `app/testing/runtime/board-state.ts`

```ts
import catalogData from "../../data/piece-catalog.json";
import type { PieceLink, PlacedPiece } from "../../board-demo";
import type {
  CellPieceId,
  PieceStateUpdate,
  TestingBoardCell,
  TestingBoardRecord,
  TestingBoardRecordInput,
  TestingBoardState,
} from "./types";

export const TESTING_BOARD_TILE = 42;

function createCells(columns: number, rows: number): TestingBoardCell[][] {
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
      tileSize: TESTING_BOARD_TILE,
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
      tileSize: Number.isFinite(input.tileSize) ? input.tileSize : TESTING_BOARD_TILE,
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
```

### `app/testing/runtime/device-kinds.ts`

```ts
import type { RuntimeDeviceKind } from "./types";

type DeviceKindRule = {
  deviceKind: RuntimeDeviceKind;
  keys?: string[];
  prefixes?: string[];
};

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
```

### `app/testing/runtime/switch-actions.ts`

```ts
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
```

### `app/testing/runtime/types.ts`

```ts
import type { PieceLink, PlacedPiece } from "../../board-demo";

export type CellPieceId = string | null;

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
```

## Additional current source context: placed piece/link shapes

From `app/board-demo.tsx`:

```ts
export type PieceRotation = 0 | 180;
export type PieceMirror = boolean;

export type PlacedPiece = {
  id: string;
  pieceKey: PieceKey;
  x: number;
  y: number;
  state: string;
  rotation: PieceRotation;
  mirrored: PieceMirror;
  text?: PieceText;
  textSize?: PieceTextSize;
};

type LinkEndpointKind = "selector" | "switchPart" | "lineblock" | "track";

type LinkEndpoint = {
  pieceId: string;
  kind: LinkEndpointKind;
  partIndex: number;
};

export type PieceLink = {
  a: LinkEndpoint;
  b: LinkEndpoint;
};
```

## Caution for implementing transform-aware routing

Current `/testing/runtime/route-actions.ts` does not transform occupied cells by `rotation` or `mirrored`. It reads catalog occupied offsets directly.

Current `/testing/runtime/board-state.ts` also marks every bounding-box cell as belonging to the piece, not only occupied cells, and also ignores `rotation`/`mirrored` for occupancy indexing.

If route ports are being added, they should probably use a shared transform helper rather than duplicating the stale/untransformed `getPieceOccupiedCells(...)` currently inside `route-actions.ts`.
