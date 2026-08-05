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
