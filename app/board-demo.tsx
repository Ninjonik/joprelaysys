"use client";

import Image from "next/image";
import type { ChangeEvent, CSSProperties, MouseEvent, ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import styles from "./page.module.css";
import catalogData from "./data/piece-catalog.json";

type PieceCatalog = typeof catalogData;
export type PieceKey = keyof PieceCatalog["pieces"];
export type PieceDefinition = PieceCatalog["pieces"][PieceKey];
export type PieceText = string | string[];
export type PieceTextSize = number[];

type OverlayLamp = {
  x: number;
  y: number;
  r: number;
  color: string;
};

type TextLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotate?: number;
  fontSize?: number;
  letterSpacing?: number;
  fill?: string;
  fontFamily?: string;
  label: string;
  maxLength?: number;
};

type OverlayRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
};

type SwitchOverlayShape = OverlayRect & {
  transform?: string;
  clip?: OverlayRect;
};

type SwitchRoute = "normal" | "reverse" | "stem" | "upper";
type SwitchAspect = "clear" | "reserved" | "occupied" | "moving";
type CrossoverRoute = "normal" | "reverse";

type GridCell = {
  x: number;
  y: number;
};

export type PieceRotation = 0 | 180;
export type PieceMirror = boolean;

type PlacedPiece = {
  id: string;
  pieceKey: PieceKey;
  x: number;
  y: number;
  state: string;
  rotation: PieceRotation;
  mirrored: PieceMirror;
  text?: PieceText;
  textSize?: PieceTextSize;
};

const INITIAL_COLUMNS = 24;
const INITIAL_ROWS = 14;
const BOARD_TILE = 42;
const PREVIEW_TILE = 38;
const SVG_TILE_UNIT = 75;
const PLACEABLE_EXCLUSIONS = new Set<PieceKey>(["board.base"]);

export const pieceEntries = Object.entries(catalogData.pieces) as [PieceKey, PieceDefinition][];
const placeableEntries = pieceEntries.filter(([pieceKey]) => !PLACEABLE_EXCLUSIONS.has(pieceKey));

const SWITCH_GEOMETRY = {
  "switch.single": {
    normal: ["M 8 112.5 H 67"],
    reverse: ["M 58.39 50.11 L 16.61 99.9"],
    upper: ["M 58.39 50.11 L 41.5 70.25"],
  },
  "switch.single.mirror": {
    normal: ["M 8 112.5 H 67"],
    reverse: ["M 16.61 50.1 L 58.39 99.9"],
    upper: ["M 16.61 50.1 L 33.5 70.25"],
  },
  "switch.extended": {
    normal: ["M 124.12 46.77 L 87.5 90.4", "M 55.97 127.95 L 19.35 171.65"],
    reverse: ["M 88 112.5 H 145", "M 55.97 127.95 L 19.35 171.65"],
    stem: ["M 8 187.5 H 67"],
  },
  "switch.extended.mirror": {
    normal: ["M 25.88 46.77 L 62.5 90.4", "M 94.03 127.95 L 130.66 171.64"],
    reverse: ["M 5 112.5 H 62", "M 94.03 127.95 L 130.66 171.64"],
    stem: ["M 83 187.5 H 142"],
  },
} as const;

const CROSSOVER_GEOMETRY = {
  "switch.crossover": {
    top: {
      normal: ["M 8 37.5 H 67"],
      reverse: ["M 56.35 53.2 L 39.3 73.45"],
    },
    bottom: {
      normal: ["M 8 112.5 H 67"],
      reverse: ["M 18.65 96.8 L 35.7 76.55"],
    },
  },
  "switch.crossover.mirror": {
    top: {
      normal: ["M 8 37.5 H 67"],
      reverse: ["M 18.65 53.2 L 35.7 73.45"],
    },
    bottom: {
      normal: ["M 8 112.5 H 67"],
      reverse: ["M 56.35 96.8 L 39.3 76.55"],
    },
  },
} as const;

const SWITCH_OVERLAY_SHAPES: Partial<Record<PieceKey, Partial<Record<SwitchRoute, SwitchOverlayShape[]>>>> = {
  "switch.single": {
    normal: [{ x: 5, y: 108.5, width: 65, height: 8, rx: 4 }],
    reverse: [
      { x: 5, y: 108.5, width: 65, height: 8, rx: 4 },
      { x: 5, y: 71, width: 65, height: 8, rx: 4, transform: "translate(-44.06 55.52) rotate(-50)" },
    ],
    upper: [
      { x: 5, y: 108.5, width: 65, height: 8, rx: 4 },
      { x: 5, y: 71, width: 65, height: 8, rx: 4, transform: "translate(-44.06 55.52) rotate(-50)" },
    ],
  },
  "switch.single.noocp": {
    normal: [{ x: 5, y: 108.5, width: 65, height: 8, rx: 4 }],
    reverse: [
      { x: 5, y: 108.5, width: 65, height: 8, rx: 4 },
      { x: 5, y: 71, width: 65, height: 8, rx: 4, transform: "translate(-44.06 55.52) rotate(-50)" },
    ],
    upper: [
      { x: 5, y: 108.5, width: 65, height: 8, rx: 4 },
      { x: 5, y: 71, width: 65, height: 8, rx: 4, transform: "translate(-44.06 55.52) rotate(-50)" },
    ],
  },
  "switch.single.mirror": {
    normal: [{ x: 5, y: 108.5, width: 65, height: 8, rx: 4 }],
    reverse: [
      { x: 5, y: 108.5, width: 65, height: 8, rx: 4 },
      { x: 33.5, y: 42.5, width: 8, height: 65, rx: 4, transform: "translate(-39.44 41.65) rotate(-40)" },
    ],
    upper: [
      { x: 5, y: 108.5, width: 65, height: 8, rx: 4 },
      { x: 33.5, y: 42.5, width: 8, height: 65, rx: 4, transform: "translate(-39.44 41.65) rotate(-40)" },
    ],
  },
  "switch.single.noocp.mirror": {
    normal: [{ x: 5, y: 108.5, width: 65, height: 8, rx: 4 }],
    reverse: [
      { x: 5, y: 108.5, width: 65, height: 8, rx: 4 },
      { x: 33.5, y: 42.5, width: 8, height: 65, rx: 4, transform: "translate(-39.44 41.65) rotate(-40)" },
    ],
    upper: [
      { x: 5, y: 108.5, width: 65, height: 8, rx: 4 },
      { x: 33.5, y: 42.5, width: 8, height: 65, rx: 4, transform: "translate(-39.44 41.65) rotate(-40)" },
    ],
  },
  "switch.extended": {
    normal: [
      { x: 70.73, y: 67.66, width: 65, height: 8, rx: 4, transform: "translate(-18.02 104.68) rotate(-50)" },
      { x: 7.73, y: 142.75, width: 65, height: 8, rx: 4, transform: "translate(-98.04 83.24) rotate(-50)" },
    ],
    reverse: [
      { x: 80, y: 108.5, width: 65, height: 8, rx: 4 },
      { x: 7.73, y: 142.75, width: 65, height: 8, rx: 4, transform: "translate(-98.04 83.24) rotate(-50)" },
    ],
    stem: [{ x: 5, y: 183.5, width: 65, height: 8, rx: 4 }],
  },
  "switch.extended.noocp": {
    normal: [
      { x: 70.73, y: 67.66, width: 65, height: 8, rx: 4, transform: "translate(-18.02 104.68) rotate(-50)" },
      { x: 7.73, y: 142.75, width: 65, height: 8, rx: 4, transform: "translate(-98.04 83.24) rotate(-50)" },
    ],
    reverse: [
      { x: 80, y: 108.5, width: 65, height: 8, rx: 4 },
      { x: 7.73, y: 142.75, width: 65, height: 8, rx: 4, transform: "translate(-98.04 83.24) rotate(-50)" },
    ],
    stem: [{ x: 5, y: 183.5, width: 65, height: 8, rx: 4 }],
  },
  "switch.extended.mirror": {
    normal: [
      { x: 42.77, y: 39.16, width: 8, height: 65, rx: 4, transform: "translate(-35.12 46.83) rotate(-40)" },
      { x: 105.77, y: 114.25, width: 8, height: 65, rx: 4, transform: "translate(-68.65 104.89) rotate(-40)" },
    ],
    reverse: [
      { x: 5, y: 108.5, width: 65, height: 8, rx: 4 },
      { x: 105.77, y: 114.25, width: 8, height: 65, rx: 4, transform: "translate(-68.65 104.89) rotate(-40)" },
    ],
    stem: [{ x: 80, y: 183.5, width: 65, height: 8, rx: 4 }],
  },
  "switch.extended.noocp.mirror": {
    normal: [
      { x: 42.77, y: 39.16, width: 8, height: 65, rx: 4, transform: "translate(-35.12 46.83) rotate(-40)" },
      { x: 105.77, y: 114.25, width: 8, height: 65, rx: 4, transform: "translate(-68.65 104.89) rotate(-40)" },
    ],
    reverse: [
      { x: 5, y: 108.5, width: 65, height: 8, rx: 4 },
      { x: 105.77, y: 114.25, width: 8, height: 65, rx: 4, transform: "translate(-68.65 104.89) rotate(-40)" },
    ],
    stem: [{ x: 80, y: 183.5, width: 65, height: 8, rx: 4 }],
  },
};

const SIGNAL_LAMP_LAYOUTS: Partial<Record<PieceKey, Record<string, OverlayLamp[]>>> = {
  "signal.entry": {
    white: [{ x: 22.33, y: 60, r: 4.78, color: "#f7f8fb" }],
    danger: [{ x: 37.33, y: 60, r: 4.78, color: "#d84242" }],
    green: [{ x: 52.33, y: 60, r: 4.78, color: "#63d29b" }],
    caution: [{ x: 67.33, y: 60, r: 4.78, color: "#f0b948" }],
  },
  "signal.entry.noocp": {
    white: [{ x: 22.33, y: 60, r: 4.78, color: "#f7f8fb" }],
    danger: [{ x: 37.33, y: 60, r: 4.78, color: "#d84242" }],
    green: [{ x: 52.33, y: 60, r: 4.78, color: "#63d29b" }],
    caution: [{ x: 67.33, y: 60, r: 4.78, color: "#f0b948" }],
  },
  "signal.departure2": {
    danger: [],
    clear: [{ x: 22.67, y: 15, r: 4.78, color: "#63d29b" }],
    shunt: [{ x: 37.67, y: 15, r: 4.78, color: "#f7f8fb" }],
  },
  "signal.departure2.noocp": {
    danger: [],
    clear: [{ x: 22.67, y: 15, r: 4.78, color: "#63d29b" }],
    shunt: [{ x: 37.67, y: 15, r: 4.78, color: "#f7f8fb" }],
  },
  "signal.premain": {
    off: [],
    clear: [{ x: 37.67, y: 15, r: 4.78, color: "#63d29b" }],
  },
  "signal.premain.noocp": {
    off: [],
    clear: [{ x: 37.67, y: 15, r: 4.78, color: "#63d29b" }],
  },
  "signal.shunt": {
    off: [],
    proceed: [{ x: 37.33, y: 60, r: 4.78, color: "#f7f8fb" }],
  },
  "signal.shunt.noocp": {
    off: [],
    proceed: [{ x: 37.33, y: 60, r: 4.78, color: "#f7f8fb" }],
  },
};

const CONTROL_LAMP_LAYOUTS: Partial<Record<PieceKey, Record<string, OverlayLamp[]>>> = {
  "button.departure": {
    idle: [{ x: 55.65, y: 37.5, r: 4.94, color: "#636a6e" }],
    pressed: [{ x: 55.65, y: 37.5, r: 4.94, color: "#4ea7ff" }],
    armed: [{ x: 55.65, y: 37.5, r: 4.94, color: "#63d29b" }],
  },
  "button.shunt": {
    idle: [{ x: 60, y: 37.5, r: 4.94, color: "#636a6e" }],
    pressed: [{ x: 60, y: 37.5, r: 4.94, color: "#4ea7ff" }],
    armed: [{ x: 60, y: 37.5, r: 4.94, color: "#63d29b" }],
  },
  "button.shunt.noocp": {
    idle: [{ x: 60, y: 37.5, r: 4.94, color: "#636a6e" }],
    pressed: [{ x: 60, y: 37.5, r: 4.94, color: "#4ea7ff" }],
    armed: [{ x: 60, y: 37.5, r: 4.94, color: "#63d29b" }],
  },
  "button.sign": {
    idle: [],
    pressed: [],
    armed: [],
  },
  "button.sign.light": {
    dark: [{ x: 37.5, y: 51.35, r: 6.73, color: "#636a6e" }],
    lit: [{ x: 37.5, y: 51.35, r: 6.73, color: "#63d29b" }],
    flashing: [{ x: 37.5, y: 51.35, r: 6.73, color: "#f0b948" }],
  },
  "button.sign.sealedCounter": {
    idle: [{ x: 54.78, y: 52.03, r: 4, color: "#636a6e" }],
    sealed: [{ x: 54.78, y: 52.03, r: 4, color: "#d84242" }],
    released: [{ x: 54.78, y: 52.03, r: 4, color: "#63d29b" }],
  },
  "button.shuntBufferSignal": {
    idle: [{ x: 15, y: 37.5, r: 4.94, color: "#636a6e" }],
    pressed: [{ x: 15, y: 37.5, r: 4.94, color: "#4ea7ff" }],
    armed: [{ x: 15, y: 37.5, r: 4.94, color: "#63d29b" }],
  },
};

const SELECTOR_LAMP_LAYOUTS: Record<string, OverlayLamp[]> = {
  off: [],
  left: [{ x: 16.04, y: 39.93, r: 6.05, color: "#63d29b" }],
  setting: [{ x: 37.5, y: 21.63, r: 6.05, color: "#d84242" }],
  right: [{ x: 58.96, y: 39.93, r: 6.05, color: "#f0b948" }],
};

const SELECTOR_POINTER_ANGLES: Record<string, number> = {
  left: -42,
  setting: 0,
  off: 0,
  right: 42,
};

const SELECTOR_HANDLE_POLYGON = "35.07 85.28 21.13 119.39 53.87 119.39 40.01 85.29 35.07 85.28";
const SELECTOR_HANDLE_PATH =
  "M55.29 126.17c.3 10.02-7.13 18.73-16.6 19.38-10.38.71-18.99-7.97-18.99-18.76 0-2.64.51-5.14 1.43-7.41h0c6.46 0 11.7-5.53 11.7-12.35v-19.5c0-1.24.95-2.25 2.13-2.25h5.07c1.18 0 2.13 1.01 2.13 2.25v19.5c0 6.82 5.24 12.35 11.7 12.35h0c.85 2.09 1.35 4.38 1.42 6.79Z";
const SELECTOR_PANEL_FILL = "#b4bbbd";
const SELECTOR_RING_FILL = "#6e6e6e";
const SELECTOR_CORE_FILL = "#d9d9d9";

const LINEBLOCK_LAMP_LAYOUTS: Record<string, OverlayLamp[]> = {
  clear: [{ x: 112.5, y: 51.35, r: 6.73, color: "#f7f8fb" }],
  lineBusy: [],
  consentReceived: [
    { x: 112.5, y: 51.35, r: 6.73, color: "#f7f8fb" },
    { x: 37.5, y: 51.35, r: 6.73, color: "#63d29b" },
  ],
  consentGranted: [
    { x: 112.5, y: 51.35, r: 6.73, color: "#f7f8fb" },
    { x: 187.5, y: 51.35, r: 6.73, color: "#d84242" },
  ],
  requestClearance: [
    { x: 112.5, y: 51.35, r: 6.73, color: "#f7f8fb" },
    { x: 187.5, y: 117.38, r: 6.73, color: "#f7f8fb" },
  ],
  "consentReceived.requestClearance": [
    { x: 112.5, y: 51.35, r: 6.73, color: "#f7f8fb" },
    { x: 37.5, y: 51.35, r: 6.73, color: "#63d29b" },
    { x: 187.5, y: 117.38, r: 6.73, color: "#f7f8fb" },
  ],
  "consentGranted.requestClearance": [
    { x: 112.5, y: 51.35, r: 6.73, color: "#f7f8fb" },
    { x: 187.5, y: 51.35, r: 6.73, color: "#d84242" },
    { x: 187.5, y: 117.38, r: 6.73, color: "#f7f8fb" },
  ],
  "lineBusy.requestClearance": [{ x: 187.5, y: 117.38, r: 6.73, color: "#f7f8fb" }],
};

const TRACK_OVERLAY_RECTS: Partial<Record<PieceKey, OverlayRect[]>> = {
  "track.main": [{ x: 5, y: 33.5, width: 65, height: 8, rx: 4 }],
  "track.main.noocp": [{ x: 0, y: 30, width: 75, height: 15 }],
  "track.sign": [{ x: 5, y: 33.5, width: 65, height: 8, rx: 4 }],
  "track.sign.noocp": [{ x: 0, y: 30, width: 75, height: 15 }],
};

const TEXT_LAYOUTS: Partial<Record<PieceKey, TextLayout[]>> = {
  "track.sign": [{ x: 17.39, y: 7.51, width: 40.23, height: 15, label: "Text", maxLength: 6 }],
  "track.sign.noocp": [{ x: 17.39, y: 7.51, width: 40.23, height: 15, label: "Text", maxLength: 6 }],
  "signal.entry": [{ x: 0, y: 52.5, width: 13.27, height: 15, label: "Label", fontSize: 8, letterSpacing: 0.2, maxLength: 2 }],
  "signal.entry.noocp": [{ x: 0, y: 52.5, width: 13.27, height: 15, label: "Label", fontSize: 8, letterSpacing: 0.2, maxLength: 2 }],
  "signal.departure2": [{ x: 46.73, y: 7.5, width: 28.27, height: 15, label: "Label", fontSize: 11, letterSpacing: 0.4, maxLength: 4 }],
  "signal.departure2.noocp": [{ x: 46.73, y: 7.5, width: 28.27, height: 15, label: "Label", fontSize: 11, letterSpacing: 0.4, maxLength: 4 }],
  "signal.premain": [{ x: 46.73, y: 7.5, width: 28.27, height: 15, label: "Label", fontSize: 11, letterSpacing: 0.4, maxLength: 4 }],
  "signal.premain.noocp": [{ x: 46.73, y: 7.5, width: 28.27, height: 15, label: "Label", fontSize: 11, letterSpacing: 0.4, maxLength: 4 }],
  "signal.shunt": [{ x: 0, y: 52.5, width: 28.27, height: 15, label: "Label", fontSize: 10, letterSpacing: 0.3, maxLength: 4 }],
  "signal.shunt.noocp": [{ x: 0, y: 52.5, width: 28.27, height: 15, label: "Label", fontSize: 10, letterSpacing: 0.3, maxLength: 4 }],
  "button.sign": [{ x: 4.99, y: 10.02, width: 65.01, height: 24.3, label: "Text", fontSize: 16, letterSpacing: 0.6, maxLength: 8 }],
  "button.sign.light": [{ x: 4.99, y: 10.02, width: 65.01, height: 24.3, label: "Text", fontSize: 16, letterSpacing: 0.6, maxLength: 8 }],
  "button.sign.sealedCounter": [
    { x: 4.99, y: 0, width: 65.01, height: 24.3, label: "Note", fontSize: 15, letterSpacing: 0.35, maxLength: 12 },
    {
      x: 10.26,
      y: 62.95,
      width: 56.2,
      height: 10.35,
      label: "Counter",
      fontSize: 8.8,
      letterSpacing: 1.05,
      fill: "#e8edf2",
      fontFamily: "'Roboto Mono', Consolas, 'Courier New', monospace",
      maxLength: 6,
    },
  ],
  "button.switchSelector": [{ x: 4.77, y: 56.15, width: 65.47, height: 18.24, label: "Text", fontSize: 12, letterSpacing: 0.5, maxLength: 8 }],
  "button.lineblock": [
    { x: 4.99, y: 10.02, width: 65.01, height: 24.3, label: "A", fontSize: 12, letterSpacing: 0.45, maxLength: 8 },
    { x: 79.99, y: 10.02, width: 65.01, height: 24.3, label: "B", fontSize: 12, letterSpacing: 0.45, maxLength: 8 },
    { x: 154.99, y: 10.02, width: 65.01, height: 24.3, label: "C", fontSize: 12, letterSpacing: 0.45, maxLength: 8 },
    { x: 4.99, y: 76.05, width: 65.01, height: 24.3, label: "D Button", fontSize: 12, letterSpacing: 0.45, maxLength: 8 },
    { x: 154.99, y: 76.05, width: 65.01, height: 24.3, label: "E Button", fontSize: 12, letterSpacing: 0.45, maxLength: 8 },
  ],
  "switch.single": [{ x: 0, y: 127.5, width: 40.23, height: 15, label: "Label", fontSize: 8, letterSpacing: 0.15, maxLength: 6 }],
  "switch.single.noocp": [{ x: 0, y: 127.5, width: 40.23, height: 15, label: "Label", fontSize: 8, letterSpacing: 0.15, maxLength: 6 }],
  "switch.single.mirror": [{ x: 34.77, y: 127.5, width: 40.23, height: 15, label: "Label", fontSize: 8, letterSpacing: 0.15, maxLength: 6 }],
  "switch.single.noocp.mirror": [{ x: 34.77, y: 127.5, width: 40.23, height: 15, label: "Label", fontSize: 8, letterSpacing: 0.15, maxLength: 6 }],
  "switch.extended": [
    { x: 0, y: 202.5, width: 40.23, height: 15, label: "Lower", fontSize: 8, letterSpacing: 0.15, maxLength: 6 },
    { x: 39.23, y: 75.27, width: 32.53, height: 35.63, rotate: -50, label: "Upper", fontSize: 7.5, letterSpacing: 0.1, maxLength: 6 },
  ],
  "switch.extended.noocp": [
    { x: 0, y: 202.5, width: 40.23, height: 15, label: "Lower", fontSize: 8, letterSpacing: 0.15, maxLength: 6 },
    { x: 39.23, y: 75.27, width: 32.53, height: 35.63, rotate: -50, label: "Upper", fontSize: 7.5, letterSpacing: 0.1, maxLength: 6 },
  ],
  "switch.extended.mirror": [
    { x: 109.77, y: 202.5, width: 40.23, height: 15, label: "Lower", fontSize: 8, letterSpacing: 0.15, maxLength: 6 },
    { x: 78.24, y: 75.27, width: 32.53, height: 35.63, rotate: 50, label: "Upper", fontSize: 7.5, letterSpacing: 0.1, maxLength: 6 },
  ],
  "switch.extended.noocp.mirror": [
    { x: 109.77, y: 202.5, width: 40.23, height: 15, label: "Lower", fontSize: 8, letterSpacing: 0.15, maxLength: 6 },
    { x: 78.24, y: 75.27, width: 32.53, height: 35.63, rotate: 50, label: "Upper", fontSize: 7.5, letterSpacing: 0.1, maxLength: 6 },
  ],
  "switch.crossover": [
    { x: 34.77, y: 7.5, width: 40.23, height: 15, label: "Top", fontSize: 8, letterSpacing: 0.15, maxLength: 6 },
    { x: 0, y: 127.5, width: 40.23, height: 15, label: "Bottom", fontSize: 8, letterSpacing: 0.15, maxLength: 6 },
  ],
  "switch.crossover.noocp": [
    { x: 34.77, y: 7.5, width: 40.23, height: 15, label: "Top", fontSize: 8, letterSpacing: 0.15, maxLength: 6 },
    { x: 0, y: 127.5, width: 40.23, height: 15, label: "Bottom", fontSize: 8, letterSpacing: 0.15, maxLength: 6 },
  ],
  "switch.crossover.mirror": [
    { x: 0, y: 7.5, width: 40.23, height: 15, label: "Top", fontSize: 8, letterSpacing: 0.15, maxLength: 6 },
    { x: 34.77, y: 127.5, width: 40.23, height: 15, label: "Bottom", fontSize: 8, letterSpacing: 0.15, maxLength: 6 },
  ],
  "switch.crossover.noocp.mirror": [
    { x: 0, y: 7.5, width: 40.23, height: 15, label: "Top", fontSize: 8, letterSpacing: 0.15, maxLength: 6 },
    { x: 34.77, y: 127.5, width: 40.23, height: 15, label: "Bottom", fontSize: 8, letterSpacing: 0.15, maxLength: 6 },
  ],
  "sign.fourLabel": [{ x: 4.99, y: 28.4, width: 290.01, height: 31.94, label: "Text", fontSize: 20, letterSpacing: 0.8, maxLength: 24 }],
};

function suppressStateEditing(pieceKey: PieceKey, piece: PieceDefinition) {
  return pieceKey.includes(".noocp")
    && (piece.stateModel.kind === "trackOccupancy" || piece.stateModel.kind === "switchPosition" || piece.stateModel.kind === "switchCrossover");
}

export function getStateOptions(piece: PieceDefinition, pieceKey?: PieceKey) {
  if (pieceKey && suppressStateEditing(pieceKey, piece)) {
    return [];
  }

  if (piece.stateModel.kind === "switchCrossover") {
    const routes: CrossoverRoute[] = ["normal", "reverse"];
    const aspects: Exclude<SwitchAspect, "moving">[] = ["clear", "reserved", "occupied"];

    return routes.flatMap((topRoute) =>
      aspects.flatMap((topAspect) =>
        routes.flatMap((bottomRoute) =>
          aspects.map((bottomAspect) => ({
            id: `top:${topRoute}.${topAspect};bottom:${bottomRoute}.${bottomAspect}`,
            label: `Top ${topRoute} ${topAspect} | Bottom ${bottomRoute} ${bottomAspect}`,
          })),
        ),
      ),
    );
  }

  return "states" in piece.stateModel ? piece.stateModel.states : [];
}

export function getDefaultState(piece: PieceDefinition) {
  return "defaultState" in piece.stateModel ? piece.stateModel.defaultState : "static";
}

function getSwitchColor(aspect: SwitchAspect) {
  if (aspect === "occupied") return "#f05454";
  if (aspect === "reserved" || aspect === "moving") return "#f6f7f8";
  return "transparent";
}

function parseSwitchState(pieceKey: PieceKey, rawState: string) {
  if (rawState === "moving") {
    return {
      route: (pieceKey.includes("extended") ? "reverse" : "normal") as SwitchRoute,
      aspect: "moving" as SwitchAspect,
      pulse: true,
    };
  }

  const legacyMap: Record<string, string> = {
    routeNormal: "normal.reserved",
    routeNormalOccupied: "normal.occupied",
    routeReverse: "reverse.reserved",
    routeReverseOccupied: "reverse.occupied",
    routeStem: "stem.reserved",
    routeStemOccupied: "stem.occupied",
    normal: "normal.clear",
    reverse: "reverse.clear",
    stem: "stem.clear",
    upper: "upper.clear",
  };

  const normalized = legacyMap[rawState] ?? rawState;
  const [routePart, aspectPart] = normalized.split(".");
  const route = (["normal", "reverse", "stem", "upper"].includes(routePart) ? routePart : "normal") as SwitchRoute;
  const aspect = (["clear", "reserved", "occupied"].includes(aspectPart) ? aspectPart : "clear") as SwitchAspect;

  return { route, aspect, pulse: false };
}

function parseCrossoverState(rawState: string) {
  const normalized = rawState.includes("top:") && rawState.includes("bottom:")
    ? rawState
    : "top:normal.clear;bottom:normal.clear";
  const sections = normalized.split(";");
  const defaults = {
    top: { route: "normal" as CrossoverRoute, aspect: "clear" as Exclude<SwitchAspect, "moving"> },
    bottom: { route: "normal" as CrossoverRoute, aspect: "clear" as Exclude<SwitchAspect, "moving"> },
  };

  for (const section of sections) {
    const [name, value = "normal.clear"] = section.split(":");
    if (name !== "top" && name !== "bottom") {
      continue;
    }

    const [routePart, aspectPart] = value.split(".");
    defaults[name] = {
      route: routePart === "reverse" ? "reverse" : "normal",
      aspect: aspectPart === "reserved" || aspectPart === "occupied" ? aspectPart : "clear",
    };
  }

  return defaults;
}

function getStateColor(kind: string, state: string) {
  if (kind === "trackOccupancy") {
    if (state === "occupied") return "#f05454";
    if (state === "reserved") return "#f6f7f8";
    return "transparent";
  }

  if (kind === "switchPosition") {
    return getSwitchColor(parseSwitchState("switch.single" as PieceKey, state).aspect);
  }

  if (kind === "switchCrossover") {
    const parsed = parseCrossoverState(state);
    if (parsed.top.aspect === "occupied" || parsed.bottom.aspect === "occupied") return "#f05454";
    if (parsed.top.aspect === "reserved" || parsed.bottom.aspect === "reserved") return "#f6f7f8";
    return "transparent";
  }

  if (kind === "signalAspect") {
    if (state === "green") return "#63d29b";
    if (state === "white" || state === "proceed") return "#f7f8fb";
    if (state === "off" || state === "danger") return "#d84242";
    if (state === "clear") return "#63d29b";
    if (state === "warning" || state === "expectStop") return "#f0b948";
    if (state === "caution") return "#f0b948";
    return "#d84242";
  }

  if (kind === "threePositionSelector") {
    if (state === "left") return "#63d29b";
    if (state === "setting") return "#d84242";
    if (state === "right") return "#f0b948";
    return "#636a6e";
  }

  if (kind === "indicator") {
    if (state === "lit") return "#63d29b";
    if (state === "flashing") return "#f0b948";
    return "#636a6e";
  }

  if (kind === "sealedCommand") {
    if (state === "sealed") return "#d84242";
    if (state === "released") return "#63d29b";
    return "#636a6e";
  }

  if (kind === "lineblockPanel") {
    if (state.endsWith("granted")) return "#63d29b";
    if (state.endsWith("requesting")) return "#f0b948";
    if (state.endsWith("blocked")) return "#d84242";
    return "#636a6e";
  }

  if (kind === "momentaryCommand") {
    if (state === "pressed") return "#4ea7ff";
    if (state === "armed") return "#63d29b";
    return "#636a6e";
  }

  return "#c5ccd0";
}

function getSwitchGeometry(pieceKey: PieceKey, state: string) {
  if (!pieceKey.startsWith("switch.")) {
    return [];
  }

  const geometryKey = pieceKey.includes("noocp")
    ? (pieceKey.replace(".noocp", "") as keyof typeof SWITCH_GEOMETRY)
    : (pieceKey as keyof typeof SWITCH_GEOMETRY);

  const geometry = SWITCH_GEOMETRY[geometryKey];

  if (!geometry) {
    return [];
  }

  const parsed = parseSwitchState(pieceKey, state);

  if (parsed.route === "stem") {
    return "stem" in geometry ? geometry.stem : geometry.normal;
  }

  if (parsed.route === "upper") {
    return "upper" in geometry ? geometry.upper : geometry.reverse;
  }

  return geometry[parsed.route];
}

function getSwitchOverlayShapes(pieceKey: PieceKey, state: string) {
  const parsed = parseSwitchState(pieceKey, state);
  return SWITCH_OVERLAY_SHAPES[pieceKey]?.[parsed.route] ?? [];
}

function getCrossoverGeometry(pieceKey: PieceKey) {
  if (!pieceKey.startsWith("switch.crossover")) {
    return null;
  }

  const geometryKey = pieceKey.includes("noocp")
    ? (pieceKey.replace(".noocp", "") as keyof typeof CROSSOVER_GEOMETRY)
    : (pieceKey as keyof typeof CROSSOVER_GEOMETRY);

  return CROSSOVER_GEOMETRY[geometryKey] ?? null;
}

function getSignalLampLayout(pieceKey: PieceKey, state: string) {
  return SIGNAL_LAMP_LAYOUTS[pieceKey]?.[state] ?? [];
}

function getControlLampLayout(pieceKey: PieceKey, state: string) {
  return CONTROL_LAMP_LAYOUTS[pieceKey]?.[state] ?? [];
}

function getSelectorLampLayout(state: string) {
  return SELECTOR_LAMP_LAYOUTS[state] ?? [];
}

function getLineblockLampLayout(state: string) {
  return LINEBLOCK_LAMP_LAYOUTS[state] ?? [];
}

function getTrackOverlayRects(pieceKey: PieceKey) {
  return TRACK_OVERLAY_RECTS[pieceKey] ?? [];
}

export function getTextLayouts(pieceKey: PieceKey) {
  return TEXT_LAYOUTS[pieceKey] ?? [];
}

export function normalizeTextValues(text: PieceText | undefined, layouts: TextLayout[]) {
  const values = Array.isArray(text) ? text : [text ?? ""];
  return layouts.map((layout, index) => values[index] ?? (layouts.length === 1 ? values[0] ?? "" : ""));
}

function getComputedTextFontSize(layout: TextLayout, value: string, override?: number) {
  if (override && override > 0) {
    return override;
  }

  if (layout.fontSize) {
    return layout.fontSize;
  }

  const lines = value.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const longestLine = lines.reduce((max, line) => Math.max(max, line.length), 0) || Math.max(1, value.length);
  const lineCount = Math.max(1, lines.length);

  return Math.min(layout.height * (0.84 / lineCount), layout.width / Math.max(1.4, longestLine * 0.75));
}

export function normalizeTextSizes(textSize: PieceTextSize | undefined, layouts: TextLayout[], text: PieceText | undefined) {
  const sizes = Array.isArray(textSize) ? textSize : [];
  const values = normalizeTextValues(text, layouts);
  return layouts.map((layout, index) => getComputedTextFontSize(layout, values[index] ?? "", sizes[index]));
}

export function getDefaultTextValues(pieceKey: PieceKey, layouts: TextLayout[]) {
  if (pieceKey === "button.lineblock") {
    return ["A", "B", "C", "ODHL", "ODHL"];
  }

  if (pieceKey === "button.sign.sealedCounter") {
    return ["", "000000"];
  }

  return layouts.map(() => {
    if (pieceKey.startsWith("switch.single")) return "";
    if (pieceKey.startsWith("switch.extended")) return "";
    if (pieceKey.startsWith("switch.crossover")) return "";
    return "ABCD";
  });
}

export function getInitialTextForPiece(pieceKey: PieceKey) {
  const layouts = getTextLayouts(pieceKey);

  if (layouts.length === 0) {
    return undefined;
  }

  const defaults = getDefaultTextValues(pieceKey, layouts);
  return layouts.length === 1 ? defaults[0] : defaults;
}

function rotatePoint180(x: number, y: number, width: number, height: number) {
  return {
    x: width - x,
    y: height - y,
  };
}

function mirrorPointX(x: number, y: number, width: number) {
  return {
    x: width - x,
    y,
  };
}

function transformOverlayPoint(x: number, y: number, width: number, height: number, rotation: PieceRotation, mirrored: PieceMirror) {
  const rotated = rotation === 180 ? rotatePoint180(x, y, width, height) : { x, y };
  return mirrored ? mirrorPointX(rotated.x, rotated.y, width) : rotated;
}

function buildSvgTransform(width: number, height: number, rotation: PieceRotation, mirrored: PieceMirror) {
  const transforms: string[] = [];

  if (rotation === 180) {
    transforms.push(`rotate(180 ${width / 2} ${height / 2})`);
  }

  if (mirrored) {
    transforms.push(`translate(${width} 0) scale(-1 1)`);
  }

  return transforms.length > 0 ? transforms.join(" ") : undefined;
}

function buildCssTransform(rotation: PieceRotation, mirrored: PieceMirror) {
  const transforms: string[] = [];

  if (rotation === 180) {
    transforms.push("rotate(180deg)");
  }

  if (mirrored) {
    transforms.push("scaleX(-1)");
  }

  return transforms.length > 0 ? transforms.join(" ") : undefined;
}

function shouldPreserveTextCase(pieceKey: PieceKey, index: number) {
  return pieceKey === "button.sign.sealedCounter" && index === 0;
}

function getTextMaxLength(layout: TextLayout) {
  return layout.label === "Note" ? undefined : layout.maxLength;
}

function isDefaultTextSize(pieceKey: PieceKey, text: PieceText | undefined, textSize: PieceTextSize | undefined) {
  const layouts = getTextLayouts(pieceKey);
  if (layouts.length === 0 || !textSize || textSize.length === 0) {
    return true;
  }

  const values = normalizeTextValues(text, layouts);
  return textSize.every((size, index) => {
    const expected = getComputedTextFontSize(layouts[index], values[index] ?? "");
    return Math.abs(size - expected) < 0.05;
  });
}

function renderTextOverlays(
  pieceKey: PieceKey,
  text: PieceText | undefined,
  textSize: PieceTextSize | undefined,
  rotation: PieceRotation,
  mirrored: PieceMirror,
  width: number,
  height: number,
) {
  const layouts = getTextLayouts(pieceKey);

  if (layouts.length === 0) {
    return [];
  }

  const values = normalizeTextValues(text, layouts);
  const sizes = normalizeTextSizes(textSize, layouts, text);

  return layouts.flatMap((layout, index) => {
    const value = values[index]?.trim();

    if (!value) {
      return [];
    }

    const cx = layout.x + layout.width / 2;
    const cy = layout.y + layout.height / 2;
    const point = transformOverlayPoint(cx, cy, width, height, rotation, mirrored);
    const textRotation = mirrored && layout.rotate ? -layout.rotate : layout.rotate;
    const fontSize = sizes[index];
    const lines = value.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
    const renderedLines = lines.length > 0 ? lines : [value];
    const lineHeight = fontSize * 1.04;
    const startY = point.y - ((renderedLines.length - 1) * lineHeight) / 2;

    return (
      <text
        key={`text-${layout.label}-${index}`}
        x={point.x}
        y={startY}
        textAnchor="middle"
        dominantBaseline="middle"
        transform={textRotation ? `rotate(${textRotation} ${point.x} ${point.y})` : undefined}
        fill={layout.fill ?? "#27282b"}
        fontSize={fontSize}
        fontFamily={layout.fontFamily ?? "Consolas, 'Courier New', monospace"}
        letterSpacing={layout.letterSpacing ?? 0.5}
      >
        {renderedLines.map((line, lineIndex) => (
          <tspan key={`${layout.label}-${index}-${lineIndex}`} x={point.x} dy={lineIndex === 0 ? 0 : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    );
  });
}

function renderOverlay(
  pieceKey: PieceKey,
  piece: PieceDefinition,
  state: string,
  rotation: PieceRotation,
  mirrored: PieceMirror,
  textSize: PieceTextSize | undefined,
  text?: PieceText,
) {
  const kind = piece.stateModel.kind;
  const width = piece.bounds.width * SVG_TILE_UNIT;
  const height = piece.bounds.height * SVG_TILE_UNIT;
  const nodes: ReactNode[] = [];
  const textNodes: ReactNode[] = [];
  const overlayTransform = buildSvgTransform(width, height, rotation, mirrored);
  const suppressStates = suppressStateEditing(pieceKey, piece);

  if (kind === "trackOccupancy" && !suppressStates && state !== "clear") {
    nodes.push(
      ...getTrackOverlayRects(pieceKey).map((rect, index) => (
        <rect
          key={`track-rect-${index}`}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          rx={rect.rx}
          fill={getStateColor(kind, state)}
          opacity={0.92}
        />
      )),
    );
  }

  if (kind === "switchPosition" && !suppressStates) {
    const parsed = parseSwitchState(pieceKey, state);
    const pathColor = getSwitchColor(parsed.aspect);
    const shapes = getSwitchOverlayShapes(pieceKey, state);

    if (parsed.aspect !== "clear") {
      if (shapes.length > 0) {
        nodes.push(
          ...shapes.map((shape, index) => {
            const rectNode = (
              <rect
                key={`switch-rect-${index}`}
                x={shape.x}
                y={shape.y}
                width={shape.width}
                height={shape.height}
                rx={shape.rx}
                fill={pathColor}
                opacity={0.92}
                transform={shape.transform}
                className={parsed.pulse ? styles.pulsePath : ""}
              />
            );

            if (!shape.clip) {
              return rectNode;
            }

            const clipId = `switch-clip-${pieceKey.replace(/\./g, "-")}-${parsed.route}-${index}`;

            return (
              <g key={`switch-group-${index}`}>
                <clipPath id={clipId}>
                  <rect x={shape.clip.x} y={shape.clip.y} width={shape.clip.width} height={shape.clip.height} />
                </clipPath>
                <g clipPath={`url(#${clipId})`}>{rectNode}</g>
              </g>
            );
          }),
        );
      } else {
        nodes.push(
          ...getSwitchGeometry(pieceKey, state).map((path) => (
            <path
              key={path}
              d={path}
              fill="none"
              stroke={pathColor}
              strokeWidth={8}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.92}
              className={parsed.pulse ? styles.pulsePath : ""}
            />
          )),
        );
      }
    }
  }

  if (kind === "switchCrossover" && !suppressStates) {
    const geometry = getCrossoverGeometry(pieceKey);
    const parsed = parseCrossoverState(state);

    if (geometry) {
      const segments = [
        {
          paths: geometry.top[parsed.top.route],
          aspect: parsed.top.aspect,
          key: "top",
        },
        {
          paths: geometry.bottom[parsed.bottom.route],
          aspect: parsed.bottom.aspect,
          key: "bottom",
        },
      ];

      nodes.push(
        ...segments.flatMap((segment) => {
          if (segment.aspect === "clear") {
            return [];
          }

          const pathColor = getSwitchColor(segment.aspect);

          return segment.paths.map((path, index) => (
            <path
              key={`${segment.key}-${index}`}
              d={path}
              fill="none"
              stroke={pathColor}
              strokeWidth={8}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.92}
            />
          ));
        }),
      );
    }
  }

  if (kind === "signalAspect") {
    nodes.push(
      ...getSignalLampLayout(pieceKey, state).map((lamp) => (
        <circle
          key={`${lamp.x}-${lamp.y}-${lamp.color}`}
          cx={lamp.x}
          cy={lamp.y}
          r={lamp.r}
          fill={lamp.color}
          className={state === "white" ? styles.flashLamp : undefined}
        />
      )),
    );
  }

  if (kind === "threePositionSelector") {
    nodes.push(
      <g key="selector-reset">
        <polygon points={SELECTOR_HANDLE_POLYGON} fill={SELECTOR_PANEL_FILL} />
        <path d={SELECTOR_HANDLE_PATH} fill={SELECTOR_PANEL_FILL} />
        <circle cx={37.5} cy={127.78} r={22.26} fill={SELECTOR_RING_FILL} />
        <circle cx={37.5} cy={127.78} r={17.6} fill={SELECTOR_CORE_FILL} />
      </g>,
    );

    nodes.push(
      ...getSelectorLampLayout(state).map((lamp) => (
        <circle
          key={`${lamp.x}-${lamp.y}-${lamp.color}`}
          cx={lamp.x}
          cy={lamp.y}
          r={lamp.r}
          fill={lamp.color}
          className={styles.signalLampSvg}
        />
      )),
    );

    nodes.push(
      <g key="selector-pointer" transform={`rotate(${SELECTOR_POINTER_ANGLES[state] ?? 0} 37.5 127.78)`}>
        <polygon points={SELECTOR_HANDLE_POLYGON} fill="#a1a1a1" />
        <path d={SELECTOR_HANDLE_PATH} fill="#b3b3b3" />
      </g>,
    );
  }

  if (kind === "indicator") {
    nodes.push(
      ...getControlLampLayout(pieceKey, state).map((lamp) => (
        <circle
          key={`${lamp.x}-${lamp.y}-${lamp.color}`}
          cx={lamp.x}
          cy={lamp.y}
          r={lamp.r}
          fill={lamp.color}
          className={state === "flashing" ? styles.flashLamp : styles.signalLampSvg}
        />
      )),
    );
  }

  if (kind === "lineblockPanel") {
    nodes.push(
      ...getLineblockLampLayout(state).map((lamp) => (
        <circle
          key={`${lamp.x}-${lamp.y}-${lamp.color}`}
          cx={lamp.x}
          cy={lamp.y}
          r={lamp.r}
          fill={lamp.color}
          className={styles.signalLampSvg}
        />
      )),
    );
  }

  if (kind === "momentaryCommand" || kind === "sealedCommand") {
    nodes.push(
      ...getControlLampLayout(pieceKey, state).map((lamp) => (
        <circle
          key={`${lamp.x}-${lamp.y}-${lamp.color}`}
          cx={lamp.x}
          cy={lamp.y}
          r={lamp.r}
          fill={lamp.color}
          className={styles.signalLampSvg}
        />
      )),
    );
  }

  if (pieceKey === "button.shuntBufferSignal" && state === "armed") {
    nodes.push(<circle key="shunt-buffer-signal" cx={7.67} cy={15} r={4.78} fill="#f7f8fb" />);
  }

  textNodes.push(...renderTextOverlays(pieceKey, text, textSize, rotation, mirrored, width, height));

  if (nodes.length === 0 && textNodes.length === 0) {
    return null;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={styles.overlaySvg} aria-hidden="true">
      {nodes.length > 0 ? <g transform={overlayTransform}>{nodes}</g> : null}
      {textNodes}
    </svg>
  );
}

export function PiecePreview({
  pieceKey,
  piece,
  state,
  rotation = 0,
  mirrored = false,
  textSize,
  text,
  tileSize,
}: {
  pieceKey: PieceKey;
  piece: PieceDefinition;
  state: string;
  rotation?: PieceRotation;
  mirrored?: PieceMirror;
  textSize?: PieceTextSize;
  text?: PieceText;
  tileSize: number;
}) {
  const width = piece.bounds.width * tileSize;
  const height = piece.bounds.height * tileSize;
  const assetTransform = buildCssTransform(rotation, mirrored);

  return (
    <div className={styles.piecePreview} style={{ width, height }}>
      <Image
        src={piece.asset}
        alt=""
        fill
        unoptimized
        sizes={`${width}px`}
        className={styles.pieceArt}
        style={{ transform: assetTransform }}
        draggable="false"
      />
      {renderOverlay(pieceKey, piece, state, rotation, mirrored, textSize, text)}
    </div>
  );
}

function sortCells(cells: GridCell[]) {
  return [...cells].sort((a, b) => (a.y - b.y) || (a.x - b.x));
}

function isSameCell(a: GridCell, b: GridCell) {
  return a.x === b.x && a.y === b.y;
}

function toggleCell(selection: GridCell[], cell: GridCell) {
  const exists = selection.some((entry) => isSameCell(entry, cell));
  if (exists) {
    return selection.filter((entry) => !isSameCell(entry, cell));
  }

  return sortCells([...selection, cell]);
}

function getSelectionOrigin(cells: GridCell[]) {
  return {
    x: Math.min(...cells.map((cell) => cell.x)),
    y: Math.min(...cells.map((cell) => cell.y)),
  };
}

function normalizeSelection(cells: GridCell[]) {
  if (cells.length === 0) {
    return [];
  }

  const origin = getSelectionOrigin(cells);
  return sortCells(
    cells.map((cell) => ({
      x: cell.x - origin.x,
      y: cell.y - origin.y,
    })),
  );
}

function getPieceOccupiedCells(placedPiece: PlacedPiece) {
  const definition = catalogData.pieces[placedPiece.pieceKey];
  return definition.occupied.map(([offsetX, offsetY]) => ({
    x: placedPiece.x + offsetX,
    y: placedPiece.y + offsetY,
  }));
}

function selectionExactlyMatchesPiece(selection: GridCell[], placedPiece: PlacedPiece) {
  if (selection.length === 0) {
    return false;
  }

  const pieceCells = sortCells(getPieceOccupiedCells(placedPiece));
  const sortedSelection = sortCells(selection);

  if (pieceCells.length !== sortedSelection.length) {
    return false;
  }

  return pieceCells.every((cell, index) => isSameCell(cell, sortedSelection[index]));
}

function getCompatiblePieces(selection: GridCell[]) {
  if (selection.length === 0) {
    return [];
  }

  const normalizedSelection = normalizeSelection(selection);

  return placeableEntries.filter(([, piece]) => {
    if (piece.occupied.length !== normalizedSelection.length) {
      return false;
    }

    const normalizedPiece = sortCells(piece.occupied.map(([x, y]) => ({ x, y })));
    return normalizedPiece.every((cell, index) => isSameCell(cell, normalizedSelection[index]));
  });
}

function intersectsSelection(placedPiece: PlacedPiece, selection: GridCell[]) {
  const occupiedCells = getPieceOccupiedCells(placedPiece);
  return occupiedCells.some((cell) => selection.some((selected) => isSameCell(cell, selected)));
}

function pieceOccupiesCell(placedPiece: PlacedPiece, cell: GridCell) {
  return getPieceOccupiedCells(placedPiece).some((occupied) => isSameCell(occupied, cell));
}

function sanitizeTextValue(pieceKey: PieceKey, value: PieceText | undefined) {
  const layouts = getTextLayouts(pieceKey);

  if (layouts.length === 0 || value === undefined) {
    return undefined;
  }

  const normalized = normalizeTextValues(value, layouts).map((entry, index) =>
    shouldPreserveTextCase(pieceKey, index) ? entry.trim() : entry.trim().toUpperCase(),
  );
  if (normalized.every((entry) => entry.length === 0)) {
    return undefined;
  }

  return normalized.length === 1 ? normalized[0] : normalized;
}

function isDefaultText(pieceKey: PieceKey, value: PieceText | undefined) {
  const layouts = getTextLayouts(pieceKey);
  if (layouts.length === 0) {
    return true;
  }

  const expected = normalizeTextValues(getInitialTextForPiece(pieceKey), layouts);
  const actual = normalizeTextValues(value, layouts);
  return actual.every((entry, index) => entry === expected[index]);
}

function createPlacedPiece(pieceKey: PieceKey, x: number, y: number): PlacedPiece {
  const piece = catalogData.pieces[pieceKey];
  return {
    id: crypto.randomUUID(),
    pieceKey,
    x,
    y,
    state: getDefaultState(piece),
    rotation: 0,
    mirrored: false,
    text: getInitialTextForPiece(pieceKey),
    textSize: undefined,
  };
}

function clampBoardValue(value: number, fallback: number) {
  if (Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(4, Math.min(60, value));
}

function trimPiecesToBoard(pieces: PlacedPiece[], columns: number, rows: number) {
  return pieces.filter((placedPiece) => {
    const definition = catalogData.pieces[placedPiece.pieceKey];
    return placedPiece.x + definition.bounds.width <= columns && placedPiece.y + definition.bounds.height <= rows;
  });
}

function buildExportJson(columns: number, rows: number, pieces: PlacedPiece[]) {
  const instances = pieces
    .map((placedPiece) => {
      const definition = catalogData.pieces[placedPiece.pieceKey];
      const serializedText = sanitizeTextValue(placedPiece.pieceKey, placedPiece.text);
      const instance: Record<string, unknown> = {
        id: placedPiece.id,
        pieceKey: placedPiece.pieceKey,
        x: placedPiece.x,
        y: placedPiece.y,
      };

      if (placedPiece.state !== getDefaultState(definition)) {
        instance.state = placedPiece.state;
      }

      if (placedPiece.rotation !== 0) {
        instance.rotation = placedPiece.rotation;
      }

      if (placedPiece.mirrored) {
        instance.mirrored = true;
      }

      if (serializedText !== undefined && !isDefaultText(placedPiece.pieceKey, serializedText)) {
        instance.text = serializedText;
      }

      if (placedPiece.textSize && !isDefaultTextSize(placedPiece.pieceKey, placedPiece.text, placedPiece.textSize)) {
        instance.textSize = placedPiece.textSize.map((size) => Number(size.toFixed(2)));
      }

      return instance;
    })
    .sort((a, b) => {
      const ay = Number(a.y);
      const by = Number(b.y);
      if (ay !== by) return ay - by;
      return Number(a.x) - Number(b.x);
    });

  return JSON.stringify(
    {
      schemaVersion: 1,
      board: {
        columns,
        rows,
        tileAsset: "board.base",
      },
      instances,
    },
    null,
    2,
  );
}

function parseImportedPieces(raw: string) {
  const parsed = JSON.parse(raw) as {
    board?: { columns?: number; rows?: number };
    instances?: Array<{
      id?: string;
      pieceKey?: string;
      x?: number;
      y?: number;
      state?: string;
      rotation?: number;
      mirrored?: boolean;
      text?: PieceText;
      textSize?: number[];
    }>;
  };

  const importedColumns = clampBoardValue(Number(parsed.board?.columns), INITIAL_COLUMNS);
  const importedRows = clampBoardValue(Number(parsed.board?.rows), INITIAL_ROWS);
  const nextPieces: PlacedPiece[] = [];

  for (const instance of parsed.instances ?? []) {
    if (!instance?.pieceKey || !(instance.pieceKey in catalogData.pieces)) {
      continue;
    }

    const pieceKey = instance.pieceKey as PieceKey;
    const definition = catalogData.pieces[pieceKey];
    const x = Math.max(0, Math.floor(Number(instance.x ?? 0)));
    const y = Math.max(0, Math.floor(Number(instance.y ?? 0)));

    if (x + definition.bounds.width > importedColumns || y + definition.bounds.height > importedRows) {
      continue;
    }

    nextPieces.push({
      id: typeof instance.id === "string" && instance.id.length > 0 ? instance.id : crypto.randomUUID(),
      pieceKey,
      x,
      y,
      state: typeof instance.state === "string" ? instance.state : getDefaultState(definition),
      rotation: instance.rotation === 180 ? 180 : 0,
      mirrored: instance.mirrored === true,
      text: instance.text,
      textSize: Array.isArray(instance.textSize)
        ? instance.textSize.map((size) => Math.max(4, Math.min(72, Number(size) || 0)))
        : undefined,
    });
  }

  return {
    columns: importedColumns,
    rows: importedRows,
    pieces: nextPieces,
  };
}

export default function BoardDemo() {
  const [columns, setColumns] = useState(INITIAL_COLUMNS);
  const [rows, setRows] = useState(INITIAL_ROWS);
  const [pieces, setPieces] = useState<PlacedPiece[]>([]);
  const [selection, setSelection] = useState<GridCell[]>([]);
  const [pieceSearch, setPieceSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const compatiblePieces = useMemo(() => getCompatiblePieces(selection), [selection]);
  const filteredCompatiblePieces = useMemo(() => {
    const query = pieceSearch.trim().toLowerCase();

    if (!query) {
      return compatiblePieces;
    }

    return compatiblePieces.filter(([pieceKey, piece]) => {
      return (
        pieceKey.toLowerCase().includes(query) ||
        piece.category.toLowerCase().includes(query) ||
        piece.layer.toLowerCase().includes(query)
      );
    });
  }, [compatiblePieces, pieceSearch]);
  const exactSelectedPiece = useMemo(
    () => pieces.find((placedPiece) => selectionExactlyMatchesPiece(selection, placedPiece)) ?? null,
    [pieces, selection],
  );
  const selectionOrigin = selection.length > 0 ? getSelectionOrigin(selection) : null;
  const exportJson = useMemo(() => buildExportJson(columns, rows, pieces), [columns, rows, pieces]);

  function updateBoardSize(nextColumns: number, nextRows: number) {
    const clampedColumns = clampBoardValue(nextColumns, columns);
    const clampedRows = clampBoardValue(nextRows, rows);
    setColumns(clampedColumns);
    setRows(clampedRows);
    setPieces((current) => trimPiecesToBoard(current, clampedColumns, clampedRows));
    setSelection((current) => current.filter((cell) => cell.x < clampedColumns && cell.y < clampedRows));
  }

  function handleTileClick(cell: GridCell, event: MouseEvent<HTMLButtonElement>) {
    const isMultiSelect = event.ctrlKey || event.metaKey;
    setSelection((current) => {
      if (isMultiSelect) {
        return toggleCell(current, cell);
      }

      return [cell];
    });
  }

  function placePiece(pieceKey: PieceKey) {
    if (!selectionOrigin) {
      return;
    }

    const definition = catalogData.pieces[pieceKey];
    if (selectionOrigin.x + definition.bounds.width > columns || selectionOrigin.y + definition.bounds.height > rows) {
      return;
    }

    const nextPiece = createPlacedPiece(pieceKey, selectionOrigin.x, selectionOrigin.y);
    setPieces((current) => {
      const cleaned = current.filter((placedPiece) => !intersectsSelection(placedPiece, selection));
      return [...cleaned, nextPiece];
    });
  }

  function eraseSelection() {
    if (selection.length === 0) {
      return;
    }

    setPieces((current) => current.filter((placedPiece) => !intersectsSelection(placedPiece, selection)));
  }

  function clearBoard() {
    setPieces([]);
    setSelection([]);
  }

  function removePiece(target: PlacedPiece) {
    setPieces((current) => current.filter((placedPiece) => placedPiece.id !== target.id));
    setSelection((current) => (selectionExactlyMatchesPiece(current, target) ? [] : current));
  }

  function removePieceAtCell(cell: GridCell) {
    const target = [...pieces].reverse().find((placedPiece) => pieceOccupiesCell(placedPiece, cell));

    if (!target) {
      return;
    }

    removePiece(target);
  }

  async function copyJson() {
    await navigator.clipboard.writeText(exportJson);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  function updateSelectedPieceState(state: string) {
    if (!exactSelectedPiece) {
      return;
    }

    setPieces((current) =>
      current.map((placedPiece) =>
        placedPiece.id === exactSelectedPiece.id
          ? {
              ...placedPiece,
              state,
            }
          : placedPiece,
      ),
    );
  }

  function updateSelectedPieceText(index: number, value: string) {
    if (!exactSelectedPiece) {
      return;
    }

    const layouts = getTextLayouts(exactSelectedPiece.pieceKey);
    const normalized = normalizeTextValues(exactSelectedPiece.text, layouts);
    const nextValues = [...normalized];
    nextValues[index] = shouldPreserveTextCase(exactSelectedPiece.pieceKey, index) ? value : value.toUpperCase();
    const nextText = nextValues.length === 1 ? nextValues[0] : nextValues;

    setPieces((current) =>
      current.map((placedPiece) =>
        placedPiece.id === exactSelectedPiece.id
          ? {
              ...placedPiece,
              text: nextText,
              textSize: placedPiece.textSize,
            }
          : placedPiece,
      ),
    );
  }

  function updateSelectedPieceTextSize(index: number, value: number) {
    if (!exactSelectedPiece) {
      return;
    }

    const layouts = getTextLayouts(exactSelectedPiece.pieceKey);
    const normalizedSizes = normalizeTextSizes(exactSelectedPiece.textSize, layouts, exactSelectedPiece.text);
    const nextSizes = [...normalizedSizes];
    nextSizes[index] = Math.max(4, Math.min(72, value || normalizedSizes[index]));
    const clearedSizes = isDefaultTextSize(exactSelectedPiece.pieceKey, exactSelectedPiece.text, nextSizes) ? undefined : nextSizes;

    setPieces((current) =>
      current.map((placedPiece) =>
        placedPiece.id === exactSelectedPiece.id
          ? {
              ...placedPiece,
              textSize: clearedSizes,
            }
          : placedPiece,
      ),
    );
  }

  function updateSelectedPieceRotation(rotation: PieceRotation) {
    if (!exactSelectedPiece) {
      return;
    }

    setPieces((current) =>
      current.map((placedPiece) =>
        placedPiece.id === exactSelectedPiece.id
          ? {
              ...placedPiece,
              rotation,
            }
          : placedPiece,
      ),
    );
  }

  function updateSelectedPieceMirroring(mirrored: PieceMirror) {
    if (!exactSelectedPiece) {
      return;
    }

    setPieces((current) =>
      current.map((placedPiece) =>
        placedPiece.id === exactSelectedPiece.id
          ? {
              ...placedPiece,
              mirrored,
            }
          : placedPiece,
      ),
    );
  }

  function importJson(raw: string) {
    const imported = parseImportedPieces(raw);
    setColumns(imported.columns);
    setRows(imported.rows);
    setPieces(imported.pieces);
    setSelection([]);
    setPieceSearch("");
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const raw = await file.text();
    importJson(raw);
    event.target.value = "";
  }

  const selectedPieceDefinition = exactSelectedPiece ? catalogData.pieces[exactSelectedPiece.pieceKey] : null;
  const selectedPieceTextLayouts = exactSelectedPiece ? getTextLayouts(exactSelectedPiece.pieceKey) : [];
  const selectedPieceTextValues = exactSelectedPiece
    ? normalizeTextValues(exactSelectedPiece.text, selectedPieceTextLayouts)
    : [];
  const selectedPieceTextSizes = exactSelectedPiece
    ? normalizeTextSizes(exactSelectedPiece.textSize, selectedPieceTextLayouts, exactSelectedPiece.text)
    : [];

  return (
    <main className={styles.editorPage}>
      <div className={styles.editorShell}>
        <section className={styles.workspace}>
          <article className={styles.boardPanel}>
            <div className={styles.cornerToolbar}>
              <label className={styles.compactField}>
                <span>C</span>
                <input
                  type="number"
                  min={4}
                  max={60}
                  value={columns}
                  onChange={(event) => updateBoardSize(Number(event.target.value), rows)}
                />
              </label>

              <label className={styles.compactField}>
                <span>R</span>
                <input
                  type="number"
                  min={4}
                  max={60}
                  value={rows}
                  onChange={(event) => updateBoardSize(columns, Number(event.target.value))}
                />
              </label>

              <button type="button" className={styles.iconButton} onClick={() => setSelection([])}>
                Clear
              </button>

              <button type="button" className={styles.iconButton} onClick={eraseSelection} disabled={selection.length === 0}>
                Erase
              </button>

              <button type="button" className={styles.iconButtonDanger} onClick={clearBoard} disabled={pieces.length === 0}>
                Reset
              </button>
            </div>

            <header className={styles.panelHeader}>
              <div>
                <h2>Board</h2>
                <p>{selection.length === 0 ? "Click to select. Ctrl/Cmd for multi-select." : `${selection.length} tile(s) selected.`}</p>
              </div>
              <div className={styles.statLine}>
                <span>{pieces.length} placed</span>
                <span>{compatiblePieces.length} matching piece(s)</span>
              </div>
            </header>

            <div className={styles.boardScroller}>
              <div
                className={styles.editorBoard}
                style={
                  {
                    width: columns * BOARD_TILE,
                    height: rows * BOARD_TILE,
                    "--board-columns": columns,
                    "--board-rows": rows,
                    "--board-tile": `${BOARD_TILE}px`,
                  } as CSSProperties
                }
              >
                <div className={styles.boardPieces}>
                  {pieces.map((placedPiece) => {
                    const piece = catalogData.pieces[placedPiece.pieceKey];
                    const isSelected = exactSelectedPiece?.id === placedPiece.id;

                    return (
                      <div
                        key={placedPiece.id}
                        className={`${styles.boardPiece} ${isSelected ? styles.boardPieceSelected : ""}`}
                        style={{
                          left: placedPiece.x * BOARD_TILE,
                          top: placedPiece.y * BOARD_TILE,
                          width: piece.bounds.width * BOARD_TILE,
                          height: piece.bounds.height * BOARD_TILE,
                        }}
                        title="Right-click a tile to remove"
                      >
                        <PiecePreview
                          pieceKey={placedPiece.pieceKey}
                          piece={piece}
                          state={placedPiece.state}
                          rotation={placedPiece.rotation}
                          mirrored={placedPiece.mirrored}
                          textSize={placedPiece.textSize}
                          text={placedPiece.text}
                          tileSize={BOARD_TILE}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className={styles.tileGrid}>
                  {Array.from({ length: rows * columns }, (_, index) => {
                    const x = index % columns;
                    const y = Math.floor(index / columns);
                    const selected = selection.some((cell) => cell.x === x && cell.y === y);

                    return (
                      <button
                        key={`${x}-${y}`}
                        type="button"
                        className={`${styles.tileButton} ${selected ? styles.tileButtonSelected : ""}`}
                        onClick={(event) => handleTileClick({ x, y }, event)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          removePieceAtCell({ x, y });
                        }}
                        aria-label={`Tile ${x}, ${y}`}
                      >
                        <span className={styles.tileCoord}>
                          {x},{y}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </article>

          <aside className={styles.sidebar}>
            <section className={styles.sidebarCard}>
              <header className={styles.panelHeader}>
                <div>
                  <h2>Matching pieces</h2>
                </div>
              </header>

              <label className={styles.searchField}>
                <span>Search</span>
                <input
                  type="text"
                  value={pieceSearch}
                  onChange={(event) => setPieceSearch(event.target.value)}
                  placeholder="switch, signal, noocp..."
                />
              </label>

              {selection.length === 0 ? (
                <p className={styles.emptyState}>No selection yet.</p>
              ) : compatiblePieces.length === 0 ? (
                <p className={styles.emptyState}>No catalog piece matches this tile shape.</p>
              ) : filteredCompatiblePieces.length === 0 ? (
                <p className={styles.emptyState}>No matching piece fits both the shape and your search.</p>
              ) : (
                <div className={styles.matchGrid}>
                  {filteredCompatiblePieces.map(([pieceKey, piece]) => (
                    <button key={pieceKey} type="button" className={styles.matchCard} onClick={() => placePiece(pieceKey)}>
                      <PiecePreview
                        pieceKey={pieceKey}
                        piece={piece}
                        state={getDefaultState(piece)}
                        rotation={0}
                        mirrored={false}
                        textSize={undefined}
                        text={getInitialTextForPiece(pieceKey)}
                        tileSize={PREVIEW_TILE}
                      />
                      <div className={styles.matchMeta}>
                        <strong>{pieceKey}</strong>
                        <span>
                          {piece.category} · {piece.bounds.width}x{piece.bounds.height}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className={styles.sidebarCard}>
              <header className={styles.panelHeader}>
                <div>
                  <h2>Selected piece</h2>
                </div>
              </header>

              {!exactSelectedPiece || !selectedPieceDefinition ? (
                <p className={styles.emptyState}>Select the full footprint of one placed piece to edit it.</p>
              ) : (
                <div className={styles.inspector}>
                  <p className={styles.metaLine}>
                    Anchor: [{exactSelectedPiece.x}, {exactSelectedPiece.y}]
                  </p>

                  <label className={styles.field}>
                    <select
                      value={exactSelectedPiece.rotation}
                      onChange={(event) => updateSelectedPieceRotation(Number(event.target.value) as PieceRotation)}
                      aria-label="Rotation"
                    >
                      <option value={0}>0°</option>
                      <option value={180}>180°</option>
                    </select>
                  </label>

                  <label className={styles.field}>
                    <select
                      value={exactSelectedPiece.mirrored ? "yes" : "no"}
                      onChange={(event) => updateSelectedPieceMirroring(event.target.value === "yes")}
                      aria-label="Mirrored"
                    >
                      <option value="no">Normal</option>
                      <option value="yes">Mirrored</option>
                    </select>
                  </label>

                  {getStateOptions(selectedPieceDefinition, exactSelectedPiece.pieceKey).length > 0 ? (
                    <label className={styles.field}>
                      <select value={exactSelectedPiece.state} onChange={(event) => updateSelectedPieceState(event.target.value)} aria-label="State">
                        {getStateOptions(selectedPieceDefinition, exactSelectedPiece.pieceKey).map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  {selectedPieceTextLayouts.map((layout, index) => (
                    <div key={`${layout.label}-${index}`} className={styles.textFieldStack}>
                      <label className={styles.field}>
                        <textarea
                          rows={2}
                          maxLength={getTextMaxLength(layout)}
                          value={selectedPieceTextValues[index] ?? ""}
                          onChange={(event) => updateSelectedPieceText(index, event.target.value)}
                          placeholder={layout.label}
                          aria-label={layout.label}
                        />
                      </label>
                      <label className={styles.field}>
                        <input
                          type="number"
                          min={4}
                          max={72}
                          step={0.5}
                          value={selectedPieceTextSizes[index] ?? layout.fontSize ?? 12}
                          onChange={(event) => updateSelectedPieceTextSize(index, Number(event.target.value))}
                          placeholder="Size"
                          aria-label={`${layout.label} size`}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className={styles.sidebarCard}>
              <header className={styles.panelHeader}>
                <div>
                  <h2>Export JSON</h2>
                </div>
                <div className={styles.actionRow}>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImportFile}
                    className={styles.hiddenInput}
                  />
                  <button type="button" className={styles.secondaryButton} onClick={() => importInputRef.current?.click()}>
                    Import JSON
                  </button>
                  <button type="button" className={styles.secondaryButton} onClick={copyJson}>
                    {copied ? "Copied" : "Export JSON"}
                  </button>
                </div>
              </header>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
