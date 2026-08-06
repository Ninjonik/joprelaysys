import type { PlacedPiece } from "../../board-demo";
import { parseCrossoverState } from "./switch-actions";
import { getPieceDefinition } from "./piece-catalog";

export type PortSide = "left" | "right" | "top" | "bottom";

export type LocalPort = {
    id: string;
    cell: [number, number];
    side: PortSide;
    branches: string[];
};

export type AbsolutePort = {
    id: string;
    x: number;
    y: number;
    side: PortSide;
    branches: string[];
};

export type NodeGroup = {
    /** "" for pieces with a single always-active group (tracks, signals, single-route switches) */
    suffix: string;
    ports: AbsolutePort[];
};

// ---------------------------------------------------------------------------
// Local (0 deg, unmirrored) port geometry, keyed by catalog pieceKey.
// Coordinates match the catalog's `occupied` array exactly.
// ---------------------------------------------------------------------------

const THROUGH: LocalPort[] = [
    { id: "a", cell: [0, 0], side: "left", branches: ["through"] },
    { id: "b", cell: [0, 0], side: "right", branches: ["through"] },
];

const ONE_WAY_RIGHT: LocalPort[] = [
    { id: "a", cell: [0, 0], side: "right", branches: ["through"] },
];

const SWITCH_SINGLE: LocalPort[] = [
    { id: "stem", cell: [0, 1], side: "left", branches: ["normal", "reverse"] },
    { id: "normal", cell: [0, 1], side: "right", branches: ["normal"] },
    { id: "reverse", cell: [0, 0], side: "right", branches: ["reverse"] },
];

const SWITCH_SINGLE_MIRROR: LocalPort[] = [
    { id: "stem", cell: [0, 1], side: "right", branches: ["normal", "reverse"] },
    { id: "normal", cell: [0, 1], side: "left", branches: ["normal"] },
    { id: "reverse", cell: [0, 0], side: "left", branches: ["reverse"] },
];

const SWITCH_EXTENDED: LocalPort[] = [
    { id: "stem", cell: [0, 2], side: "left", branches: ["normal", "reverse"] },
    { id: "normal", cell: [1, 1], side: "right", branches: ["normal"] },
    { id: "reverse", cell: [1, 0], side: "right", branches: ["reverse"] },
];

const SWITCH_EXTENDED_MIRROR: LocalPort[] = [
    { id: "stem", cell: [1, 2], side: "right", branches: ["normal", "reverse"] },
    { id: "normal", cell: [0, 1], side: "left", branches: ["normal"] },
    { id: "reverse", cell: [0, 0], side: "left", branches: ["reverse"] },
];

const SWITCH_CROSSOVER: LocalPort[] = [
    { id: "topLeft", cell: [0, 0], side: "left", branches: ["top"] },
    { id: "topRight", cell: [0, 0], side: "right", branches: ["top", "cross"] },
    { id: "bottomLeft", cell: [0, 1], side: "left", branches: ["bottom", "cross"] },
    { id: "bottomRight", cell: [0, 1], side: "right", branches: ["bottom"] },
];

const SWITCH_CROSSOVER_MIRROR: LocalPort[] = [
    { id: "topLeft", cell: [0, 0], side: "left", branches: ["top", "cross"] },
    { id: "topRight", cell: [0, 0], side: "right", branches: ["top"] },
    { id: "bottomLeft", cell: [0, 1], side: "left", branches: ["bottom"] },
    { id: "bottomRight", cell: [0, 1], side: "right", branches: ["bottom", "cross"] },
];

const PORTS_BY_KEY: Record<string, LocalPort[]> = {
    "track.main": THROUGH,
    "track.main.noocp": THROUGH,
    "track.sign": THROUGH,
    "track.sign.noocp": THROUGH,
    "signal.entry": THROUGH,
    "signal.entry.noocp": THROUGH,
    "signal.departure2": THROUGH,
    "signal.departure2.noocp": THROUGH,
    "signal.premain": THROUGH,
    "signal.premain.noocp": THROUGH,
    "signal.shunt": THROUGH,
    "signal.shunt.noocp": THROUGH,
    "button.departure": THROUGH,
    "button.shunt": THROUGH,
    "button.shunt.noocp": THROUGH,
    "button.shuntBufferSignal": ONE_WAY_RIGHT,

    "switch.single": SWITCH_SINGLE,
    "switch.single.noocp": SWITCH_SINGLE,
    "switch.single.mirror": SWITCH_SINGLE_MIRROR,
    "switch.single.noocp.mirror": SWITCH_SINGLE_MIRROR,

    "switch.extended": SWITCH_EXTENDED,
    "switch.extended.noocp": SWITCH_EXTENDED,
    "switch.extended.mirror": SWITCH_EXTENDED_MIRROR,
    "switch.extended.noocp.mirror": SWITCH_EXTENDED_MIRROR,

    "switch.crossover": SWITCH_CROSSOVER,
    "switch.crossover.noocp": SWITCH_CROSSOVER,
    "switch.crossover.mirror": SWITCH_CROSSOVER_MIRROR,
    "switch.crossover.noocp.mirror": SWITCH_CROSSOVER_MIRROR,
};

// ---------------------------------------------------------------------------
// Transform helpers - mirrors the app's existing rotate-then-mirror convention
// (see transformLocalCell / rotateCell180 / mirrorCellX in board-demo.tsx).
// ---------------------------------------------------------------------------

function rotateCell180(x: number, y: number, width: number, height: number) {
    return { x: width - 1 - x, y: height - 1 - y };
}

function mirrorCellX(x: number, y: number, width: number) {
    return { x: width - 1 - x, y };
}

const FLIP_SIDE_180: Record<PortSide, PortSide> = {
    left: "right",
    right: "left",
    top: "bottom",
    bottom: "top",
};

const FLIP_SIDE_X: Record<PortSide, PortSide> = {
    left: "right",
    right: "left",
    top: "top",
    bottom: "bottom",
};

function transformSide(side: PortSide, rotation: 0 | 180, mirrored: boolean): PortSide {
    let result = side;
    if (rotation === 180) result = FLIP_SIDE_180[result];
    if (mirrored) result = FLIP_SIDE_X[result];
    return result;
}

function transformLocalCell(x: number, y: number, width: number, height: number, rotation: 0 | 180, mirrored: boolean) {
    const rotated = rotation === 180 ? rotateCell180(x, y, width, height) : { x, y };
    return mirrored ? mirrorCellX(rotated.x, rotated.y, width) : rotated;
}

export function getPieceAbsolutePorts(piece: PlacedPiece): AbsolutePort[] {
    const localPorts = PORTS_BY_KEY[piece.pieceKey];

    if (!localPorts) {
        return [];
    }

    const { bounds } = getPieceDefinition(piece);

    return localPorts.map((port) => {
        const transformedCell = transformLocalCell(
            port.cell[0],
            port.cell[1],
            bounds.width,
            bounds.height,
            piece.rotation,
            piece.mirrored,
        );

        return {
            id: port.id,
            x: piece.x + transformedCell.x,
            y: piece.y + transformedCell.y,
            side: transformSide(port.side, piece.rotation, piece.mirrored),
            branches: port.branches,
        };
    });
}

// ---------------------------------------------------------------------------
// Active branch / node-group resolution.
// A "node group" is a set of ports on one piece that are mutually connected
// for the piece's *current* state. Most pieces have exactly one group.
// switch.crossover(.mirror) can have up to three independent groups (top,
// bottom, cross), which must stay graph-separate so a straight top route
// never gets treated as connected to the bottom route.
// ---------------------------------------------------------------------------

function getSwitchRoute(piece: PlacedPiece): "normal" | "reverse" {
    const [route] = piece.state.split(".");
    return route === "reverse" ? "reverse" : "normal";
}

export function getActiveNodeGroups(piece: PlacedPiece): NodeGroup[] {
    const ports = getPieceAbsolutePorts(piece);

    if (ports.length === 0) {
        return [];
    }

    if (piece.pieceKey.startsWith("switch.crossover")) {
        const state = parseCrossoverState(piece.state);
        const groups: NodeGroup[] = [];

        const byId = (id: string) => ports.find((port) => port.id === id)!;

        if (state.top.route === "normal") {
            groups.push({ suffix: "top", ports: [byId("topLeft"), byId("topRight")] });
        }

        if (state.bottom.route === "normal") {
            groups.push({ suffix: "bottom", ports: [byId("bottomLeft"), byId("bottomRight")] });
        }

        if (state.top.route === "reverse" && state.bottom.route === "reverse") {
            groups.push({
                suffix: "cross",
                ports: ports.filter((port) => port.branches.includes("cross")),
            });
        }

        return groups;
    }

    if (piece.pieceKey.startsWith("switch.single") || piece.pieceKey.startsWith("switch.extended")) {
        const route = getSwitchRoute(piece);
        return [{
            suffix: "",
            ports: ports.filter((port) => port.branches.includes(route)),
        }];
    }

    // Tracks, signals, buttons: always fully connected through their single branch.
    return [{ suffix: "", ports }];
}