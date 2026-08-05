"use server";

import {
  readTestingBoardRecord,
  replaceTestingBoardRecord,
  updateTestingBoardStates,
} from "./testing-board-store";
import type {
  PieceStateUpdate,
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
