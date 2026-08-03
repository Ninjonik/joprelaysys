"use client";

import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { catalog, type PlacedPiece } from "../board-demo";
import styles from "./testing-board.module.css";
import { buildRuntimeSnapshot } from "./runtime-snapshot";
import { getRuntimeDeviceKind, isSelectorLocked, type RuntimeAction } from "./simulation";
import type { RuntimeSnapshot } from "./runtime-types";

type Props = {
  piece: PlacedPiece;
  tileSize: number;
  snapshot: RuntimeSnapshot;
  runAction: (action: RuntimeAction) => void;
};

type ZoneRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function transformZoneRect(
  rect: ZoneRect,
  width: number,
  height: number,
  rotation: PlacedPiece["rotation"],
  mirrored: PlacedPiece["mirrored"],
) {
  let nextLeft = rect.left;
  let nextTop = rect.top;

  if (rotation === 180) {
    nextLeft = width - nextLeft - rect.width;
    nextTop = height - nextTop - rect.height;
  }

  if (mirrored) {
    nextLeft = width - nextLeft - rect.width;
  }

  return {
    left: nextLeft,
    top: nextTop,
    width: rect.width,
    height: rect.height,
  };
}

function getLineblockZones(
  width: number,
  height: number,
  piece: Pick<PlacedPiece, "id" | "rotation" | "mirrored">,
  runAction: Props["runAction"],
) {
  const columnWidth = width / 3;
  const rowHeight = height / 2;

  return [
    {
      key: "requestConsent",
      title: "Simulate receiving tratovy souhlas from the remote station after a short delay",
      rect: { left: columnWidth * 2, top: 0, width: columnWidth, height: rowHeight },
      onClick: () => runAction({ type: "lineblock", pieceId: piece.id, control: "requestConsent" }),
    },
    {
      key: "dispatchTrain",
      title: "Dispatch a train into the line after prijem souhlasu",
      rect: { left: columnWidth, top: 0, width: columnWidth, height: rowHeight },
      onClick: () => runAction({ type: "lineblock", pieceId: piece.id, control: "dispatchTrain" }),
    },
    {
      key: "grantConsent",
      title: "Tratovy souhlas. Left click grants consent, right click cancels it.",
      rect: { left: columnWidth, top: rowHeight, width: columnWidth, height: rowHeight },
      onClick: () => runAction({ type: "lineblock", pieceId: piece.id, control: "grantConsent" }),
      onContextMenu: (event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        runAction({ type: "lineblock", pieceId: piece.id, control: "cancelConsent" });
      },
    },
    {
      key: "confirmTrainEnd",
      title: "Konec vlaku helper",
      rect: { left: 0, top: rowHeight, width: columnWidth, height: rowHeight },
      onClick: () => runAction({ type: "lineblock", pieceId: piece.id, control: "confirmTrainEnd" }),
    },
    {
      key: "grantClearance",
      title: "Udeleni odhlasky",
      rect: { left: columnWidth * 2, top: rowHeight, width: columnWidth, height: rowHeight },
      onClick: () => runAction({ type: "lineblock", pieceId: piece.id, control: "grantClearance" }),
    },
  ].map((zone) => ({
    ...zone,
    style: transformZoneRect(zone.rect, width, height, piece.rotation, piece.mirrored),
  }));
}

export function TestingPieceControls({ piece, tileSize, snapshot, runAction }: Props) {
  const deviceKind = getRuntimeDeviceKind(piece.pieceKey);
  const definition = catalog.pieces[piece.pieceKey];
  const width = definition.bounds.width * tileSize;
  const height = definition.bounds.height * tileSize;

  if (deviceKind === "switchSelector") {
    const locked = isSelectorLocked(snapshot, piece.id);

    return (
      <button
        type="button"
        className={styles.pieceHitbox}
        title={locked ? "Switch is moving" : "Left click sets the linked switch to normal. Right click sets it to reverse."}
        aria-disabled={locked}
        onClick={() => !locked && runAction({ type: "selector", pieceId: piece.id, direction: "left" })}
        onContextMenu={(event) => {
          event.preventDefault();
          if (!locked) {
            runAction({ type: "selector", pieceId: piece.id, direction: "right" });
          }
        }}
      />
    );
  }

  if (deviceKind !== "lineblock") {
    return null;
  }

  return getLineblockZones(width, height, piece, runAction).map((zone) => (
    <button
      key={zone.key}
      type="button"
      className={styles.controlZone}
      style={zone.style as CSSProperties}
      title={zone.title}
      onClick={zone.onClick}
      onContextMenu={zone.onContextMenu}
    />
  ));
}

export function buildTestingSnapshot(pieces: PlacedPiece[], links: Props["snapshot"]["links"]) {
  return buildRuntimeSnapshot(pieces, links);
}
