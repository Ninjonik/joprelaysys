import type { PieceControl, PieceControlContext } from "./control-types";

export function getRouteTriggerControls({ piece, runAction }: PieceControlContext): PieceControl[] {
  return [
    {
      title: "Route trigger placeholder",
      className: "cursor-pointer",
      onClick: () => runAction({ type: "routeTrigger", pieceId: piece.id }),
    },
  ];
}
