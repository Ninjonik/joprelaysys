"use client";

import type { ReactNode } from "react";

type PieceBounds = {
  width: number;
  height: number;
};

type BasePiece = {
  id: string;
  x: number;
  y: number;
};

type Props<TPiece extends BasePiece> = {
  pieces: TPiece[];
  tileSize: number;
  layerClassName: string;
  pieceClassName: string;
  selectedPieceId?: string | null;
  selectedPieceClassName?: string;
  getBounds: (piece: TPiece) => PieceBounds;
  getPieceClassName?: (piece: TPiece) => string | undefined;
  getTitle?: (piece: TPiece) => string | undefined;
  renderPiece: (piece: TPiece) => ReactNode;
};

export function PlacedPieceLayer<TPiece extends BasePiece>({
  pieces,
  tileSize,
  layerClassName,
  pieceClassName,
  selectedPieceId,
  selectedPieceClassName,
  getBounds,
  getPieceClassName,
  getTitle,
  renderPiece,
}: Props<TPiece>) {
  return (
    <div className={layerClassName}>
      {pieces.map((piece) => {
        const bounds = getBounds(piece);
        const extraClassName = getPieceClassName?.(piece);
        const selectedClassName = selectedPieceId && piece.id === selectedPieceId ? selectedPieceClassName : undefined;
        const className = [pieceClassName, selectedClassName, extraClassName].filter(Boolean).join(" ");

        return (
          <div
            key={piece.id}
            className={className}
            style={{
              left: piece.x * tileSize,
              top: piece.y * tileSize,
              width: bounds.width * tileSize,
              height: bounds.height * tileSize,
            }}
            title={getTitle?.(piece)}
          >
            {renderPiece(piece)}
          </div>
        );
      })}
    </div>
  );
}
