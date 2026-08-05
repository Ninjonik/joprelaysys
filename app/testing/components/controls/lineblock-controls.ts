import type { PieceControl, PieceControlContext } from "./control-types";

export function getLineblockControls({ piece, runAction, width, height }: PieceControlContext): PieceControl[] {
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
