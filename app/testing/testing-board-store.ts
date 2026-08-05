import { getMongoDb } from "@/lib/mongodb";
import {
  applyBoardRecordStateUpdates,
  createEmptyTestingBoardRecord,
  sanitizeTestingBoardRecordInput,
  type PieceStateUpdate,
  type TestingBoardRecord,
  type TestingBoardRecordInput,
} from "./testing-runtime";

const COLLECTION_NAME = "testing_board";
const RECORD_ID = "singleton";

type StoredTestingBoardRecord = TestingBoardRecord & {
  _id: string;
};

export async function getTestingBoardCollection() {
  const db = await getMongoDb();
  return db.collection<StoredTestingBoardRecord>(COLLECTION_NAME);
}

export async function readTestingBoardRecord() {
  const collection = await getTestingBoardCollection();
  const existing = await collection.findOne({ _id: RECORD_ID });

  if (existing) {
    const { _id, ...record } = existing;
    void _id;
    return record;
  }

  const fresh = createEmptyTestingBoardRecord();
  await collection.updateOne({ _id: RECORD_ID }, { $set: fresh }, { upsert: true });
  return fresh;
}

export async function writeTestingBoardRecord(record: TestingBoardRecord) {
  const collection = await getTestingBoardCollection();
  await collection.updateOne({ _id: RECORD_ID }, { $set: record }, { upsert: true });
  return record;
}

export async function resetTestingBoardRecord() {
  return writeTestingBoardRecord(createEmptyTestingBoardRecord());
}

export async function replaceTestingBoardRecord(board: TestingBoardRecordInput) {
  const current = await readTestingBoardRecord();
  const next = sanitizeTestingBoardRecordInput(board, current.revision + 1);
  await writeTestingBoardRecord(next);
  return next;
}

export async function updateTestingBoardStates(updates: PieceStateUpdate[]) {
  const current = await readTestingBoardRecord();
  const next = applyBoardRecordStateUpdates(current, updates);

  if (next !== current) {
    await writeTestingBoardRecord(next);
  }

  return next;
}

export async function watchTestingBoardRecord() {
  const collection = await getTestingBoardCollection();

  return collection.watch(
    [
      {
        $match: {
          "documentKey._id": RECORD_ID,
          operationType: { $in: ["insert", "replace", "update"] },
        },
      },
    ],
    { fullDocument: "updateLookup" },
  );
}
