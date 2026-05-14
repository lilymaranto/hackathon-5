import { MongoClient } from "mongodb";

function requiredMongoUri(): string {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error("Missing MONGODB_URI.");
  }
  return uri;
}

function mongoDbNameFromUri(uri: string): string {
  try {
    const parsed = new URL(uri);
    const fromPath = parsed.pathname.replace(/^\//, "").trim();
    if (fromPath) return fromPath;
  } catch {
    // Fall through to env/default.
  }
  return process.env.MONGODB_DB?.trim() || "COEHackathon";
}

declare global {
  // eslint-disable-next-line no-var
  var __mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var __mongoIndexesPromise: Promise<void> | undefined;
}

function mongoClientPromise(): Promise<MongoClient> {
  if (!global.__mongoClientPromise) {
    global.__mongoClientPromise = new MongoClient(requiredMongoUri()).connect();
  }
  return global.__mongoClientPromise;
}

export async function getMongoDb() {
  const uri = requiredMongoUri();
  const client = await mongoClientPromise();
  return client.db(mongoDbNameFromUri(uri));
}

export async function getMongoCollections() {
  const db = await getMongoDb();
  const configsCollectionName = process.env.MONGODB_CONFIGS_COLLECTION?.trim() || "configs";
  const tilesCollectionName = process.env.MONGODB_TILES_COLLECTION?.trim() || "tiles";
  const configs = db.collection(configsCollectionName);
  const tiles = db.collection(tilesCollectionName);

  if (!global.__mongoIndexesPromise) {
    global.__mongoIndexesPromise = Promise.all([
      configs.createIndex({ Config_ID: 1 }, { unique: true }),
      configs.createIndex({ Password: 1 }),
      configs.createIndex({ Title: 1 }),
      tiles.createIndex({ ID: 1 }, { unique: true }),
      tiles.createIndex({ Config_ID: 1 }),
      tiles.createIndex({ Config_ID: 1, Title_ID: 1 }),
    ]).then(() => undefined);
  }
  await global.__mongoIndexesPromise;

  return {
    db,
    configs,
    tiles,
  };
}

