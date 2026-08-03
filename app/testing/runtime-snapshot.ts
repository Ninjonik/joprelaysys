import type { PieceLink, PlacedPiece } from "../board-demo";
import type { RuntimeSnapshot, SwitchTarget } from "./runtime-types";

export function buildRuntimeSnapshot(pieces: PlacedPiece[], links: PieceLink[]): RuntimeSnapshot {
  return {
    pieces: pieces.map(({ id, pieceKey, state }) => ({ id, pieceKey, state })),
    links,
  };
}

export function getPiece(snapshot: RuntimeSnapshot, pieceId: string) {
  return snapshot.pieces.find((piece) => piece.id === pieceId) ?? null;
}

export function getLinkedSwitchTargets(snapshot: RuntimeSnapshot, selectorId: string): SwitchTarget[] {
  return snapshot.links.flatMap((link) => {
    if (link.a.pieceId === selectorId && link.a.kind === "selector" && link.b.kind === "switchPart") {
      return [{ pieceId: link.b.pieceId, partIndex: link.b.partIndex }];
    }

    if (link.b.pieceId === selectorId && link.b.kind === "selector" && link.a.kind === "switchPart") {
      return [{ pieceId: link.a.pieceId, partIndex: link.a.partIndex }];
    }

    return [];
  });
}

