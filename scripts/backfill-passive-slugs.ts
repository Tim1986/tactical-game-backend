/**
 * One-off migration: for every team unit_customization where passiveSlug is null,
 * set it to the first passive option for that unit definition.
 *
 * Run with:  npx tsx scripts/backfill-passive-slugs.ts
 */
import 'dotenv/config';
import { query, pool } from '../src/db/pool.js';

interface TeamRow {
  id: string;
  unit_ids: string[];
  unit_customizations: Array<{ specialSlug: string; passiveSlug: string | null }>;
}

interface UnitRow {
  id: string;
  slug: string;
  passive_options: Array<{ slug: string; name: string }> | null;
}

async function main() {
  // Load all unit definitions (need passive_options)
  const unitResult = await query<UnitRow>(
    `SELECT id, slug, passive_options FROM unit_definitions WHERE is_active = TRUE`
  );
  const unitMap = new Map(unitResult.rows.map(u => [u.id, u]));

  // Load all teams
  const teamResult = await query<TeamRow>(
    `SELECT id, unit_ids, unit_customizations FROM teams`
  );

  let updated = 0;

  for (const team of teamResult.rows) {
    const customizations = team.unit_customizations ?? [];
    let changed = false;

    const resolved = team.unit_ids.map((uid, i) => {
      const existing = customizations[i] ?? { specialSlug: '', passiveSlug: null };
      if (existing.passiveSlug !== null) return existing;

      const def = unitMap.get(uid);
      const defaultPassive = def?.passive_options?.[0]?.slug ?? null;
      if (!defaultPassive) return existing;

      changed = true;
      return { ...existing, passiveSlug: defaultPassive };
    });

    if (!changed) continue;

    await query(
      `UPDATE teams SET unit_customizations = $1 WHERE id = $2`,
      [JSON.stringify(resolved), team.id]
    );
    updated++;
    console.log(`Updated team ${team.id}`);
  }

  console.log(`\nDone. Updated ${updated} of ${teamResult.rows.length} teams.`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
