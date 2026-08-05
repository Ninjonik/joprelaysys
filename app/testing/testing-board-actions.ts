"use server";

import {
  readTestingBoardRecord,
  replaceTestingBoardRecord,
  runTestingBoardAction,
  updateTestingBoardStates,
} from "./testing-board-store";
import type {
  PieceStateUpdate,
  TestingAction,
  TestingBoardRecordInput,
} from "./testing-runtime";

export async function readTestingBoardAction() {
  return readTestingBoardRecord();
}

export async function replaceTestingBoardAction(board: TestingBoardRecordInput) {
  return replaceTestingBoardRecord(board);
}

export async function updateTestingBoardStatesAction(updates: PieceStateUpdate[]) {
  return updateTestingBoardStates(updates);
}

export async function runTestingActionAction(action: TestingAction) {
  return runTestingBoardAction(action);
}
