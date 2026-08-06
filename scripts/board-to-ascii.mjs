import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const inputPath = resolve(process.argv[2] ?? "test.json");
const outputPath = process.argv[3] ? resolve(process.argv[3]) : null;

const raw = readFileSync(inputPath, "utf8").trim();

if (!raw) {
  throw new Error(`Input file is empty: ${inputPath}`);
}

const data = JSON.parse(raw);
const catalog = JSON.parse(readFileSync(resolve("app/data/piece-catalog.json"), "utf8"));
const columns = Number(data.columns ?? data.board?.columns ?? 24);
const rows = Number(data.rows ?? data.board?.rows ?? 14);
const instances = Array.isArray(data.instances) ? data.instances : [];
const cells = Array.isArray(data.cells) ? data.cells : [];
const piecesById = data.piecesById && typeof data.piecesById === "object" ? data.piecesById : {};

const charMap = new Map([
  ["track.main", "T"],
  ["track.main.noocp", "t"],
  ["track.sign", "S"],
  ["track.sign.noocp", "s"],
  ["switch.extended", "E"],
  ["switch.extended.noocp", "e"],
  ["switch.extended.mirror", "E"],
  ["switch.extended.noocp.mirror", "e"],
  ["switch.single.mirror", "M"],
  ["switch.single.noocp.mirror", "m"],
  ["switch.single", "W"],
  ["switch.single.noocp", "w"],
  ["switch.crossover", "C"],
  ["switch.crossover.noocp", "c"],
  ["switch.crossover.mirror", "C"],
  ["switch.crossover.noocp.mirror", "c"],
  ["button.switchSelector", "B"],
  ["button.departure", "D"],
  ["button.shunt", "H"],
  ["button.shunt.noocp", "h"],
  ["button.shuntBufferSignal", "U"],
  ["button.lineblock", "L"],
  ["button.sign", "G"],
  ["button.sign.light", "g"],
  ["button.sign.sealedCounter", "K"],
  ["signal.departure2", "R"],
  ["signal.entry", "I"],
  ["signal.premain", "P"],
  ["signal.shunt", "Q"],
  ["signal.shunt.noocp", "q"],
  ["board.dispatcherBuilding", "X"],
  ["board.base", "X"],
  ["sign.fourLabel", "F"],
]);

const grid = Array.from({ length: rows }, () => Array.from({ length: columns }, () => "."));

function paintPiece(pieceKey, x, y) {
  const bounds = catalog.pieces?.[pieceKey]?.bounds;
  const occupied = catalog.pieces?.[pieceKey]?.occupied;
  const width = Number(bounds?.width ?? 1);
  const height = Number(bounds?.height ?? 1);
  const ch = charMap.get(pieceKey) ?? "?";

  if (Array.isArray(occupied) && occupied.length > 0) {
    for (const cell of occupied) {
      const dx = Number(cell?.[0] ?? 0);
      const dy = Number(cell?.[1] ?? 0);
      const px = x + dx;
      const py = y + dy;

      if (py >= 0 && py < rows && px >= 0 && px < columns) {
        grid[py][px] = ch;
      }
    }
    return;
  }

  for (let dy = 0; dy < height; dy += 1) {
    for (let dx = 0; dx < width; dx += 1) {
      const px = x + dx;
      const py = y + dy;
      if (py >= 0 && py < rows && px >= 0 && px < columns) {
        grid[py][px] = ch;
      }
    }
  }
}

if (instances.length > 0) {
  for (const instance of instances) {
    if (!instance || typeof instance !== "object") continue;
    const pieceKey = instance.pieceKey;
    if (typeof pieceKey !== "string") continue;
    paintPiece(pieceKey, Number(instance.x ?? 0), Number(instance.y ?? 0));
  }
} else {
  for (let y = 0; y < Math.min(rows, cells.length); y += 1) {
    const row = cells[y];
    if (!Array.isArray(row)) continue;

    for (let x = 0; x < Math.min(columns, row.length); x += 1) {
      const cell = row[x];
      const pieceId = cell?.pieceId;
      if (!pieceId) continue;

      const piece = piecesById[pieceId];
      const pieceKey = piece?.pieceKey;
      grid[y][x] = charMap.get(pieceKey) ?? "?";
    }
  }
}

const lines = [];
lines.push("Grid:");
lines.push(`    ${Array.from({ length: columns }, (_, x) => String(x % 10)).join("")}`);
for (let y = 0; y < rows; y += 1) {
  lines.push(`${String(y).padStart(2, "0")}: ${grid[y].join("")}`);
}

const output = lines.join("\n");

if (outputPath) {
  writeFileSync(outputPath, output + "\n", "utf8");
} else {
  process.stdout.write(output + "\n");
}
