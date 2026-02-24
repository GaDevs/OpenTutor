import fs from "node:fs";
import path from "node:path";
import type BetterSqlite3 from "better-sqlite3";

const SCHEMA_VERSION = 1;

function resolveSchemaPath(): string {
  const candidates = [
    path.join(__dirname, "schema.sql"),
    path.join(process.cwd(), "core", "db", "src", "schema.sql"),
    path.join(process.cwd(), "src", "schema.sql")
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("Could not find core/db/src/schema.sql");
}

export function runMigrations(db: InstanceType<typeof BetterSqlite3>): void {
  const currentVersion = Number(db.pragma("user_version", { simple: true }) ?? 0);
  if (currentVersion >= SCHEMA_VERSION) {
    return;
  }

  const schemaPath = resolveSchemaPath();
  const sql = fs.readFileSync(schemaPath, "utf8");

  db.exec("BEGIN");
  try {
    db.exec(sql);
    db.pragma(`user_version = ${SCHEMA_VERSION}`);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
