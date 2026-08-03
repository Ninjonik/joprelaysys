"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import styles from "./page.module.css";
import catalogData from "./data/piece-catalog.json";

type PieceCatalog = typeof catalogData;
type PieceKey = keyof PieceCatalog["pieces"];
type PieceDefinition = PieceCatalog["pieces"][PieceKey];
type PieceText = string | string[];

type SceneElement = {
  id: string;
  pieceKey: PieceKey;
  x: number;
  y: number;
  state?: string;
  overlayState?: string;
  text?: PieceText;
  label?: string;
  onClick?: () => void;
};

const HORIZONTAL_TILE_COUNT = 30;
const PREVIEW_TILE = 46;
const SVG_TILE_UNIT = 75;

const pieceEntries = Object.entries(catalogData.pieces) as [PieceKey, PieceDefinition][];

const selectorCycle = ["left", "center", "right"] as const;
const occupancyCycle = ["clear", "occupied"] as const;

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
    stop: [{ x: 52.33, y: 60, r: 4.78, color: "#d84242" }],
    clear: [{ x: 22.33, y: 60, r: 4.78, color: "#63d29b" }],
  },
  "signal.entry.noocp": {
    stop: [{ x: 52.33, y: 60, r: 4.78, color: "#d84242" }],
    clear: [{ x: 22.33, y: 60, r: 4.78, color: "#63d29b" }],
  },
  "signal.departure2": {
    stop: [{ x: 37.67, y: 15, r: 4.78, color: "#d84242" }],
    clear: [{ x: 22.67, y: 15, r: 4.78, color: "#63d29b" }],
  },
  "signal.departure2.noocp": {
    stop: [{ x: 37.67, y: 15, r: 4.78, color: "#d84242" }],
    clear: [{ x: 22.67, y: 15, r: 4.78, color: "#63d29b" }],
  },
  "signal.premain": {
    warning: [{ x: 37.67, y: 15, r: 4.78, color: "#f0b948" }],
    expectStop: [{ x: 37.67, y: 15, r: 4.78, color: "#f0b948" }],
    clear: [{ x: 37.67, y: 15, r: 4.78, color: "#63d29b" }],
  },
  "signal.premain.noocp": {
    warning: [{ x: 37.67, y: 15, r: 4.78, color: "#f0b948" }],
    expectStop: [{ x: 37.67, y: 15, r: 4.78, color: "#f0b948" }],
    clear: [{ x: 37.67, y: 15, r: 4.78, color: "#63d29b" }],
  },
  "signal.shunt": {
    stop: [{ x: 37.33, y: 60, r: 4.78, color: "#d84242" }],
    proceed: [{ x: 37.33, y: 60, r: 4.78, color: "#63d29b" }],
  },
  "signal.shunt.noocp": {
    stop: [{ x: 37.33, y: 60, r: 4.78, color: "#d84242" }],
    proceed: [{ x: 37.33, y: 60, r: 4.78, color: "#63d29b" }],
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
    idle: [{ x: 37.5, y: 51.35, r: 6.73, color: "#636a6e" }],
    pressed: [{ x: 37.5, y: 51.35, r: 6.73, color: "#4ea7ff" }],
    armed: [{ x: 37.5, y: 51.35, r: 6.73, color: "#63d29b" }],
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
  left: [{ x: 16.04, y: 39.93, r: 6.05, color: "#4ea7ff" }],
  center: [{ x: 37.5, y: 21.63, r: 6.05, color: "#c5ccd0" }],
  right: [{ x: 58.96, y: 39.93, r: 6.05, color: "#63d29b" }],
};

const LINEBLOCK_LAMP_LAYOUTS: Record<string, OverlayLamp[]> = {
  idle: [],
  "right.requesting": [{ x: 112.5, y: 51.35, r: 6.73, color: "#f0b948" }],
  "right.granted": [{ x: 187.5, y: 51.35, r: 6.73, color: "#63d29b" }],
  "right.blocked": [{ x: 112.5, y: 51.35, r: 6.73, color: "#d84242" }],
  "left.requesting": [{ x: 112.5, y: 51.35, r: 6.73, color: "#f0b948" }],
  "left.granted": [{ x: 37.5, y: 51.35, r: 6.73, color: "#63d29b" }],
  "left.blocked": [{ x: 112.5, y: 51.35, r: 6.73, color: "#d84242" }],
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
  "button.sign.sealedCounter": [{ x: 4.99, y: 0, width: 65.01, height: 24.3, label: "Text", fontSize: 16, letterSpacing: 0.6, maxLength: 8 }],
  "button.switchSelector": [{ x: 4.77, y: 56.15, width: 65.47, height: 18.24, label: "Text", fontSize: 12, letterSpacing: 0.5, maxLength: 8 }],
  "button.lineblock": [
    { x: 4.99, y: 10.02, width: 65.01, height: 24.3, label: "Text 1", fontSize: 12, letterSpacing: 0.45, maxLength: 8 },
    { x: 79.99, y: 10.02, width: 65.01, height: 24.3, label: "Text 2", fontSize: 12, letterSpacing: 0.45, maxLength: 8 },
    { x: 154.99, y: 10.02, width: 65.01, height: 24.3, label: "Text 3", fontSize: 12, letterSpacing: 0.45, maxLength: 8 },
    { x: 4.99, y: 76.05, width: 65.01, height: 24.3, label: "Text 4", fontSize: 12, letterSpacing: 0.45, maxLength: 8 },
    { x: 154.99, y: 76.05, width: 65.01, height: 24.3, label: "Text 5", fontSize: 12, letterSpacing: 0.45, maxLength: 8 },
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
  "sign.fourLabel": [{ x: 4.99, y: 28.4, width: 290.01, height: 31.94, label: "Text", fontSize: 20, letterSpacing: 0.8, maxLength: 24 }],
};

type SwitchRoute = "normal" | "reverse" | "stem" | "upper";
type SwitchAspect = "clear" | "reserved" | "occupied" | "moving";

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

function getStateOptions(piece: PieceDefinition) {
  return "states" in piece.stateModel ? piece.stateModel.states : [];
}

function getDefaultState(piece: PieceDefinition) {
  return "defaultState" in piece.stateModel ? piece.stateModel.defaultState : "static";
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

  if (kind === "signalAspect") {
    if (state === "clear" || state === "proceed") return "#63d29b";
    if (state === "warning" || state === "expectStop") return "#f0b948";
    return "#d84242";
  }

  if (kind === "threePositionSelector") {
    if (state === "left") return "#4ea7ff";
    if (state === "right") return "#63d29b";
    return "#c5ccd0";
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

function nextValue<T extends readonly string[]>(values: T, current: string) {
  const index = values.indexOf(current as T[number]);
  return values[(index + 1) % values.length] as T[number];
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

function getTextLayouts(pieceKey: PieceKey) {
  return TEXT_LAYOUTS[pieceKey] ?? [];
}

function normalizeTextValues(text: PieceText | undefined, layouts: TextLayout[]) {
  const values = Array.isArray(text) ? text : [text ?? ""];
  return layouts.map((layout, index) => values[index] ?? (layouts.length === 1 ? values[0] ?? "" : ""));
}

function getDefaultTextValues(pieceKey: PieceKey, layouts: TextLayout[]) {
  if (pieceKey === "button.lineblock") {
    return ["A", "B", "C", "D", "E"];
  }

  return layouts.map((layout, index) => {
    if (pieceKey.startsWith("switch.single")) return "A6030";
    if (pieceKey.startsWith("switch.extended")) return index === 0 ? "A6030" : "A6031";
    return "ABCD";
  });
}

function getTextFontSize(layout: TextLayout, value: string) {
  if (layout.fontSize) {
    return layout.fontSize;
  }

  return Math.min(layout.height * 0.82, layout.width / Math.max(1.4, value.length * 0.75));
}

function renderTextOverlays(pieceKey: PieceKey, text: PieceText | undefined) {
  const layouts = getTextLayouts(pieceKey);

  if (layouts.length === 0) {
    return [];
  }

  const values = normalizeTextValues(text, layouts);

  return layouts.flatMap((layout, index) => {
    const value = values[index]?.trim();

    if (!value) {
      return [];
    }

    const cx = layout.x + layout.width / 2;
    const cy = layout.y + layout.height / 2;

    return (
      <text
        key={`text-${layout.label}-${index}`}
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        transform={layout.rotate ? `rotate(${layout.rotate} ${cx} ${cy})` : undefined}
        fill="#27282b"
        fontSize={getTextFontSize(layout, value)}
        fontFamily="Consolas, 'Courier New', monospace"
        letterSpacing={layout.letterSpacing ?? 0.5}
      >
        {value}
      </text>
    );
  });
}

function renderOverlay(pieceKey: PieceKey, piece: PieceDefinition, state: string, text?: PieceText) {
  const kind = piece.stateModel.kind;
  const width = piece.bounds.width * SVG_TILE_UNIT;
  const height = piece.bounds.height * SVG_TILE_UNIT;
  const color = getStateColor(kind, state);
  const nodes: React.ReactNode[] = [];

  if (kind === "trackOccupancy") {
    if (state !== "clear") {
      nodes.push(
        ...getTrackOverlayRects(pieceKey).map((rect, index) => (
          <rect
            key={`track-rect-${index}`}
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            rx={rect.rx}
            fill={color}
            opacity={0.92}
          />
        )),
      );
    }
  }

  if (kind === "switchPosition") {
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
                  <rect
                    x={shape.clip.x}
                    y={shape.clip.y}
                    width={shape.clip.width}
                    height={shape.clip.height}
                  />
                </clipPath>
                <g clipPath={`url(#${clipId})`}>{rectNode}</g>
              </g>
            );
          }),
        );
      } else {
        const paths = getSwitchGeometry(pieceKey, state);
        nodes.push(
          ...paths.map((path) => (
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

  if (kind === "signalAspect") {
    const lamps = getSignalLampLayout(pieceKey, state);
    nodes.push(
      ...lamps.map((lamp) => (
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

  if (kind === "threePositionSelector") {
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
  }

  if (kind === "indicator") {
    const lamps = getControlLampLayout(pieceKey, state);
    nodes.push(
      ...lamps.map((lamp) => (
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
    const lamps = getControlLampLayout(pieceKey, state);
    nodes.push(
      ...lamps.map((lamp) => (
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

  nodes.push(...renderTextOverlays(pieceKey, text));

  if (nodes.length === 0) {
    return null;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={styles.overlaySvg} aria-hidden="true">
      {nodes}
    </svg>
  );
}

function PiecePreview({
  pieceKey,
  piece,
  state,
  overlayState,
  text,
  tileSize,
  onClick,
  label,
}: {
  pieceKey: PieceKey;
  piece: PieceDefinition;
  state: string;
  overlayState?: string;
  text?: PieceText;
  tileSize: number;
  onClick?: () => void;
  label?: string;
}) {
  const width = piece.bounds.width * tileSize;
  const height = piece.bounds.height * tileSize;
  const caption = label ?? pieceKey;

  return (
    <button
      type="button"
      className={`${styles.piecePreview} ${onClick ? styles.piecePreviewInteractive : ""}`}
      style={{ width, height }}
      onClick={onClick}
      disabled={!onClick}
      aria-label={`${caption} (${state})`}
    >
      <Image src={piece.asset} alt="" fill unoptimized sizes={`${width}px`} className={styles.pieceArt} draggable="false" />
      {renderOverlay(pieceKey, piece, overlayState ?? state, text)}
    </button>
  );
}

function SceneBoard({
  elements,
  columns,
  rows,
  tileSize,
}: {
  elements: SceneElement[];
  columns: number;
  rows: number;
  tileSize: number;
}) {
  return (
    <div
      className={styles.sceneBoard}
      style={
        {
          width: columns * tileSize,
          height: rows * tileSize,
          "--scene-columns": columns,
          "--scene-rows": rows,
          "--scene-tile": `${tileSize}px`,
        } as CSSProperties
      }
    >
      {elements.map((element) => {
        const piece = catalogData.pieces[element.pieceKey];
        const state = element.state ?? getDefaultState(piece);

        return (
          <div
            key={element.id}
            className={styles.sceneElement}
            style={{
              left: element.x * tileSize,
              top: element.y * tileSize,
              width: piece.bounds.width * tileSize,
              height: piece.bounds.height * tileSize,
            }}
          >
            <PiecePreview
              pieceKey={element.pieceKey}
              piece={piece}
              state={state}
              overlayState={element.overlayState}
              text={element.text}
              tileSize={tileSize}
              onClick={element.onClick}
              label={element.label}
            />
          </div>
        );
      })}
    </div>
  );
}

function CatalogCard({
  pieceKey,
  piece,
}: {
  pieceKey: PieceKey;
  piece: PieceDefinition;
}) {
  const options = getStateOptions(piece);
  const [state, setState] = useState(getDefaultState(piece));
  const textLayouts = getTextLayouts(pieceKey);
  const [textValues, setTextValues] = useState(() => getDefaultTextValues(pieceKey, textLayouts));
  const overlayText = textLayouts.length <= 1 ? textValues[0] ?? "" : textValues;

  return (
    <article className={styles.catalogCard}>
      <header className={styles.catalogCardHeader}>
        <div>
          <h3>{pieceKey}</h3>
          <p>
            {piece.category} · {piece.bounds.width}x{piece.bounds.height} tiles
          </p>
        </div>
        <span className={styles.layerTag}>{piece.layer}</span>
      </header>

      <div className={styles.catalogPreview}>
        <PiecePreview pieceKey={pieceKey} piece={piece} state={state} text={overlayText} tileSize={PREVIEW_TILE} />
      </div>

      <div className={styles.catalogMeta}>
        <p className={styles.metaLine}>occupied: {piece.occupied.map((cell) => `[${cell.join(", ")}]`).join(" ")}</p>
        <p className={styles.metaLine}>state model: {piece.stateModel.kind}</p>
      </div>

      {options.length > 0 ? (
        <label className={styles.statePicker}>
          <span>State</span>
          <select value={state} onChange={(event) => setState(event.target.value)}>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className={styles.staticLabel}>Static asset</div>
      )}

      {textLayouts.map((layout, index) => (
        <label key={`${pieceKey}-${layout.label}-${index}`} className={styles.statePicker}>
          <span>{layout.label}</span>
          <input
            className={styles.textInput}
            value={textValues[index] ?? ""}
            maxLength={layout.maxLength ?? 12}
            onChange={(event) =>
              setTextValues((current) => {
                const next = [...current];
                next[index] = event.target.value.toUpperCase();
                return next;
              })
            }
          />
        </label>
      ))}
    </article>
  );
}

export default function BoardDemo() {
  const [leadOccupancy, setLeadOccupancy] = useState<(typeof occupancyCycle)[number]>("clear");
  const [lowerOccupancy, setLowerOccupancy] = useState<(typeof occupancyCycle)[number]>("clear");
  const [routeRequested, setRouteRequested] = useState(true);
  const [lowerRouteBuilt, setLowerRouteBuilt] = useState(true);
  const [selectorState, setSelectorState] = useState<(typeof selectorCycle)[number]>("center");
  const [switchState, setSwitchState] = useState("normal");

  const sceneSignalState = useMemo(() => {
    if (!routeRequested) return "stop";
    if (leadOccupancy === "occupied") return "stop";
    if (switchState === "moving") return "stop";
    return "clear";
  }, [leadOccupancy, routeRequested, switchState]);

  const leadTrackVisual = leadOccupancy === "occupied" ? "occupied" : routeRequested ? "reserved" : "clear";
  const selectedBranchVisual =
    leadOccupancy === "occupied" ? "occupied" : routeRequested ? "reserved" : "clear";
  const unselectedBranchVisual = "clear";
  const lowerTrackVisual =
    lowerOccupancy === "occupied" ? "occupied" : lowerRouteBuilt ? "reserved" : "clear";
  const switchOverlayState =
    switchState === "moving"
      ? switchState
      : switchState === "stem"
        ? leadOccupancy === "occupied"
          ? "stem.occupied"
          : routeRequested
            ? "stem.reserved"
            : "stem.clear"
      : switchState === "reverse"
        ? leadOccupancy === "occupied"
          ? "reverse.occupied"
          : routeRequested
            ? "reverse.reserved"
            : "reverse.clear"
        : leadOccupancy === "occupied"
          ? "normal.occupied"
          : routeRequested
            ? "normal.reserved"
            : "normal.clear";

  const sceneElements = useMemo<SceneElement[]>(() => {
    return [
      {
        id: "entry-signal",
        pieceKey: "signal.entry",
        x: 0,
        y: 3,
        state: sceneSignalState,
        label: "Entry signal",
      },
      ...Array.from({ length: 4 }, (_, index) => ({
        id: `lead-track-${index}`,
        pieceKey: "track.main" as PieceKey,
        x: index + 1,
        y: 3,
        state: leadTrackVisual,
        label: "Lead track",
        onClick: () => setLeadOccupancy(nextValue(occupancyCycle, leadOccupancy)),
      })),
      {
        id: "switch",
        pieceKey: "switch.extended",
        x: 5,
        y: 1,
        state: switchState,
        overlayState: switchOverlayState,
        label: "Turnout",
        onClick: () => {
          setSwitchState((current) =>
            current === "normal" ? "reverse" : current === "reverse" ? "stem" : "normal",
          );
          setSelectorState((current) => (current === "right" ? "left" : "right"));
        },
      },
      ...Array.from({ length: 4 }, (_, index) => ({
        id: `upper-branch-${index}`,
        pieceKey: "track.main" as PieceKey,
        x: index + 7,
        y: 1,
        state: switchState === "reverse" ? selectedBranchVisual : unselectedBranchVisual,
        label: "Upper branch",
      })),
      ...Array.from({ length: 4 }, (_, index) => ({
        id: `lower-branch-${index}`,
        pieceKey: "track.main" as PieceKey,
        x: index + 7,
        y: 3,
        state: switchState === "normal" ? selectedBranchVisual : unselectedBranchVisual,
        label: "Lower branch",
      })),
      ...Array.from({ length: 5 }, (_, index) => ({
        id: `yard-track-${index}`,
        pieceKey: "track.main" as PieceKey,
        x: index + 6,
        y: 5,
        state: lowerTrackVisual,
        label: "Lower route",
        onClick: index === 0 ? () => setLowerOccupancy(nextValue(occupancyCycle, lowerOccupancy)) : undefined,
      })),
      {
        id: "selector",
        pieceKey: "button.switchSelector",
        x: 12,
        y: 1,
        state: selectorState,
        label: "Switch selector",
        onClick: () => {
          const next = nextValue(selectorCycle, selectorState);
          setSelectorState(next);
          if (next === "left") setSwitchState("normal");
          if (next === "right") setSwitchState("reverse");
          if (next === "center") setSwitchState("stem");
        },
      },
      {
        id: "route-button",
        pieceKey: "button.sign",
        x: 12,
        y: 3,
        state: routeRequested ? "armed" : "idle",
        label: "Route request",
        onClick: () => setRouteRequested((current) => !current),
      },
      {
        id: "departure-button",
        pieceKey: "button.departure",
        x: 13,
        y: 3,
        state: sceneSignalState === "clear" ? "pressed" : "idle",
        label: "Departure command",
      },
      {
        id: "lower-route-button",
        pieceKey: "button.shunt",
        x: 12,
        y: 5,
        state: lowerRouteBuilt ? "armed" : "idle",
        label: "Lower route request",
        onClick: () => setLowerRouteBuilt((current) => !current),
      },
    ];
  }, [
    leadOccupancy,
    leadTrackVisual,
    lowerOccupancy,
    lowerRouteBuilt,
    lowerTrackVisual,
    routeRequested,
    sceneSignalState,
    selectedBranchVisual,
    selectorState,
    switchOverlayState,
    switchState,
    unselectedBranchVisual,
  ]);

  return (
    <main
      className={styles.board}
      style={{ "--board-columns": HORIZONTAL_TILE_COUNT } as CSSProperties}
    >
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Slovak relay board demo</p>
            <h1>State changes are a second rendering layer on top of the SVG artwork.</h1>
            <p className={styles.heroText}>
              The asset catalog defines footprint and allowed states. The renderer uses that metadata to place the base SVG,
              then paints route highlights, occupancy, lamps, and selector position as live overlays.
            </p>
          </div>

          <div className={styles.controlStrip}>
            <label className={styles.controlField}>
              <span>Lead occupancy</span>
              <select value={leadOccupancy} onChange={(event) => setLeadOccupancy(event.target.value as (typeof occupancyCycle)[number])}>
                <option value="clear">Clear</option>
                <option value="occupied">Occupied</option>
              </select>
            </label>

            <label className={styles.controlField}>
              <span>Lower occupancy</span>
              <select value={lowerOccupancy} onChange={(event) => setLowerOccupancy(event.target.value as (typeof occupancyCycle)[number])}>
                <option value="clear">Clear</option>
                <option value="occupied">Occupied</option>
              </select>
            </label>

            <label className={styles.controlField}>
              <span>Switch</span>
              <select value={switchState} onChange={(event) => setSwitchState(event.target.value)}>
                <option value="normal">1 to 3</option>
                <option value="reverse">1 to 2</option>
                <option value="stem">1 only</option>
                <option value="moving">Moving</option>
              </select>
            </label>

            <button type="button" className={styles.routeButton} onClick={() => setRouteRequested((current) => !current)}>
              {routeRequested ? "Cancel main route" : "Build main route"}
            </button>
          </div>
        </section>

        <section className={styles.demoGrid}>
          <article className={styles.scenePanel}>
            <header className={styles.panelHeader}>
              <div>
                <h2>Live Interlocking Scene</h2>
                <p>Click the route buttons, turnout, selector, lead track, or lower route.</p>
              </div>
              <div className={styles.sceneLegend}>
                <span><i className={styles.legendDefault} /> idle board</span>
                <span><i style={{ backgroundColor: "#f6f7f8" }} /> route built</span>
                <span><i style={{ backgroundColor: "#f05454" }} /> occupied</span>
              </div>
            </header>

            <div className={styles.sceneBoardWrap}>
              <SceneBoard elements={sceneElements} columns={14} rows={7} tileSize={46} />
            </div>

            <div className={styles.sceneNotes}>
              <p>
                Idle track is left untouched. A built route is shown in <strong>white</strong>. Occupancy overrides the route and turns
                the segment <strong>red</strong>.
              </p>
              <p>
                The turnout does not become green. It only shows the selected path in white or red depending on whether the routed
                segment is occupied.
              </p>
            </div>
          </article>

          <article className={styles.archPanel}>
            <header className={styles.panelHeader}>
              <div>
                <h2>How State Switching Works</h2>
                <p>What the app needs in order to recolor track, lamps, and selected paths.</p>
              </div>
            </header>

            <div className={styles.archList}>
              <p>
                `piece-catalog.json` defines the allowed states, footprint, and asset path for each element.
              </p>
              <p>
                A station layout file places instances on the board and stores only position plus piece id.
              </p>
              <p>
                Runtime state should be split, for example `track-4.occupied = true`, `track-4.routeBuilt = true`,
                `switch-12.position = reverse`.
              </p>
              <p>
                The renderer combines base SVG + state overlay. Route highlight and occupancy are separate concerns, and occupancy
                has higher priority.
              </p>
              <p>
                For production accuracy, the next step is to add per-piece overlay geometry into the catalog instead of
                hardcoding the demo paths in React.
              </p>
            </div>
          </article>
        </section>

        <section className={styles.catalogSection}>
          <header className={styles.panelHeader}>
            <div>
              <h2>Catalog Playground</h2>
              <p>Every current asset from `public/assets` rendered with its state model.</p>
            </div>
          </header>

          <div className={styles.catalogGrid}>
            {pieceEntries.map(([pieceKey, piece]) => (
              <CatalogCard key={pieceKey} pieceKey={pieceKey} piece={piece} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
