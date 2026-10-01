#!/usr/bin/env node
/**
 * Flags migration statements that cannot be re-run.
 *
 * Why this exists: there is no record of which migrations prod has, and the
 * older files are not re-runnable — `create table` without `if not exists`,
 * `create policy` with no preceding drop, `alter publication ... add table`.
 * That means the schema cannot be rebuilt from the repository, so disaster
 * recovery and a staging copy are both impossible, and nobody notices because
 * nothing ever replays them.
 *
 * Retrofitting the 15 legacy files blind — with no Docker and no staging
 * database to test against — is how you get a recovery script that fails at
 * the worst moment. So they are listed as known-bad in LEGACY below and the
 * check only fails for files added from now on. The debt is recorded instead
 * of growing.
 *
 * Run: node scripts/check-migrations.mjs
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "supabase/migrations";

/** Files written before this check existed. Do not add to this list. */
const LEGACY = new Set([
  "001_initial_schema.sql",
  "002_realtime.sql",
  "003_realtime_rls_fix.sql",
  "004_sections.sql",
  "005_slides.sql",
  "006_spin_wheel.sql",
  "007_idea_wall.sql",
  "008_orders.sql",
  "009_slides_sections.sql",
  "010_questions_poll_id.sql",
  "011_quiz_participants.sql",
  "012_session_mode.sql",
  "013_fixes.sql",
  "014_mode_backfill.sql",
  "015_fix_org_members_rls_recursion.sql",
]);

/** Strip comments and string literals so they cannot produce false matches. */
function normalize(sql) {
  return sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " $BODY$ ")
    .replace(/'(?:[^']|'')*'/g, " 'STR' ");
}

const RULES = [
  {
    name: "create-table-without-if-not-exists",
    test: (sql) => [...sql.matchAll(/create\s+table\s+(?!if\s+not\s+exists)([\w."]+)/gi)].map((m) => m[1]),
    hint: "create table if not exists",
  },
  {
    name: "create-index-without-if-not-exists",
    test: (sql) => [...sql.matchAll(/create\s+(?:unique\s+)?index\s+(?!if\s+not\s+exists|concurrently)([\w."]+)/gi)].map((m) => m[1]),
    hint: "create index if not exists",
  },
  {
    name: "add-column-without-if-not-exists",
    test: (sql) => [...sql.matchAll(/add\s+column\s+(?!if\s+not\s+exists)([\w."]+)/gi)].map((m) => m[1]),
    hint: "add column if not exists",
  },
  {
    name: "create-function-without-or-replace",
    test: (sql) => [...sql.matchAll(/create\s+function\s+([\w."]+)/gi)].map((m) => m[1]),
    hint: "create or replace function",
  },
  {
    name: "drop-without-if-exists",
    test: (sql) => [...sql.matchAll(/drop\s+(policy|table|index|function|trigger|constraint)\s+(?!if\s+exists)("[^"]+"|[\w.]+)/gi)].map((m) => `${m[1]} ${m[2]}`),
    hint: "drop ... if exists",
  },
  {
    name: "publication-add-table-unguarded",
    test: (sql) => {
      // Re-adding a table to a publication errors. 013 showed the guarded form:
      // wrap it in a check against pg_publication_tables.
      if (!/alter\s+publication/i.test(sql)) return [];
      if (/pg_publication_tables/i.test(sql)) return [];
      return [...sql.matchAll(/alter\s+publication\s+\w+\s+add\s+table\s+([\w."]+)/gi)].map((m) => m[1]);
    },
    hint: "guard with a pg_publication_tables check (see 013_fixes.sql)",
  },
  {
    name: "create-policy-without-preceding-drop",
    test: (sql) => {
      const created = [...sql.matchAll(/create\s+policy\s+("[^"]+"|[\w]+)/gi)].map((m) => m[1].replace(/"/g, ""));
      const dropped = new Set(
        [...sql.matchAll(/drop\s+policy\s+(?:if\s+exists\s+)?("[^"]+"|[\w]+)/gi)].map((m) => m[1].replace(/"/g, ""))
      );
      return created.filter((p) => !dropped.has(p));
    },
    hint: "precede with: drop policy if exists \"<name>\" on <table>",
  },
];

const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const problems = [];
let legacyCount = 0;

for (const file of files) {
  const sql = normalize(readFileSync(join(DIR, file), "utf8"));
  const found = [];
  for (const rule of RULES) {
    for (const target of rule.test(sql)) found.push({ rule: rule.name, target, hint: rule.hint });
  }
  if (found.length === 0) continue;
  if (LEGACY.has(file)) {
    legacyCount += found.length;
    continue;
  }
  problems.push({ file, found });
}

const stale = [...LEGACY].filter((f) => !files.includes(f));

if (problems.length === 0 && stale.length === 0) {
  console.log(`OK: ${files.length} миграций проверено, новых неповторяемых операций нет.`);
  console.log(`   (в ${LEGACY.size} legacy-файлах известно ${legacyCount} таких операций — отдельная задача, нужна тестовая БД)`);
  process.exit(0);
}

for (const { file, found } of problems) {
  console.error(`\n${DIR}/${file}`);
  for (const f of found) console.error(`  [${f.rule}] ${f.target}\n    → ${f.hint}`);
}
if (stale.length) {
  console.error(`\nLEGACY содержит отсутствующие файлы: ${stale.join(", ")} — обновите список в scripts/check-migrations.mjs`);
}
console.error(`\nМиграция должна применяться повторно без ошибок: иначе схему нельзя восстановить из репозитория.`);
process.exit(1);
