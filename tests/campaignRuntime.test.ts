import { describe, it, expect } from 'vitest';
import {
  buildCampaignPlayerInstance, buildCampaignEnemyInstance, buildEncounterState,
  renderStoryText, CAMPAIGN_HP_SCALE, PLAYER_HP_DELTA, DOUBLE_SPECIAL_COOLDOWN,
} from '../src/campaigns/runtime.js';
import { CAMPAIGNS } from '../src/campaigns/index.js';
import { DEFAULT_UNITS } from '../src/ai/defaultData.js';
import { CampaignDefinition } from '../src/campaigns/types.js';

const lantern = CAMPAIGNS['lantern'];
const fighter = DEFAULT_UNITS['fighter'];
const pos = { x: 2, y: 2 };

describe('buildCampaignPlayerInstance', () => {
  it('strips the special below L5 (basic attack only)', () => {
    const inst = buildCampaignPlayerInstance(fighter, 'h', pos, 1);
    expect(inst.abilities).toEqual(['sword']);
  });

  it('grants the chosen special at L5', () => {
    const inst = buildCampaignPlayerInstance(fighter, 'h', pos, 5, { specialSlug: 'shield_bash' });
    expect(inst.abilities).toEqual(['sword', 'shield_bash']);
  });

  it('applies the level HP delta (-8 at L1, baseline at L4)', () => {
    expect(buildCampaignPlayerInstance(fighter, 'h', pos, 1).maxHealth).toBe(fighter.maxHealth - 8);
    expect(buildCampaignPlayerInstance(fighter, 'h', pos, 4).maxHealth).toBe(fighter.maxHealth);
  });

  it('ignores the passive below L3 and applies it from L3', () => {
    const passiveSlug = fighter.passiveOptions.find((p) => p.stat === 'maxHealth')?.slug;
    const l2 = buildCampaignPlayerInstance(fighter, 'h', pos, 2, { passiveSlug });
    expect(l2.maxHealth).toBe(fighter.maxHealth + PLAYER_HP_DELTA[2]);
    const l3 = buildCampaignPlayerInstance(fighter, 'h', pos, 3, { passiveSlug });
    expect(l3.maxHealth).toBeGreaterThan(fighter.maxHealth + PLAYER_HP_DELTA[3]);
  });
});

describe('buildCampaignEnemyInstance', () => {
  const scrapper = lantern.enemies['goblin_scrapper'];

  it('applies stat overrides and HP scaling', () => {
    const inst = buildCampaignEnemyInstance(scrapper, 'e', pos, 'easy', 0.75);
    expect(inst.definitionSlug).toBe('rogue'); // base slug preserved for sprites
    expect(inst.maxHealth).toBe(Math.floor((scrapper.maxHealth ?? 0) * 0.75));
    expect(inst.armorClass).toBe(scrapper.armorClass);
  });

  it('applies nightmare bonuses only on nightmare', () => {
    const hard = buildCampaignEnemyInstance(scrapper, 'e', pos, 'hard', 1);
    const nightmare = buildCampaignEnemyInstance(scrapper, 'e', pos, 'nightmare', 1);
    expect(nightmare.armorClass).toBe(hard.armorClass + (scrapper.nightmare?.acBonus ?? 0));
  });

  it('applies passive flags (immovable bruiser)', () => {
    const bruiser = buildCampaignEnemyInstance(lantern.enemies['hobgoblin_bruiser'], 'e', pos, 'medium', 1);
    expect(bruiser.passives).toContain('immovable');
  });
});

describe('buildEncounterState', () => {
  const party = ['fighter', 'ranger', 'cleric', 'wizard'];
  const choices = [{}, {}, {}, {}];

  it('builds all encounters of every registered campaign without throwing', () => {
    for (const campaign of Object.values(CAMPAIGNS)) {
      for (const encId of Object.keys(campaign.encounters)) {
        const { state } = buildEncounterState(campaign, encId, party, choices, campaign.encounters[encId].level, 'nightmare', 'h', 'e');
        expect(state.units.length).toBe(4 + campaign.encounters[encId].enemies.length);
      }
    }
  });

  it('is human-first and uses absolute placements (no mirroring)', () => {
    const { state } = buildEncounterState(lantern, 'e1', party, choices, 1, 'medium', 'h', 'e');
    expect(state.activePlayerId).toBe('h');
    expect(state.initiative.round1FirstPlayerId).toBe('h');
    const enemies = state.units.filter((u) => u.ownerPlayerId === 'e');
    expect(enemies.map((u) => u.position)).toEqual(lantern.encounters.e1.enemyPlacement);
  });

  it('maps enemy display names and the main name by instanceId', () => {
    const { state, unitNames } = buildEncounterState(lantern, 'e1', party, choices, 1, 'medium', 'h', 'e', 'Robin');
    const main = state.units[0];
    expect(unitNames[main.instanceId]).toBe('Robin');
    const enemy = state.units.find((u) => u.ownerPlayerId === 'e')!;
    expect(unitNames[enemy.instanceId]).toBe('Goblin Scrapper');
  });

  it('produces cooldown overrides only at L6', () => {
    expect(buildEncounterState(lantern, 'e5', party, choices, 5, 'medium', 'h', 'e').cooldownOverrides).toBeNull();
    const l6 = buildEncounterState(lantern, 'e5', party, choices, 6, 'medium', 'h', 'e').cooldownOverrides;
    expect(l6?.[fighter.specialOptions[0]]).toBe(DOUBLE_SPECIAL_COOLDOWN);
  });

  it('rejects placements on removed corner tiles', () => {
    const bad: CampaignDefinition = {
      ...lantern,
      encounters: { bad: { ...lantern.encounters.e1, enemyPlacement: [{ x: 0, y: 0 }, { x: 6, y: 4 }, { x: 1, y: 4 }] } },
    };
    expect(() => buildEncounterState(bad, 'bad', party, choices, 1, 'easy', 'h', 'e')).toThrow(/out of bounds/);
  });
});

describe('campaign content sanity (all registered campaigns)', () => {
  it('every node reference resolves and every text interpolates cleanly', () => {
    for (const campaign of Object.values(CAMPAIGNS)) {
      const nodeIds = new Set(Object.keys(campaign.nodes));
      expect(nodeIds.has(campaign.startNode)).toBe(true);
      for (const [id, node] of Object.entries(campaign.nodes)) {
        const nexts = node.kind === 'choice' ? node.choices.map((c) => c.next)
          : node.kind === 'end' ? []
          : [node.next];
        for (const n of nexts) expect(nodeIds.has(n), `${campaign.slug}:${id} → ${n}`).toBe(true);
        if (node.kind === 'encounter') expect(campaign.encounters[node.encounter], `${campaign.slug}:${id}`).toBeDefined();
        const text = node.kind === 'encounter' ? node.preText : node.kind === 'levelup' ? '' : node.text;
        const rendered = renderStoryText(text, 'Test', {});
        expect(rendered).not.toMatch(/\{if |\{else\}|\{\/if\}|\{mainName\}/);
      }
      // Encounter enemies + placements are consistent
      for (const [encId, enc] of Object.entries(campaign.encounters)) {
        expect(enc.enemyPlacement.length).toBe(enc.enemies.length);
        expect(enc.playerPlacement.length).toBe(4);
        for (const key of enc.enemies) expect(campaign.enemies[key], `${campaign.slug}:${encId}:${key}`).toBeDefined();
      }
    }
  });

  it('renderStoryText handles flags, else branches, and mainName', () => {
    expect(renderStoryText('{mainName} {if a}yes{else}no{/if}', 'Robin', { a: true })).toBe('Robin yes');
    expect(renderStoryText('{if a}yes{else}no{/if}', 'x', {})).toBe('no');
    expect(renderStoryText('{if a}yes{/if}!', 'x', {})).toBe('!');
  });
});
