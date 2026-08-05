"use client";

import { useEffect } from "react";
import { TestingBoardCanvas } from "./testing-board-canvas";
import { TestingBoardProvider, useTestingBoard } from "./use-testing-board";

function TestingBoardView() {
  const {
    boardScrollerRef,
    board,
    setTileSize,
    handleImportFile,
  } = useTestingBoard();

  useEffect(() => {
    const element = boardScrollerRef.current;

    if (!element) {
      return;
    }

    function updateTileSize() {
      if (!boardScrollerRef.current) {
        return;
      }

      const availableWidth = boardScrollerRef.current.clientWidth;

      if (availableWidth <= 0 || board.columns <= 0) {
        return;
      }

      setTileSize(Math.max(28, Math.floor(availableWidth / board.columns)));
    }

    updateTileSize();

    const observer = new ResizeObserver(updateTileSize);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [board.columns, boardScrollerRef, setTileSize]);

  return (
    <main
      className="min-h-screen min-h-dvh bg-[radial-gradient(circle_at_top_left,rgba(250,240,201,0.45),transparent_24%),linear-gradient(135deg,#cfd7cf_0%,#aeb8b2_42%,#8d9a97_100%)] p-3 text-[#12201e]"
      onContextMenu={(event) => {
        event.preventDefault();
      }}
    >
      <div className="w-full">
        <section className="rounded-3xl border border-[rgba(29,45,41,0.12)] bg-[rgba(240,242,238,0.92)] p-3 backdrop-blur-[10px]">
          <header className="mb-2.5 flex justify-end">
            <input
              id="testing-json-file"
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
            />
            <label
              htmlFor="testing-json-file"
              className="inline-flex h-9 cursor-pointer items-center rounded-full bg-[rgba(23,37,34,0.9)] px-[13px] text-[0.8rem] font-bold text-[#eef2ef]"
            >
              Import File
            </label>
          </header>

          <TestingBoardCanvas
            boardScrollerRef={boardScrollerRef}
          />
        </section>
      </div>
    </main>
  );
}

export default function TestingBoard() {
  return (
    <TestingBoardProvider>
      <TestingBoardView />
    </TestingBoardProvider>
  );
}
