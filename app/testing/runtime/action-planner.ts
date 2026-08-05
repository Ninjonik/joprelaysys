import { planLineblockAction } from "./lineblock-actions";
import { planRouteAction } from "./route-actions";
import { planSelectorAction } from "./switch-actions";
import type { TestingAction, TestingBoardState } from "./types";

export function planRuntimeAction(board: TestingBoardState, action: TestingAction) {
  if (action.type === "selector") {
    return planSelectorAction(board, action.pieceId, action.direction);
  }

  if (action.type === "lineblock") {
    return planLineblockAction(board, action.pieceId, action.control);
  }

  if (action.type === "routeTrigger") {
    return planRouteAction(board, action.pieceId);
  }

  return { immediate: [], delayed: [] };
}
