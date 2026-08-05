import type { PieceControl, PieceControlContext } from "./control-types";

export function getSwitchSelectorControls({ piece, runAction, selectorLocked }: PieceControlContext): PieceControl[] {
  return [
    {
      title: selectorLocked ? "Switch is moving" : "Left click sets the linked switch to normal. Right click sets it to reverse.",
      disabled: selectorLocked,
      className: selectorLocked ? "pointer-events-none cursor-default" : "cursor-pointer",
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
