/**
 * campaignText.mts — export every player-facing campaign string to one markdown
 * file for review, and read the reviewed file back in.
 *
 *   npx tsx scripts/campaignText.mts export [outfile]
 *   npx tsx scripts/campaignText.mts import <file> [--dry-run]
 *
 * Import reports every changed string, then edits the campaign sources in place
 * by rewriting the exact literal it found there. Run the tests afterwards.
 *
 * FORMAT CONTRACT. Every editable string is preceded by a key on its own line,
 * in square brackets, and runs until the next key or heading. Headings exist
 * only so the document is navigable in Google Docs — they carry no data, and
 * editing or reordering them changes nothing. Editing a KEY breaks the import.
 *
 * Newlines: a blank line in the document is a paragraph break in the game text.
 * `{mainName}` and `{if flag}...{else}...{/if}` are engine syntax — keep them.
 */
import fs from 'node:fs';
import { CAMPAIGNS } from '../src/campaigns/index.js';

const ORDER = ['unlitbeacon', 'lantern', 'goblinopolis', 'moonberry', 'sealeddeep'];

type Row = { key: string; text: string };

/** Story order: walk the node graph from startNode, then anything unreachable. */
function nodeOrder(c: any): string[] {
  const seen = new Set<string>(); const out: string[] = [];
  const walk = (id: string) => {
    if (!id || seen.has(id) || !c.nodes[id]) return;
    seen.add(id); out.push(id);
    const n = c.nodes[id];
    if (n.kind === 'choice') for (const ch of n.choices) walk(ch.next);
    else walk(n.next);
  };
  walk(c.startNode);
  for (const id of Object.keys(c.nodes)) if (!seen.has(id)) out.push(id);
  return out;
}

function collect(slug: string, c: any): { lines: string[]; rows: Row[] } {
  const L: string[] = []; const rows: Row[] = [];
  const put = (key: string, text: string | undefined, heading?: string) => {
    if (text === undefined || text === null) return;
    if (heading) L.push('', heading);
    L.push('', `[${key}]`, '', String(text).split('\n').join('\n'));
    rows.push({ key, text: String(text) });
  };

  L.push(`# ${c.title}`);
  put(`${slug}.title`, c.title, '## Campaign');
  put(`${slug}.blurb`, c.blurb);
  put(`${slug}.enemyFactionName`, c.enemyFactionName);
  if (c.rewardSkin?.name) put(`${slug}.rewardSkin.name`, c.rewardSkin.name);

  L.push('', '## Story');
  for (const id of nodeOrder(c)) {
    const n = c.nodes[id];
    const label = n.kind === 'encounter' ? `encounter — ${n.encounter}` : n.kind;
    L.push('', `### ${id} (${label})`);
    if (n.kind === 'encounter') {
      put(`${slug}.node.${id}.preText`, n.preText);
      const e = c.encounters[n.encounter];
      if (e?.objective?.text) put(`${slug}.encounter.${n.encounter}.objective`, e.objective.text);
      for (const [i, g] of (e?.goals ?? []).entries()) {
        put(`${slug}.encounter.${n.encounter}.goal.${i}.name`, g.name);
        put(`${slug}.encounter.${n.encounter}.goal.${i}.description`, g.description);
      }
    } else {
      put(`${slug}.node.${id}.text`, n.text);
      if (n.kind === 'choice') {
        for (const [i, ch] of n.choices.entries()) put(`${slug}.node.${id}.choice.${i}.label`, ch.label);
      }
    }
  }

  // Encounters with no story node of their own still carry objective text.
  const shown = new Set(Object.values(c.nodes).filter((n: any) => n.kind === 'encounter').map((n: any) => n.encounter));
  const orphans = Object.keys(c.encounters).filter((k) => !shown.has(k));
  if (orphans.length) {
    L.push('', '## Encounters not reached by a story node');
    for (const k of orphans) {
      L.push('', `### ${k}`);
      if (c.encounters[k].objective?.text) put(`${slug}.encounter.${k}.objective`, c.encounters[k].objective.text);
    }
  }

  if (c.achievements?.length) {
    L.push('', '## Achievements');
    for (const a of c.achievements) {
      L.push('', `### ${a.slug}`);
      put(`${slug}.achievement.${a.slug}.name`, a.name);
      put(`${slug}.achievement.${a.slug}.description`, a.description);
    }
  }
  if (c.boons && Object.keys(c.boons).length) {
    L.push('', '## Boons');
    for (const [k, b] of Object.entries<any>(c.boons)) {
      L.push('', `### ${k}`);
      put(`${slug}.boon.${k}.name`, b.name);
      put(`${slug}.boon.${k}.description`, b.description);
    }
  }
  const allies = new Map<string, any>();
  for (const e of Object.values<any>(c.encounters)) for (const [k, a] of Object.entries<any>(e.allies ?? {})) allies.set(k, a);
  if (allies.size) {
    L.push('', '## Ally names');
    for (const [k, a] of allies) put(`${slug}.ally.${k}.name`, a.name);
  }
  if (c.enemies && Object.keys(c.enemies).length) {
    L.push('', '## Enemy names');
    for (const [k, e] of Object.entries<any>(c.enemies)) if (e.name) put(`${slug}.enemy.${k}.name`, e.name);
  }
  return { lines: L, rows };
}

const HEADER = `# Campaign text

Every line of player-facing campaign writing, in play order: The Unlit Beacon,
The Lantern of Elmsworth, The Bell of Goblinopolis, The Moonberry Masquerade,
The Sealed Deep.

How to edit this: each block of text is preceded by its key in square brackets,
like [lantern.node.start.text]. Edit the TEXT, never the key — the key is how
each edit finds its way back into the game. Headings are only for navigation;
change them freely, they carry nothing.

Blank lines inside a block are paragraph breaks in the game. {mainName} is
replaced with the player's hero name, and {if flag}...{else}...{/if} shows
different text depending on choices made earlier — keep both exactly as written.
`;

const mode = process.argv[2] ?? 'export';
if (mode === 'export') {
  const out = process.argv[3] ?? 'CAMPAIGN_TEXT.md';
  const parts: string[] = [HEADER];
  let n = 0;
  for (const slug of ORDER) {
    const { lines, rows } = collect(slug, (CAMPAIGNS as any)[slug]);
    parts.push(lines.join('\n')); n += rows.length;
  }
  fs.writeFileSync(out, parts.join('\n\n') + '\n');
  console.log(`wrote ${out} — ${n} strings across ${ORDER.length} campaigns`);
} else if (mode === 'import') {
  const file = process.argv[3];
  if (!file) { console.error('usage: import <file>'); process.exit(1); }
  const doc = fs.readFileSync(file, 'utf8');
  // Parse [key] blocks.
  const edited = new Map<string, string>();
  const re = /^\[([a-zA-Z0-9_.\-]+)\]\s*$/;
  let cur: string | null = null; let buf: string[] = [];
  const flush = () => { if (cur) edited.set(cur, buf.join('\n').replace(/^\n+|\n+$/g, '')); cur = null; buf = []; };
  for (const line of doc.split('\n')) {
    const m = line.match(re);
    if (m) { flush(); cur = m[1]; continue; }
    if (line.startsWith('#')) { flush(); continue; }
    if (cur) buf.push(line);
  }
  flush();
  // Compare against current values; report, then rewrite sources.
  const changes: { slug: string; key: string; from: string; to: string }[] = [];
  for (const slug of ORDER) {
    const { rows } = collect(slug, (CAMPAIGNS as any)[slug]);
    for (const r of rows) {
      const next = edited.get(r.key);
      if (next === undefined) { console.warn(`MISSING in document: ${r.key}`); continue; }
      if (next !== r.text) changes.push({ slug, key: r.key, from: r.text, to: next });
    }
  }
  const known = new Set(ORDER.flatMap((s) => collect(s, (CAMPAIGNS as any)[s]).rows.map((r) => r.key)));
  for (const k of edited.keys()) if (!known.has(k)) console.warn(`UNKNOWN key (ignored): ${k}`);
  fs.writeFileSync('/tmp/campaign_changes.json', JSON.stringify(changes, null, 2));
  console.log(`${changes.length} changed strings`);

  // Apply. Each string is found in its source by rebuilding the EXACT literal
  // the file holds, rather than by locating the key — campaign sources are
  // hand-written objects, not generated, and a key-path walker would have to
  // re-emit them and lose their formatting and comments. A literal that cannot
  // be found is reported and skipped; it is never guessed at.
  const lit = (t: string) => "'" + t.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
  const dry = process.argv.includes('--dry-run');
  const bySlug = new Map<string, typeof changes>();
  for (const c of changes) bySlug.set(c.slug, [...(bySlug.get(c.slug) ?? []), c]);
  let applied = 0; const failed: string[] = [];
  for (const [slug, cs] of bySlug) {
    const path = `src/campaigns/${slug}.ts`;
    let src = fs.readFileSync(path, 'utf8');
    for (const c of cs) {
      const from = lit(c.from);
      const n = src.split(from).length - 1;
      if (n !== 1) { failed.push(`${c.key} — literal ${n === 0 ? 'not found' : `appears ${n} times`}`); continue; }
      src = src.replace(from, lit(c.to));
      applied++;
    }
    if (!dry) fs.writeFileSync(path, src);
  }
  console.log(`${applied} applied${dry ? ' (dry run — nothing written)' : ''}`);
  for (const f of failed) console.log(`  NOT APPLIED: ${f}`);
  if (failed.length) process.exitCode = 1;
}
