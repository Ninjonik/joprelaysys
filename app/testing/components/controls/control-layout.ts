import type { CSSProperties, MouseEvent } from "react";
import type { PlacedPiece } from "../../../board-demo";
import type { ControlRect, PieceControl } from "./control-types";

export const hitboxClassName = "absolute inset-0 border-0 bg-transparent";
export const zoneClassName = "absolute cursor-pointer border-0 bg-transparent";

export function transformControlRect(rect: ControlRect, width: number, height: number, piece: PlacedPiece) {
  let left = rect.left;
  let top = rect.top;

  if (piece.rotation === 180) {
    left = width - left - rect.width;
    top = height - top - rect.height;
  }

  if (piece.mirrored) {
    left = width - left - rect.width;
  }

  return { left, top, width: rect.width, height: rect.height } as CSSProperties;
}

function getAreaKey(control: PieceControl) {
  if (!control.area) {
    return "hitbox";
  }

  const { left, top, width, height } = control.area;
  return `${left}:${top}:${width}:${height}`;
}

export function mergePieceControls(controls: PieceControl[]) {
  const groups = new Map<string, PieceControl[]>();

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
