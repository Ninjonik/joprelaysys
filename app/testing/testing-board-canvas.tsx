"use client";

import type { RefObject } from "react";
import { BoardSurface } from "../board/board-surface";
import { PlacedPieceLayer } from "../board/placed-piece-layer";
import { PiecePreview, catalog, type PieceLink, type PlacedPiece } from "../board-demo";
import styles from "./testing-board.module.css";
import { getRuntimeDeviceKind, type RuntimeAction } from "./simulation";
import { TestingPieceControls, buildTestingSnapshot } from "./testing-piece-controls";

type Props = {
  boardScrollerRef: RefObject<HTMLDivElement | null>;
  columns: number;
  rows: number;
  pieces: PlacedPiece[];
  links: PieceLink[];
  tileSize: number;
  runAction: (action: RuntimeAction) => void;
};

export function TestingBoardCanvas({ boardScrollerRef, columns, rows, pieces, links, tileSize, runAction }: Props) {
  const snapshot = buildTestingSnapshot(pieces, links);

  return (
    <div ref={boardScrollerRef} className={styles.boardScroller}>
      <BoardSurface columns={columns} rows={rows} tileSize={tileSize} className={styles.board}>
        <PlacedPieceLayer
          pieces={pieces}
          tileSize={tileSize}
          layerClassName={styles.pieces}
          pieceClassName={styles.piece}
          getBounds={(piece) => catalog.pieces[piece.pieceKey].bounds}
          getPieceClassName={(piece) => (getRuntimeDeviceKind(piece.pieceKey) !== "other" ? styles.pieceInteractive : undefined)}
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
                  tileSize={tileSize}
                />
                <TestingPieceControls piece={piece} tileSize={tileSize} snapshot={snapshot} runAction={runAction} />
              </>
            );
          }}
        />
      </BoardSurface>
    </div>
  );
}
