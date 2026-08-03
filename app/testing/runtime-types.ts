import type { PieceLink, PlacedPiece } from "../board-demo";

export type RuntimePiece = Pick<PlacedPiece, "id" | "pieceKey" | "state">;

export type RuntimeSnapshot = {
  pieces: RuntimePiece[];
  links: PieceLink[];
};

export type PieceStateUpdate = {
  pieceId: string;
  state: string;
};

export type SelectorDirection = "left" | "right";

export type ScheduledUpdate = {
  delayMs: number;
  updates: PieceStateUpdate[];
};

export type RuntimeOutcome = {
  immediate: PieceStateUpdate[];
  delayed: ScheduledUpdate[];
};

export type RuntimeAction =
  | { type: "selector"; pieceId: string; direction: SelectorDirection }
  | { type: "lineblock"; pieceId: string; control: LineblockControl };

export type LineblockControl =
  | "requestConsent"
  | "dispatchTrain"
  | "grantConsent"
  | "cancelConsent"
  | "confirmTrainEnd"
  | "grantClearance";

export type RuntimeDeviceKind =
  | "switchSelector"
  | "lineblock"
  | "signal"
  | "occupancySensor"
  | "shuntingSignal"
  | "other";

export type SwitchTarget = {
  pieceId: string;
  partIndex: number;
};
