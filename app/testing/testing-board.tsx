"use client";

import { useEffect } from "react";
import styles from "./testing-board.module.css";
import { TestingBoardCanvas } from "./testing-board-canvas";
import { useTestingBoard } from "./use-testing-board";

export default function TestingBoard() {
  const {
    boardScrollerRef,
    columns,
    rows,
    pieces,
    links,
    tileSize,
    setTileSize,
    runAction,
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

      if (availableWidth <= 0 || columns <= 0) {
        return;
      }

      setTileSize(Math.max(28, Math.floor(availableWidth / columns)));
    }

    updateTileSize();

    const observer = new ResizeObserver(updateTileSize);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [boardScrollerRef, columns, setTileSize]);

  return (
    <main
      className={styles.page}
      onContextMenu={(event) => {
        event.preventDefault();
      }}
    >
      <div className={styles.shell}>
        <section className={styles.panel}>
          <header className={styles.header}>
            <input
              id="testing-json-file"
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className={styles.hiddenInput}
            />
            <label htmlFor="testing-json-file" className={styles.button}>
              Import File
            </label>
          </header>

          <TestingBoardCanvas
            boardScrollerRef={boardScrollerRef}
            columns={columns}
            rows={rows}
            pieces={pieces}
            links={links}
            tileSize={tileSize}
            runAction={runAction}
          />
        </section>
      </div>
    </main>
  );
}
