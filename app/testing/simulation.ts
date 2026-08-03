import type { RuntimeAction, RuntimeDeviceKind, RuntimeSnapshot } from "./runtime-types";
import { planLineblockAction } from "./lineblock-simulation";
import { isSelectorLocked, planSelectorAction } from "./switch-simulation";

export type {
  LineblockControl,
  RuntimeAction,
  RuntimeDeviceKind,
  RuntimeOutcome,
  RuntimeSnapshot,
} from "./runtime-types";

export { isSelectorLocked };

export function getRuntimeDeviceKind(pieceKey: string): RuntimeDeviceKind {
  if (pieceKey === "button.switchSelector") return "switchSelector";
  if (pieceKey === "button.lineblock") return "lineblock";
  if (pieceKey.startsWith("signal.shunt")) return "shuntingSignal";
  if (pieceKey.startsWith("signal.")) return "signal";
  if (pieceKey.startsWith("track.")) return "occupancySensor";
  return "other";
}

export function planRuntimeAction(snapshot: RuntimeSnapshot, action: RuntimeAction) {
  if (action.type === "selector") {
    return planSelectorAction(snapshot, action.pieceId, action.direction);
  }

  return planLineblockAction(snapshot, action.pieceId, action.control);
}

