import { NextResponse } from "next/server";
import {
  type PieceStateUpdate,
  type TestingBoardRecordInput,
} from "@/app/testing/testing-runtime";
import {
  readTestingBoardRecord,
  replaceTestingBoardRecord,
  resetTestingBoardRecord,
  updateTestingBoardStates,
} from "@/app/testing/testing-board-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResetBody = {
  type: "reset";
};

type ReplaceBody = {
  type: "replace";
  board: TestingBoardRecordInput;
};

type StateUpdatesBody = {
  type: "stateUpdates";
  updates: PieceStateUpdate[];
};

export async function GET() {
  const record = await readTestingBoardRecord();
  return NextResponse.json(record);
}

export async function POST(request: Request) {
  const body = (await request.json()) as ResetBody | ReplaceBody;

  if (body.type === "reset") {
    const record = await resetTestingBoardRecord();
    return NextResponse.json(record);
  }

  if (body.type === "replace") {
    const next = await replaceTestingBoardRecord(body.board);
    return NextResponse.json(next);
  }

  return NextResponse.json({ error: "Unsupported request" }, { status: 400 });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as StateUpdatesBody;

  if (body.type !== "stateUpdates") {
    return NextResponse.json({ error: "Unsupported request" }, { status: 400 });
  }

  const next = await updateTestingBoardStates(body.updates);
  return NextResponse.json(next);
}
