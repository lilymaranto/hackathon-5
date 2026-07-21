/**
 * Migrate tile drawer fields to Meetings tab schema, or wipe all configs/tiles.
 *
 *   MONGODB_URI="..." node scripts/resync-mongo-meetings.mjs
 *   MONGODB_URI="..." node scripts/resync-mongo-meetings.mjs --wipe-configs
 *
 * --wipe-configs: delete all configs, tiles, and logo assets (does not recreate configs).
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MEETINGS_BY_TITLE = JSON.parse(
  readFileSync(join(__dirname, "meetings-sheet-by-title.json"), "utf8"),
);

const uri = process.env.MONGODB_URI?.trim();
if (!uri) {
  console.error("Set MONGODB_URI to your cluster connection string.");
  process.exit(1);
}

const wipeConfigs = process.argv.includes("--wipe-configs");

function dbNameFromUri(connectionUri) {
  const path = new URL(connectionUri).pathname.replace(/^\//, "");
  return path.split("?")[0] || "onboarding";
}

function drawerFieldsForTitle(title) {
  const row = MEETINGS_BY_TITLE[title?.trim() ?? ""];
  if (!row) {
    return {
      Description: "",
      Attendees: "",
      Agenda_Outcomes: "",
      Related_Tasks: "",
    };
  }
  return {
    Description: row.description ?? "",
    Attendees: row.attendees ?? "",
    Agenda_Outcomes: row.agendaOutcomes ?? "",
    Related_Tasks: row.relatedTasks ?? "",
  };
}

function legacyAgendaOutcomes(doc) {
  const direct = String(doc.Agenda_Outcomes ?? doc["Agenda & Outcomes"] ?? "").trim();
  if (direct) return direct;
  const agenda = String(doc.Agenda ?? "").trim();
  const outcomes = String(doc.Desired_Outcomes ?? "").trim();
  if (agenda && outcomes) return `${agenda}\n\n${outcomes}`;
  return agenda || outcomes;
}

function legacyRelatedTasks(doc) {
  return String(doc.Related_Tasks ?? doc.Resources ?? "").trim();
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbNameFromUri(uri));
  const configs = db.collection("configs");
  const tiles = db.collection("tiles");
  const assets = db.collection("assets");

  if (wipeConfigs) {
    const t = await tiles.deleteMany({});
    const a = await assets.deleteMany({});
    const c = await configs.deleteMany({});
    console.log(
      `Wiped Mongo: configs=${c.deletedCount}, tiles=${t.deletedCount}, assets=${a.deletedCount}`,
    );
    await client.close();
    return;
  }

  const configDocs = await configs.find({}).toArray();
  console.log(`Migrating tiles for ${configDocs.length} config(s)...`);

  let updatedTiles = 0;
  for (const doc of configDocs) {
    const configId = String(doc.Config_ID ?? "");
    if (!configId) continue;
    const cursor = tiles.find({ Config_ID: configId });
    for await (const tile of cursor) {
      const title = String(tile.Title ?? "");
      const seeded = drawerFieldsForTitle(title);
      const hasCustomDescription = String(tile.Description ?? "").trim().length > 0;
      const hasCustomAttendees = String(tile.Attendees ?? "").trim().length > 0;
      const legacyAgenda = legacyAgendaOutcomes(tile);
      const legacyRelated = legacyRelatedTasks(tile);

      await tiles.updateOne(
        { _id: tile._id },
        {
          $set: {
            Description: hasCustomDescription ? tile.Description : seeded.Description,
            Attendees: hasCustomAttendees ? tile.Attendees : seeded.Attendees,
            Agenda_Outcomes: legacyAgenda || seeded.Agenda_Outcomes,
            Related_Tasks: legacyRelated || seeded.Related_Tasks,
          },
          $unset: {
            Agenda: "",
            Resources: "",
            Desired_Outcomes: "",
          },
        },
      );
      updatedTiles += 1;
    }
  }

  console.log(`Updated ${updatedTiles} tile document(s).`);
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
