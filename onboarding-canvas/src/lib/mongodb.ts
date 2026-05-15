import { MongoClient } from "mongodb";

const CORE_WORKSTREAM_IDS = [
  "governance",
  "data",
  "tech",
  "email",
  "sms",
  "whatsapp",
  "campaign",
  "enablement",
] as const;

const CORE_TWO_ROW_SPAN_TITLES = [
  "Project Kick-Off",
  "Setup Governance & Security",
  "Platform Governance & Security",
  "Project Workbook Walkthrough",
  "Email Discovery Workshop",
  "Setup Email Config (DNS & SSL)",
  "Pre IP Warming Workshop",
  "Launch IP Warming",
  "SMS Discovery Workshop",
  "Test Long Code Secured",
  "Prepare Sender Application (incl. SMS Opt-in Flow Review)",
  "Acquire WABA",
  "WhatsApp Discovery Workshop",
  "WABA Process Walkthrough",
] as const;
const CORE_ONE_ROW_SPAN_TITLES = [
  "Multi Channel Journeys Live",
] as const;

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
  const assetsCollectionName = process.env.MONGODB_ASSETS_COLLECTION?.trim() || "config_assets";
  const configs = db.collection(configsCollectionName);
  const tiles = db.collection(tilesCollectionName);
  const assets = db.collection(assetsCollectionName);

  if (!global.__mongoIndexesPromise) {
    global.__mongoIndexesPromise = (async () => {
      await Promise.all([
        configs.createIndex({ Config_ID: 1 }, { unique: true }),
        configs.createIndex({ Password: 1 }),
        configs.createIndex({ Title: 1 }),
        tiles.createIndex({ ID: 1 }, { unique: true }),
        tiles.createIndex({ Config_ID: 1 }),
        tiles.createIndex({ Config_ID: 1, Title_ID: 1 }),
        assets.createIndex({ Config_ID: 1, Asset_Type: 1 }, { unique: true }),
      ]);

      // Backfill row-span defaults for existing tile docs.
      await tiles.updateMany({ Row_Span: { $exists: false } }, { $set: { Row_Span: 1 } });
      // Core milestones always occupy two rows.
      await tiles.updateMany(
        { Workstream: { $in: [...CORE_WORKSTREAM_IDS] }, Category: "milestone" },
        { $set: { Row_Span: 2 } },
      );
      // Core onboarding/setup tiles called out by UX requirements also occupy two rows.
      await tiles.updateMany(
        {
          Workstream: { $in: [...CORE_WORKSTREAM_IDS] },
          Title: { $in: [...CORE_TWO_ROW_SPAN_TITLES] },
        },
        { $set: { Row_Span: 2 } },
      );
      // Explicit exception: keep Multi Channel Journeys Live at one row.
      await tiles.updateMany(
        {
          Workstream: { $in: [...CORE_WORKSTREAM_IDS] },
          Title: { $in: [...CORE_ONE_ROW_SPAN_TITLES] },
        },
        { $set: { Row_Span: 1 } },
      );
    })();
  }
  await global.__mongoIndexesPromise;

  return {
    db,
    configs,
    tiles,
    assets,
  };
}

