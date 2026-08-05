import { getMongoDb } from "@/lib/mongodb";
import {
  applyBoardRecordStateUpdates,
  createTestingBoardState,
  createEmptyTestingBoardRecord,
  sanitizeTestingBoardRecordInput,
  type TestingBoardState,
  type PieceStateUpdate,
  type TestingBoardRecord,
  type TestingBoardRecordInput,
} from "./testing-runtime";

const COLLECTION_NAME = "testing_board";
const RECORD_ID = "singleton";

type StoredTestingBoardRecord = TestingBoardRecord & {
  _id: string;
};

type LegacyTestingBoardRecord = {
  columns?: number;
  rows?: number;
  pieces?: Parameters<typeof createTestingBoardState>[0]["pieces"];
  links?: TestingBoardRecord["links"];
  revision?: number;
  updatedAt?: string;
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
    const alreadyStateShaped = isTestingBoardState(record);
    const normalized = normalizeStoredTestingBoardRecord(record);

    if (!alreadyStateShaped) {
      await writeTestingBoardRecord(normalized);
    }

    return normalized;
  }

  const fresh = createEmptyTestingBoardRecord();
  await collection.replaceOne({ _id: RECORD_ID }, fresh, { upsert: true });
  return fresh;
}

export async function writeTestingBoardRecord(record: TestingBoardRecord) {
  const collection = await getTestingBoardCollection();
  await collection.replaceOne({ _id: RECORD_ID }, record, { upsert: true });
  return record;
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

function isTestingBoardState(value: Partial<TestingBoardState>) {
  return Array.isArray(value.cells) && value.piecesById && Array.isArray(value.pieceIds);
}

function normalizeStoredTestingBoardRecord(record: Partial<TestingBoardRecord> & LegacyTestingBoardRecord): TestingBoardRecord {
  const revision = Number.isFinite(record.revision) ? Number(record.revision) : 0;

  if (isTestingBoardState(record)) {
    return {
      ...(record as TestingBoardRecord),
      revision,
      updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : new Date().toISOString(),
    };
  }

  return {
    ...createTestingBoardState({
      columns: Number.isFinite(record.columns) ? Number(record.columns) : 24,
      rows: Number.isFinite(record.rows) ? Number(record.rows) : 14,
      tileSize: 42,
      pieces: Array.isArray(record.pieces) ? record.pieces : [],
      links: Array.isArray(record.links) ? record.links : [],
    }),
    revision,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : new Date().toISOString(),
  };
}
