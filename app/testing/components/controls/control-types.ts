import type { MouseEvent } from "react";
import type { PlacedPiece } from "../../../board-demo";
import type { TestingAction } from "../../runtime";

export type ControlRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type PieceControl = {
  area?: ControlRect;
  title: string;
  disabled?: boolean;
  className?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  onContextMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
};

export type PieceControlContext = {
  piece: PlacedPiece;
  runAction: (action: TestingAction) => void;
  selectorLocked: boolean;
  width: number;
  height: number;
};
