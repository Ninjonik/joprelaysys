"use client";

import type { CSSProperties, MouseEvent } from "react";
import { catalog, type PlacedPiece } from "../board-demo";
import {
  getRuntimeDeviceKinds,
  isSelectorLocked,
  type RuntimeDeviceKind,
  type TestingAction,
} from "./testing-runtime";
import { useTestingBoard } from "./use-testing-board";

type Props = {
  piece: PlacedPiece;
  tileSize: number;
};

type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type Control = {
  area?: Rect;
  title: string;
  disabled?: boolean;
  className?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  onContextMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
};

type ControlContext = {
  piece: PlacedPiece;
  runAction: (action: TestingAction) => void;
  selectorLocked: boolean;
  width: number;
  height: number;
};

const hitboxClassName = "absolute inset-0 border-0 bg-transparent";
const zoneClassName = "absolute cursor-pointer border-0 bg-transparent";

function transformRect(rect: Rect, width: number, height: number, piece: PlacedPiece) {
  let left = rect.left;
  let top = rect.top;

  if (piece.rotation === 180) {
    left = width - left - rect.width;
    top = height - top - rect.height;
  }

  if (piece.mirrored) {
    left = width - left - rect.width;
  }

  return { left, top, width: rect.width, height: rect.height };
}

function getSelectorControls({ piece, runAction, selectorLocked }: ControlContext): Control[] {
  return [
    {
      title: selectorLocked ? "Switch is moving" : "Left click sets the linked switch to normal. Right click sets it to reverse.",
      disabled: selectorLocked,
      className: selectorLocked ? "cursor-default" : "cursor-pointer",
      onClick: () => {
        if (!selectorLocked) {
          runAction({ type: "selector", pieceId: piece.id, direction: "left" });
        }
      },
      onContextMenu: (event) => {
        event.preventDefault();
        if (!selectorLocked) {
          runAction({ type: "selector", pieceId: piece.id, direction: "right" });
        }
      },
    },
  ];
}

function getLineblockControls({ piece, runAction, width, height }: ControlContext): Control[] {
  const columnWidth = width / 3;
  const rowHeight = height / 2;

  return [
    {
      area: { left: columnWidth * 2, top: 0, width: columnWidth, height: rowHeight },
      title: "Simulate receiving tratovy souhlas from the remote station after a short delay",
      onClick: () => runAction({ type: "lineblock", pieceId: piece.id, control: "requestConsent" }),
    },
    {
      area: { left: columnWidth, top: 0, width: columnWidth, height: rowHeight },
      title: "Dispatch a train into the line after prijem souhlasu",
      onClick: () => runAction({ type: "lineblock", pieceId: piece.id, control: "dispatchTrain" }),
    },
    {
      area: { left: columnWidth, top: rowHeight, width: columnWidth, height: rowHeight },
      title: "Tratovy souhlas. Left click grants consent, right click cancels it.",
      onClick: () => runAction({ type: "lineblock", pieceId: piece.id, control: "grantConsent" }),
      onContextMenu: (event) => {
        event.preventDefault();
        runAction({ type: "lineblock", pieceId: piece.id, control: "cancelConsent" });
      },
    },
    {
      area: { left: 0, top: rowHeight, width: columnWidth, height: rowHeight },
      title: "Konec vlaku helper",
      onClick: () => runAction({ type: "lineblock", pieceId: piece.id, control: "confirmTrainEnd" }),
    },
    {
      area: { left: columnWidth * 2, top: rowHeight, width: columnWidth, height: rowHeight },
      title: "Udeleni odhlasky",
      onClick: () => runAction({ type: "lineblock", pieceId: piece.id, control: "grantClearance" }),
    },
  ];
}

function getRouteTriggerControls({ piece, runAction }: ControlContext): Control[] {
  return [
    {
      title: "Route trigger placeholder",
      className: "cursor-pointer",
      onClick: () => runAction({ type: "routeTrigger", pieceId: piece.id }),
    },
  ];
}

const controlRenderers: Partial<Record<RuntimeDeviceKind, (context: ControlContext) => Control[]>> = {
  switchSelector: getSelectorControls,
  lineblock: getLineblockControls,
  routeTrigger: getRouteTriggerControls,
};

function getAreaKey(control: Control) {
  if (!control.area) {
    return "hitbox";
  }

  const { left, top, width, height } = control.area;
  return `${left}:${top}:${width}:${height}`;
}

function mergeControls(controls: Control[]) {
  const groups = new Map<string, Control[]>();

  for (const control of controls) {
    const key = getAreaKey(control);
    const current = groups.get(key);

    if (current) {
      current.push(control);
    } else {
      groups.set(key, [control]);
    }
  }

  return Array.from(groups.values()).map((group) => {
    const first = group[0];
    if (!first) {
      throw new Error("Missing control group");
    }

    return {
      key: getAreaKey(first),
      area: first.area,
      title: group.map((control) => control.title).join(" | "),
      disabled: group.every((control) => control.disabled),
      className: group.map((control) => control.className).filter(Boolean).join(" "),
      onClick: (event: MouseEvent<HTMLButtonElement>) => {
        for (const control of group) {
          control.onClick?.(event);
        }
      },
      onContextMenu: (event: MouseEvent<HTMLButtonElement>) => {
        for (const control of group) {
          control.onContextMenu?.(event);
        }
      },
    };
  });
}

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

  return mergeControls(controls).map((control) => (
    <button
      key={control.key}
      type="button"
      className={`${control.area ? zoneClassName : hitboxClassName}${control.className ? ` ${control.className}` : ""}`}
      style={control.area ? (transformRect(control.area, width, height, piece) as CSSProperties) : undefined}
      title={control.title}
      aria-disabled={control.disabled}
      onClick={control.onClick}
      onContextMenu={control.onContextMenu}
    />
  ));
}
