import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Missing MONGODB_URI");
}

const mongoUri = uri;

type GlobalMongo = typeof globalThis & {
  __mongoClientPromise__?: Promise<MongoClient>;
};

const globalMongo = globalThis as GlobalMongo;

function createClient() {
  return new MongoClient(mongoUri);
}

export const mongoClientPromise =
  globalMongo.__mongoClientPromise__ ??
  createClient().connect();

if (process.env.NODE_ENV !== "production") {
  globalMongo.__mongoClientPromise__ = mongoClientPromise;
}

export async function getMongoDb() {
  const client = await mongoClientPromise;
  return client.db();
}
