"use client";

import type { RefObject } from "react";
import { BoardSurface } from "../../board/board-surface";
import { PlacedPieceLayer } from "../../board/placed-piece-layer";
import { PiecePreview, catalog } from "../../board-demo";
import { getRuntimeDeviceKinds } from "../runtime";
import { useTestingBoard } from "../hooks/use-testing-board";
import { TestingPieceControls } from "./controls/testing-piece-controls";

type Props = {
  boardScrollerRef: RefObject<HTMLDivElement | null>;
};

export function TestingBoardCanvas({ boardScrollerRef }: Props) {
  const { board, pieces } = useTestingBoard();

  return (
    <div ref={boardScrollerRef} className="overflow-auto pb-0">
      <BoardSurface
        columns={board.columns}
        rows={board.rows}
        tileSize={board.tileSize}
        className="relative overflow-hidden rounded-[22px] border border-[rgba(30,45,42,0.14)] bg-[#b1b9b5] bg-[url('/assets/board/Board_1Square.svg')] bg-repeat"
      >
        <PlacedPieceLayer
          pieces={pieces}
          tileSize={board.tileSize}
          layerClassName="absolute inset-0"
          pieceClassName="absolute z-[2]"
          getBounds={(piece) => catalog.pieces[piece.pieceKey].bounds}
          getPieceClassName={(piece) => (getRuntimeDeviceKinds(piece.pieceKey).some((deviceKind) => deviceKind !== "other") ? "z-[4]" : undefined)}
          renderPiece={(piece) => {
            const definition = catalog.pieces[piece.pieceKey];

            return (
              <>
                <PiecePreview
                  pieceKey={piece.pieceKey}
                  piece={definition}
                  state={piece.state}
                  rotation={piece.rotation}
                  mirrored={piece.mirrored}
                  textSize={piece.textSize}
                  text={piece.text}
                  tileSize={board.tileSize}
                />
                <TestingPieceControls piece={piece} tileSize={board.tileSize} />
              </>
            );
          }}
        />
      </BoardSurface>
    </div>
  );
}
