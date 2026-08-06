import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const inputPath = resolve(process.argv[2] ?? "test.json");
const outputPath = process.argv[3] ? resolve(process.argv[3]) : null;

const raw = readFileSync(inputPath, "utf8").trim();
if (!raw) {
  throw new Error(`Input file is empty: ${inputPath}`);
}

const board = JSON.parse(raw);
const catalog = JSON.parse(readFileSync(resolve("app/data/piece-catalog.json"), "utf8"));
const instances = Array.isArray(board.instances) ? board.instances : [];

const PORTS_BY_KEY = {
  "track.main": [["a", [0, 0], "left", ["through"]], ["b", [0, 0], "right", ["through"]]],
  "track.main.noocp": [["a", [0, 0], "left", ["through"]], ["b", [0, 0], "right", ["through"]]],
  "track.sign": [["a", [0, 0], "left", ["through"]], ["b", [0, 0], "right", ["through"]]],
  "track.sign.noocp": [["a", [0, 0], "left", ["through"]], ["b", [0, 0], "right", ["through"]]],
  "signal.entry": [["a", [0, 0], "left", ["through"]], ["b", [0, 0], "right", ["through"]]],
  "signal.entry.noocp": [["a", [0, 0], "left", ["through"]], ["b", [0, 0], "right", ["through"]]],
  "signal.departure2": [["a", [0, 0], "left", ["through"]], ["b", [0, 0], "right", ["through"]]],
  "signal.departure2.noocp": [["a", [0, 0], "left", ["through"]], ["b", [0, 0], "right", ["through"]]],
  "signal.premain": [["a", [0, 0], "left", ["through"]], ["b", [0, 0], "right", ["through"]]],
  "signal.premain.noocp": [["a", [0, 0], "left", ["through"]], ["b", [0, 0], "right", ["through"]]],
  "signal.shunt": [["a", [0, 0], "left", ["through"]], ["b", [0, 0], "right", ["through"]]],
  "signal.shunt.noocp": [["a", [0, 0], "left", ["through"]], ["b", [0, 0], "right", ["through"]]],
  "button.departure": [["a", [0, 0], "left", ["through"]], ["b", [0, 0], "right", ["through"]]],
  "button.shunt": [["a", [0, 0], "left", ["through"]], ["b", [0, 0], "right", ["through"]]],
  "button.shunt.noocp": [["a", [0, 0], "left", ["through"]], ["b", [0, 0], "right", ["through"]]],
  "button.shuntBufferSignal": [["a", [0, 0], "right", ["through"]]],
  "switch.single": [
    ["stem", [0, 1], "left", ["normal", "reverse"]],
    ["normal", [0, 1], "right", ["normal"]],
    ["reverse", [0, 0], "right", ["reverse"]],
  ],
  "switch.single.noocp": [
    ["stem", [0, 1], "left", ["normal", "reverse"]],
    ["normal", [0, 1], "right", ["normal"]],
    ["reverse", [0, 0], "right", ["reverse"]],
  ],
  "switch.single.mirror": [
    ["stem", [0, 1], "right", ["normal", "reverse"]],
    ["normal", [0, 1], "left", ["normal"]],
    ["reverse", [0, 0], "left", ["reverse"]],
  ],
  "switch.single.noocp.mirror": [
    ["stem", [0, 1], "right", ["normal", "reverse"]],
    ["normal", [0, 1], "left", ["normal"]],
    ["reverse", [0, 0], "left", ["reverse"]],
  ],
  "switch.extended": [
    ["stem", [0, 2], "left", ["normal", "reverse"]],
    ["normal", [1, 1], "right", ["normal"]],
    ["reverse", [1, 0], "right", ["reverse"]],
  ],
  "switch.extended.noocp": [
    ["stem", [0, 2], "left", ["normal", "reverse"]],
    ["normal", [1, 1], "right", ["normal"]],
    ["reverse", [1, 0], "right", ["reverse"]],
  ],
  "switch.extended.mirror": [
    ["stem", [1, 2], "right", ["normal", "reverse"]],
    ["normal", [0, 1], "left", ["normal"]],
    ["reverse", [0, 0], "left", ["reverse"]],
  ],
  "switch.extended.noocp.mirror": [
    ["stem", [1, 2], "right", ["normal", "reverse"]],
    ["normal", [0, 1], "left", ["normal"]],
    ["reverse", [0, 0], "left", ["reverse"]],
  ],
  "switch.crossover": [
    ["topLeft", [0, 0], "left", ["top"]],
    ["topRight", [0, 0], "right", ["top", "cross"]],
    ["bottomLeft", [0, 1], "left", ["bottom", "cross"]],
    ["bottomRight", [0, 1], "right", ["bottom"]],
  ],
  "switch.crossover.noocp": [
    ["topLeft", [0, 0], "left", ["top"]],
    ["topRight", [0, 0], "right", ["top", "cross"]],
    ["bottomLeft", [0, 1], "left", ["bottom", "cross"]],
    ["bottomRight", [0, 1], "right", ["bottom"]],
  ],
  "switch.crossover.mirror": [
    ["topLeft", [0, 0], "left", ["top", "cross"]],
    ["topRight", [0, 0], "right", ["top"]],
    ["bottomLeft", [0, 1], "left", ["bottom"]],
    ["bottomRight", [0, 1], "right", ["bottom", "cross"]],
  ],
  "switch.crossover.noocp.mirror": [
    ["topLeft", [0, 0], "left", ["top", "cross"]],
    ["topRight", [0, 0], "right", ["top"]],
    ["bottomLeft", [0, 1], "left", ["bottom"]],
    ["bottomRight", [0, 1], "right", ["bottom", "cross"]],
  ],
};

function rotateCell180(x, y, width, height) {
  return { x: width - 1 - x, y: height - 1 - y };
}

function mirrorCellX(x, y, width) {
  return { x: width - 1 - x, y };
}

function transformSide(side, rotation, mirrored) {
  let result = side;
  if (rotation === 180) {
    result = { left: "right", right: "left", top: "bottom", bottom: "top" }[result];
  }
  if (mirrored) {
    result = { left: "right", right: "left", top: "top", bottom: "bottom" }[result];
  }
  return result;
}

function transformLocalCell(x, y, width, height, rotation, mirrored) {
  const rotated = rotation === 180 ? rotateCell180(x, y, width, height) : { x, y };
  return mirrored ? mirrorCellX(rotated.x, rotated.y, width) : rotated;
}

function parseCrossoverState(rawState) {
  const stateText = typeof rawState === "string" ? rawState : "";
  const normalized = stateText.includes("top:") && stateText.includes("bottom:")
    ? stateText
    : "top:normal.clear;bottom:normal.clear";
  const state = {
    top: { route: "normal", aspect: "clear" },
    bottom: { route: "normal", aspect: "clear" },
  };

  for (const section of normalized.split(";")) {
    const [name, value = "normal.clear"] = section.split(":");
    const [route, aspect] = value.split(".");
    if (name !== "top" && name !== "bottom") continue;
    state[name] = {
      route: route === "reverse" ? "reverse" : "normal",
      aspect: aspect === "reserved" || aspect === "moving" ? aspect : "clear",
    };
  }

  return state;
}

function getSwitchRoute(piece) {
  const [route] = String(piece.state ?? "normal").split(".");
  return route === "reverse" ? "reverse" : "normal";
}

function getAbsolutePorts(piece) {
  const localPorts = PORTS_BY_KEY[piece.pieceKey] ?? [];
  const bounds = catalog.pieces[piece.pieceKey]?.bounds ?? { width: 1, height: 1 };
  return localPorts.map(([id, cell, side, branches]) => {
    const t = transformLocalCell(cell[0], cell[1], bounds.width, bounds.height, piece.rotation ?? 0, !!piece.mirrored);
    return {
      id,
      x: piece.x + t.x,
      y: piece.y + t.y,
      side: transformSide(side, piece.rotation ?? 0, !!piece.mirrored),
      branches,
    };
  });
}

function getActiveNodeGroups(piece) {
  const ports = getAbsolutePorts(piece);
  if (ports.length === 0) return [];

  if (piece.pieceKey.startsWith("switch.crossover")) {
    const state = parseCrossoverState(piece.state);
    const byId = (id) => ports.find((p) => p.id === id);
    const groups = [];
    if (state.top.route === "normal") groups.push({ suffix: "top", ports: [byId("topLeft"), byId("topRight")].filter(Boolean) });
    if (state.bottom.route === "normal") groups.push({ suffix: "bottom", ports: [byId("bottomLeft"), byId("bottomRight")].filter(Boolean) });
    if (state.top.route === "reverse" && state.bottom.route === "reverse") {
      groups.push({ suffix: "cross", ports: ports.filter((port) => port.branches.includes("cross")) });
    }
    return groups;
  }

  if (piece.pieceKey.startsWith("switch.single") || piece.pieceKey.startsWith("switch.extended")) {
    const route = getSwitchRoute(piece);
    return [{ suffix: "", ports: ports.filter((port) => port.branches.includes(route)) }];
  }

  return [{ suffix: "", ports }];
}

function cellSideKey(x, y, side) {
  return `${x}:${y}:${side}`;
}

const OPPOSITE_SIDE = { left: "right", right: "left", top: "bottom", bottom: "top" };
const SIDE_OFFSET = { left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 }, top: { dx: 0, dy: -1 }, bottom: { dx: 0, dy: 1 } };

function isRouteNode(piece) {
  const kind = piece.stateModel?.kind;
  return ["trackOccupancy", "switchPosition", "switchCrossover", "signalAspect"].includes(kind)
    || String(piece.pieceKey).startsWith("signal.")
    || ["button.departure", "button.shunt", "button.shunt.noocp", "button.shuntBufferSignal", "signal.premain", "signal.premain.noocp"].includes(piece.pieceKey);
}

const routePieces = instances.filter((p) => isRouteNode(catalog.pieces[p.pieceKey] ?? {}));
const graph = new Map();
const portsBySocket = new Map();
const nodeMeta = new Map();

for (const piece of routePieces) {
  const groups = getActiveNodeGroups(piece);
  for (const group of groups) {
    const node = group.suffix ? `${piece.id}#${group.suffix}` : piece.id;
    graph.set(node, graph.get(node) ?? new Set());
    nodeMeta.set(node, {
      pieceKey: piece.pieceKey,
      x: piece.x,
      y: piece.y,
      suffix: group.suffix,
      ports: group.ports,
    });
    for (const port of group.ports) {
      const key = cellSideKey(port.x, port.y, port.side);
      portsBySocket.set(key, [...(portsBySocket.get(key) ?? []), { node, port }]);
    }
  }
}

function addGraphEdge(a, b) {
  if (a === b) return;
  graph.get(a).add(b);
  graph.get(b).add(a);
}

for (const indexedPorts of portsBySocket.values()) {
  for (const { node, port } of indexedPorts) {
    const offset = SIDE_OFFSET[port.side];
    const neighborKey = cellSideKey(port.x + offset.dx, port.y + offset.dy, OPPOSITE_SIDE[port.side]);
    for (const neighbor of portsBySocket.get(neighborKey) ?? []) {
      addGraphEdge(node, neighbor.node);
    }
  }
}

const lines = [];
lines.push("Nodes:");
for (const [node, ports] of graph.entries()) {
  lines.push(`${node}: ${Array.from(ports).join(", ")}`);
}
lines.push("");
lines.push("Ports:");
for (const piece of routePieces) {
  const groups = getActiveNodeGroups(piece);
  lines.push(`${piece.pieceKey} @ (${piece.x},${piece.y}) rot=${piece.rotation ?? 0} mir=${!!piece.mirrored}`);
  for (const group of groups) {
    lines.push(`  ${group.suffix || "(main)"}: ${group.ports.map((p) => `${p.id}@(${p.x},${p.y})-${p.side}`).join(", ")}`);
  }
}
lines.push("");
lines.push("Edges:");
const seen = new Set();
for (const [node, edges] of graph.entries()) {
  for (const edge of edges) {
    const key = node < edge ? `${node}|${edge}` : `${edge}|${node}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(`${node} <-> ${edge}`);
  }
}

const output = lines.join("\n");
if (outputPath) {
  if (outputPath.endsWith(".dot")) {
    const dotLines = [];
    dotLines.push("graph route_graph {");
    dotLines.push("  rankdir=LR;");
    dotLines.push("  node [shape=box, fontsize=10];");

    for (const [node, ports] of graph.entries()) {
      const meta = nodeMeta.get(node);
      const title = meta
        ? `${meta.pieceKey} @ (${meta.x},${meta.y})${meta.suffix ? ` #${meta.suffix}` : ""}`
        : node;
      const portLine = meta?.ports
        ? meta.ports.map((p) => `${p.id}@(${p.x},${p.y})-${p.side}`).join("\\n")
        : "";
      const neighborLine = Array.from(ports).join(", ");
      const label = [title, portLine, neighborLine].filter(Boolean).join("\\n").replaceAll("\"", "\\\"");
      dotLines.push(`  "${node}" [label="${label}"];`);
    }

    for (const [node, edges] of graph.entries()) {
      for (const edge of edges) {
        if (node < edge) {
          dotLines.push(`  "${node}" -- "${edge}";`);
        }
      }
    }

    dotLines.push("}");
    writeFileSync(outputPath, dotLines.join("\n") + "\n", "utf8");
  } else {
    writeFileSync(outputPath, output + "\n", "utf8");
  }
} else {
  process.stdout.write(output + "\n");
}
