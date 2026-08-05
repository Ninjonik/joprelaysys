import { getPiece } from "./board-state";
import type { LineblockControl, TestingBoardState, TestingRuntimeOutcome } from "./types";

type LineblockState = {
  lineFree: boolean;
  consentReceived: boolean;
  consentGranted: boolean;
  requestClearance: boolean;
};

function getRemoteDelay() {
  return 3000 + Math.floor(Math.random() * 2001);
}

function parseLineblockState(rawState: string): LineblockState {
  return {
    lineFree: !rawState.startsWith("lineBusy"),
    consentReceived: rawState.includes("consentReceived"),
    consentGranted: rawState.includes("consentGranted"),
    requestClearance: rawState.includes("requestClearance"),
  };
}

function serializeLineblockState(state: LineblockState) {
  if (!state.lineFree && state.requestClearance) return "lineBusy.requestClearance";
  if (state.consentReceived && state.requestClearance) return "consentReceived.requestClearance";
  if (state.consentGranted && state.requestClearance) return "consentGranted.requestClearance";
  if (!state.lineFree) return "lineBusy";
  if (state.requestClearance) return "requestClearance";
  if (state.consentReceived) return "consentReceived";
  if (state.consentGranted) return "consentGranted";
  return "clear";
}

export function planLineblockAction(board: TestingBoardState, pieceId: string, control: LineblockControl): TestingRuntimeOutcome {
  const piece = getPiece(board, pieceId);

  if (!piece) {
    return { immediate: [], delayed: [] };
  }

  const current = parseLineblockState(piece.state);
  const next = { ...current };
  const delayed: TestingRuntimeOutcome["delayed"] = [];

  if (control === "requestConsent" && current.lineFree && !current.consentReceived && !current.consentGranted) {
    delayed.push({
      delayMs: getRemoteDelay(),
      updates: [{ pieceId, state: serializeLineblockState({ ...next, consentReceived: true }) }],
    });
  }

  if (control === "dispatchTrain" && current.lineFree && current.consentReceived) {
    next.lineFree = false;
    next.consentReceived = false;
    delayed.push({
      delayMs: getRemoteDelay(),
      updates: [{ pieceId, state: serializeLineblockState({ ...next, requestClearance: true }) }],
    });
  }

  if (control === "grantConsent" && current.lineFree && !current.consentReceived) {
    next.consentGranted = true;
  }

  if (control === "cancelConsent" && current.consentGranted) {
    next.consentGranted = false;
  }

  if (control === "confirmTrainEnd" && !current.lineFree) {
    next.requestClearance = true;
  }

  if (control === "grantClearance" && current.requestClearance) {
    next.requestClearance = false;
    delayed.push({
      delayMs: getRemoteDelay(),
      updates: [{ pieceId, state: serializeLineblockState({ ...next, lineFree: true }) }],
    });
  }

  return {
    immediate: [{ pieceId, state: serializeLineblockState(next) }],
    delayed,
  };
}
