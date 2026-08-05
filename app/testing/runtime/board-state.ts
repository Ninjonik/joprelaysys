import catalogData from "../../data/piece-catalog.json";
import type { PieceLink, PlacedPiece } from "../../board-demo";
import type {
  CellPieceId,
  PieceStateUpdate,
  TestingBoardCell,
  TestingBoardRecord,
  TestingBoardRecordInput,
  TestingBoardState,
} from "./types";

export const TESTING_BOARD_TILE = 42;

function createCells(columns: number, rows: number): TestingBoardCell[][] {
  return Array.from({ length: rows }, (_, y) =>
    Array.from({ length: columns }, (_, x) => ({
      x,
      y,
      pieceId: null as CellPieceId,
    })),
  );
}

export function createTestingBoardState({
  columns,
  rows,
  tileSize,
  pieces,
  links,
}: {
  columns: number;
  rows: number;
  tileSize: number;
  pieces: PlacedPiece[];
  links: PieceLink[];
}): TestingBoardState {
  const cells = createCells(columns, rows);
  const piecesById: Record<string, PlacedPiece> = {};
  const pieceIds: string[] = [];

  for (const piece of pieces) {
    piecesById[piece.id] = piece;
    pieceIds.push(piece.id);

    const bounds = catalogData.pieces[piece.pieceKey].bounds;

    for (let dy = 0; dy < bounds.height; dy += 1) {
      for (let dx = 0; dx < bounds.width; dx += 1) {
        const x = piece.x + dx;
        const y = piece.y + dy;

        if (y >= 0 && y < rows && x >= 0 && x < columns) {
          cells[y]![x] = { x, y, pieceId: piece.id };
        }
      }
    }
  }

  return {
    columns,
    rows,
    tileSize,
    cells,
    piecesById,
    pieceIds,
    links,
  };
}

export function createTestingBoardStateFromRecord(record: TestingBoardRecord, tileSize: number) {
  return { ...record, tileSize };
}

export function getBoardPieces(board: TestingBoardState) {
  return board.pieceIds.map((pieceId) => board.piecesById[pieceId]).filter(Boolean);
}

export function createEmptyTestingBoardRecord(): TestingBoardRecord {
  return {
    ...createTestingBoardState({
      columns: 24,
      rows: 14,
      tileSize: TESTING_BOARD_TILE,
      pieces: [],
      links: [],
    }),
    revision: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function sanitizeTestingBoardRecordInput(input: TestingBoardRecordInput, revision: number): TestingBoardRecord {
  const pieces = getBoardPieces(input);

  return {
    ...createTestingBoardState({
      columns: Number.isFinite(input.columns) ? input.columns : 24,
      rows: Number.isFinite(input.rows) ? input.rows : 14,
      tileSize: Number.isFinite(input.tileSize) ? input.tileSize : TESTING_BOARD_TILE,
      pieces,
      links: Array.isArray(input.links) ? input.links : [],
    }),
    revision,
    updatedAt: new Date().toISOString(),
  };
}

export function applyBoardRecordStateUpdates(record: TestingBoardRecord, updates: PieceStateUpdate[]) {
  if (updates.length === 0) {
    return record;
  }

  const updateMap = new Map(updates.map((update) => [update.pieceId, update.state]));
  let changed = false;
  const piecesById = { ...record.piecesById };

  for (const [pieceId, piece] of Object.entries(piecesById)) {
    const nextState = updateMap.get(pieceId);

    if (!nextState || nextState === piece.state) {
      continue;
    }

    piecesById[pieceId] = { ...piece, state: nextState };
    changed = true;
  }

  return changed
    ? {
        ...record,
        piecesById,
        revision: record.revision + 1,
        updatedAt: new Date().toISOString(),
      }
    : record;
}

export function getPiece(board: TestingBoardState, pieceId: string) {
  return board.piecesById[pieceId] ?? null;
}

export function applyBoardStateUpdates(board: TestingBoardState, updates: PieceStateUpdate[]) {
  if (updates.length === 0) {
    return board;
  }

  const nextPiecesById = { ...board.piecesById };
  let changed = false;

  for (const update of updates) {
    const piece = nextPiecesById[update.pieceId];

    if (!piece || piece.state === update.state) {
      continue;
    }

    nextPiecesById[update.pieceId] = { ...piece, state: update.state };
    changed = true;
  }

  return changed ? { ...board, piecesById: nextPiecesById } : board;
}
