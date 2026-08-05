"use client";

import { catalog, type PlacedPiece } from "../../../board-demo";
import { getRuntimeDeviceKinds, isSelectorLocked, type RuntimeDeviceKind } from "../../runtime";
import { useTestingBoard } from "../../hooks/use-testing-board";
import {
  hitboxClassName,
  mergePieceControls,
  transformControlRect,
  zoneClassName,
} from "./control-layout";
import type { PieceControl, PieceControlContext } from "./control-types";
import { getLineblockControls } from "./lineblock-controls";
import { getRouteTriggerControls } from "./route-trigger-controls";
import { getSwitchSelectorControls } from "./switch-selector-controls";

type Props = {
  piece: PlacedPiece;
  tileSize: number;
};

const controlRenderers: Partial<Record<RuntimeDeviceKind, (context: PieceControlContext) => PieceControl[]>> = {
  switchSelector: getSwitchSelectorControls,
  lineblock: getLineblockControls,
  routeTrigger: getRouteTriggerControls,
};

export function TestingPieceControls({ piece, tileSize }: Props) {
  const { board, runAction } = useTestingBoard();
  const definition = catalog.pieces[piece.pieceKey];
  const width = definition.bounds.width * tileSize;
  const height = definition.bounds.height * tileSize;
  const context = {
    piece,
    runAction,
    selectorLocked: isSelectorLocked(board, piece.id),
    width,
    height,
  };

  const controls = getRuntimeDeviceKinds(piece.pieceKey).flatMap((kind) => controlRenderers[kind]?.(context) ?? []);

  if (controls.length === 0) {
    return null;
  }

  return mergePieceControls(controls).map((control) => (
    <button
      key={control.key}
      type="button"
      className={`${control.area ? zoneClassName : hitboxClassName}${control.className ? ` ${control.className}` : ""}`}
      style={control.area ? transformControlRect(control.area, width, height, piece) : undefined}
      title={control.title}
      aria-disabled={control.disabled}
      disabled={control.disabled}
      onClick={control.onClick}
      onContextMenu={control.onContextMenu}
    />
  ));
}
