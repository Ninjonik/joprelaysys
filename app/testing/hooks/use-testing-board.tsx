"use client";

import type { ChangeEvent, PropsWithChildren, RefObject } from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { BOARD_TILE, INITIAL_COLUMNS, INITIAL_ROWS, parseImportedPieces } from "../../board-demo";
import {
  createTestingBoardState,
  createTestingBoardStateFromRecord,
  getBoardPieces,
  type TestingAction,
  type TestingBoardRecord,
  type TestingBoardState,
} from "../runtime";
import {
  readTestingBoardAction,
  replaceTestingBoardAction,
  runTestingActionAction,
} from "../actions/testing-board-actions";

type TestingBoardContextValue = {
  board: TestingBoardState;
  pieces: ReturnType<typeof getBoardPieces>;
  boardScrollerRef: RefObject<HTMLDivElement | null>;
  setTileSize: (tileSize: number) => void;
  runAction: (action: TestingAction) => void;
  handleImportFile: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
};

const TestingBoardContext = createContext<TestingBoardContextValue | null>(null);

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
  const boardScrollerRef = useRef<HTMLDivElement | null>(null);
  const remoteRevisionRef = useRef<number>(-1);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(
    () => () => {
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

  function runAction(action: TestingAction) {
    void (async () => {
      const record = await runTestingActionAction(action);

      if (record.revision >= remoteRevisionRef.current) {
        replaceBoardFromRecord(record);
      }
    })();
  }

  function setTileSize(tileSize: number) {
    updateBoard((current) => (current.tileSize === tileSize ? current : { ...current, tileSize }));
  }

  useEffect(() => {
    let cancelled = false;

    async function startSync() {
      const record = await readTestingBoardAction();

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
          const nextRecord = await readTestingBoardAction();

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

    const imported = parseImportedPieces(await file.text());
    const nextBoard = createTestingBoardState({
      columns: imported.columns,
      rows: imported.rows,
      tileSize: boardRef.current.tileSize,
      pieces: imported.pieces,
      links: imported.links,
    });
    const record = await replaceTestingBoardAction(nextBoard);
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
