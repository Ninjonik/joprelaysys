"use client";

import type { ChangeEvent, PropsWithChildren, RefObject } from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { BOARD_TILE, INITIAL_COLUMNS, INITIAL_ROWS, parseImportedPieces } from "../board-demo";
import {
  applyBoardStateUpdates,
  createTestingBoardStateFromRecord,
  createTestingBoardState,
  getBoardPieces,
  planRuntimeAction,
  type PieceStateUpdate,
  type TestingAction,
  type TestingBoardRecord,
  type TestingBoardRecordInput,
  type TestingBoardState,
  type TestingRuntimeOutcome,
} from "./testing-runtime";

type TestingBoardContextValue = {
  board: TestingBoardState;
  pieces: ReturnType<typeof getBoardPieces>;
  boardScrollerRef: RefObject<HTMLDivElement | null>;
  setTileSize: (tileSize: number) => void;
  runAction: (action: TestingAction) => void;
  handleImportFile: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
};

const TestingBoardContext = createContext<TestingBoardContextValue | null>(null);

async function readBoardRecord() {
  const response = await fetch("/api/testing-board", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Failed to load testing board");
  }

  return (await response.json()) as TestingBoardRecord;
}

async function resetBoardRecord() {
  const response = await fetch("/api/testing-board", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "reset" }),
  });

  if (!response.ok) {
    throw new Error("Failed to reset testing board");
  }

  return (await response.json()) as TestingBoardRecord;
}

async function replaceBoardRecord(board: TestingBoardRecordInput) {
  const response = await fetch("/api/testing-board", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "replace", board }),
  });

  if (!response.ok) {
    throw new Error("Failed to replace testing board");
  }

  return (await response.json()) as TestingBoardRecord;
}

async function publishStateUpdates(updates: PieceStateUpdate[]) {
  if (updates.length === 0) {
    return null;
  }

  const response = await fetch("/api/testing-board", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "stateUpdates", updates }),
  });

  if (!response.ok) {
    throw new Error("Failed to update testing board");
  }

  return (await response.json()) as TestingBoardRecord;
}

function clearTimers(timers: Set<number>) {
  for (const timer of timers) {
    window.clearTimeout(timer);
  }

  timers.clear();
}

function useBoardState() {
  const [board, setBoard] = useState(() =>
    createTestingBoardState({
      columns: INITIAL_COLUMNS,
      rows: INITIAL_ROWS,
      tileSize: BOARD_TILE,
      pieces: [],
      links: [],
    }),
  );
  const boardRef = useRef(board);
  const timersRef = useRef(new Set<number>());
  const boardScrollerRef = useRef<HTMLDivElement | null>(null);
  const remoteRevisionRef = useRef<number>(-1);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(
    () => () => {
      clearTimers(timersRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    },
    [],
  );

  function updateBoard(updater: (current: TestingBoardState) => TestingBoardState) {
    setBoard((current) => {
      const next = updater(current);
      boardRef.current = next;
      return next;
    });
  }

  const replaceBoardFromRecord = useCallback((record: TestingBoardRecord) => {
    remoteRevisionRef.current = record.revision;
    updateBoard((current) => createTestingBoardStateFromRecord(record, current.tileSize));
  }, []);

  async function pushStateUpdates(updates: PieceStateUpdate[]) {
    const record = await publishStateUpdates(updates);

    if (record) {
      remoteRevisionRef.current = record.revision;
    }
  }

  function runOutcome(outcome: TestingRuntimeOutcome) {
    if (outcome.immediate.length > 0) {
      updateBoard((current) => applyBoardStateUpdates(current, outcome.immediate));
      void pushStateUpdates(outcome.immediate);
    }

    for (const delayed of outcome.delayed) {
      const timer = window.setTimeout(() => {
        updateBoard((current) => applyBoardStateUpdates(current, delayed.updates));
        timersRef.current.delete(timer);
        void pushStateUpdates(delayed.updates);
      }, delayed.delayMs);

      timersRef.current.add(timer);
    }
  }

  function runAction(action: TestingAction) {
    runOutcome(planRuntimeAction(boardRef.current, action));
  }

  function setTileSize(tileSize: number) {
    updateBoard((current) => (current.tileSize === tileSize ? current : { ...current, tileSize }));
  }

  useEffect(() => {
    let cancelled = false;

    async function startSync() {
      const record = await resetBoardRecord();

      if (cancelled) {
        return;
      }

      replaceBoardFromRecord(record);
      const eventSource = new EventSource("/api/testing-board/events");
      eventSourceRef.current = eventSource;

      eventSource.addEventListener("board", (event) => {
        const nextRecord = JSON.parse((event as MessageEvent<string>).data) as TestingBoardRecord;

        if (nextRecord.revision !== remoteRevisionRef.current) {
          replaceBoardFromRecord(nextRecord);
        }
      });

      eventSource.addEventListener("error", () => {
        void (async () => {
          const nextRecord = await readBoardRecord();

          if (nextRecord.revision !== remoteRevisionRef.current) {
            replaceBoardFromRecord(nextRecord);
          }
        })();
      });
    }

    void startSync();

    return () => {
      cancelled = true;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [replaceBoardFromRecord]);

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    clearTimers(timersRef.current);

    const imported = parseImportedPieces(await file.text());
    const record = await replaceBoardRecord({
      columns: imported.columns,
      rows: imported.rows,
      pieces: imported.pieces,
      links: imported.links,
    });
    replaceBoardFromRecord(record);

    event.target.value = "";
  }

  return {
    board,
    pieces: getBoardPieces(board),
    boardScrollerRef,
    setTileSize,
    runAction,
    handleImportFile,
  };
}

export function TestingBoardProvider({ children }: PropsWithChildren) {
  const value = useBoardState();

  return <TestingBoardContext.Provider value={value}>{children}</TestingBoardContext.Provider>;
}

export function useTestingBoard() {
  const context = useContext(TestingBoardContext);

  if (!context) {
    throw new Error("useTestingBoard must be used inside TestingBoardProvider");
  }

  return context;
}
