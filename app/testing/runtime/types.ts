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
