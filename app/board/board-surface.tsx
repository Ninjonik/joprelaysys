"use client";

import type { CSSProperties, ReactNode } from "react";

type Props = {
  columns: number;
  rows: number;
  tileSize: number;
  className: string;
  children: ReactNode;
};

export function BoardSurface({ columns, rows, tileSize, className, children }: Props) {
  return (
    <div
      className={className}
      style={
        {
          width: columns * tileSize,
          height: rows * tileSize,
          backgroundSize: `${tileSize}px ${tileSize}px`,
          "--board-columns": columns,
          "--board-rows": rows,
          "--board-tile": `${tileSize}px`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
