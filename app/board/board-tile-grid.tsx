"use client";

type GridCell = {
  x: number;
  y: number;
};

type Props = {
  columns: number;
  rows: number;
  showGrid: boolean;
  showTileCoords: boolean;
  selectedCells: GridCell[];
  className: string;
  hiddenClassName: string;
  tileClassName: string;
  selectedTileClassName: string;
  coordClassName: string;
  onTileClick: (cell: GridCell, event: React.MouseEvent<HTMLButtonElement>) => void;
  onTilePointerDown?: (cell: GridCell, event: React.PointerEvent<HTMLButtonElement>) => void;
  onTilePointerEnter?: (cell: GridCell, event: React.PointerEvent<HTMLButtonElement>) => void;
  onTilePointerUp?: (cell: GridCell, event: React.PointerEvent<HTMLButtonElement>) => void;
  onTileContextMenu?: (cell: GridCell, event: React.MouseEvent<HTMLButtonElement>) => void;
};

function isSelected(selectedCells: GridCell[], cell: GridCell) {
  return selectedCells.some((entry) => entry.x === cell.x && entry.y === cell.y);
}

export function BoardTileGrid({
  columns,
  rows,
  showGrid,
  showTileCoords,
  selectedCells,
  className,
  hiddenClassName,
  tileClassName,
  selectedTileClassName,
  coordClassName,
  onTileClick,
  onTilePointerDown,
  onTilePointerEnter,
  onTilePointerUp,
  onTileContextMenu,
}: Props) {
  return (
    <div className={`${className} ${!showGrid ? hiddenClassName : ""}`}>
      {Array.from({ length: rows * columns }, (_, index) => {
        const x = index % columns;
        const y = Math.floor(index / columns);
        const cell = { x, y };

        return (
          <button
            key={`${x}-${y}`}
            type="button"
            className={`${tileClassName} ${isSelected(selectedCells, cell) ? selectedTileClassName : ""}`}
            onClick={(event) => onTileClick(cell, event)}
            onPointerDown={onTilePointerDown ? (event) => onTilePointerDown(cell, event) : undefined}
            onPointerEnter={onTilePointerEnter ? (event) => onTilePointerEnter(cell, event) : undefined}
            onPointerUp={onTilePointerUp ? (event) => onTilePointerUp(cell, event) : undefined}
            onContextMenu={onTileContextMenu ? (event) => onTileContextMenu(cell, event) : undefined}
            aria-label={`Tile ${x}, ${y}`}
          >
            {showTileCoords ? <span className={coordClassName}>{x},{y}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
