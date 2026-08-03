"use client";

import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  BOARD_TILE,
  INITIAL_COLUMNS,
  INITIAL_ROWS,
  parseImportedPieces,
  type PieceLink,
  type PlacedPiece,
} from "../board-demo";
import { buildRuntimeSnapshot } from "./runtime-snapshot";
import { planRuntimeAction, type RuntimeAction, type RuntimeOutcome } from "./simulation";

const activeTimers = new Set<number>();

function applyPieceStateUpdates(pieces: PlacedPiece[], updates: RuntimeOutcome["immediate"]) {
  if (updates.length === 0) {
    return pieces;
  }

  const updateMap = new Map(updates.map((update) => [update.pieceId, update.state]));
  return pieces.map((piece) => {
    const nextState = updateMap.get(piece.id);
    return nextState ? { ...piece, state: nextState } : piece;
  });
}

export function useTestingBoard() {
  const [columns, setColumns] = useState(INITIAL_COLUMNS);
  const [rows, setRows] = useState(INITIAL_ROWS);
  const [pieces, setPieces] = useState<PlacedPiece[]>([]);
  const [links, setLinks] = useState<PieceLink[]>([]);
  const [tileSize, setTileSize] = useState(BOARD_TILE);
  const boardScrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => () => {
    for (const timer of activeTimers) {
      window.clearTimeout(timer);
    }
    activeTimers.clear();
  }, []);

  function clearTimers() {
    for (const timer of activeTimers) {
      window.clearTimeout(timer);
    }
    activeTimers.clear();
  }

  function runOutcome(outcome: RuntimeOutcome) {
    setPieces((current) => applyPieceStateUpdates(current, outcome.immediate));

    for (const delayed of outcome.delayed) {
      const timer = window.setTimeout(() => {
        setPieces((current) => applyPieceStateUpdates(current, delayed.updates));
        activeTimers.delete(timer);
      }, delayed.delayMs);
      activeTimers.add(timer);
    }
  }

  function runAction(action: RuntimeAction) {
    runOutcome(planRuntimeAction(buildRuntimeSnapshot(pieces, links), action));
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    clearTimers();
    const imported = parseImportedPieces(await file.text());
    setColumns(imported.columns);
    setRows(imported.rows);
    setPieces(imported.pieces);
    setLinks(imported.links);
    event.target.value = "";
  }

  return {
    boardScrollerRef,
    columns,
    rows,
    pieces,
    links,
    tileSize,
    setTileSize,
    runAction,
    handleImportFile,
  };
}

