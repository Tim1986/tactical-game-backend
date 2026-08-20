/**
 * sealeddeep.ts — "The Sealed Deep" (first PAID campaign).
 *
 * Under the moor town of Ashfen sits a barrow older than the town, with a door and a
 * warden. Six weeks ago the town's survey crew went down to shore up a collapsed
 * gallery and never came back. What the party finds: the dead are walking, but not
 * toward the town — they are walking INWARD, toward the door, pulled by whatever is
 * on the other side. Sister Vessa, the Warden, is still down there alone, three
 * centuries past her term, holding a seal that is failing faster than she can mend it.
 *
 * Vessa does not raise the dead and is not a summoner (owner call). She mends, seals,
 * and holds a line — the dead are drawn inward by something behind the door, which is
 * why the barrow keeps filling no matter how much of it is cleared. `waves` model that
 * pull (e9); no `summon` mechanic exists or is needed (design doc D2).
 *
 * Twist: the obvious read — "kill the grim woman among the walking dead" — is the
 * WRONG read. Acting on it is the mistake; the e6/e7 fork is where the party commits.
 * Tone: spooky-adventurous haunted-house, not horror. No child is in peril.
 *
 * Full design doc: mobile/CAMPAIGN2_DESIGN.md. First campaign to spend the `wizard`
 * chassis as an enemy and the `protect`/`survive` palette types, and the first to set
 * `artKey` at all — every one of the 11 undead artKeys ships here.
 *
 * ⚠ NIGHTMARE WALL SHARES — AN OPEN QUESTION FOR THE OWNER (2026-08-18).
 * Across e4, e5, e6, e7, e8 and e9, the hpScale that CENTRES the nightmare mean
 * in its 15-45% band also puts 28-64% of sampled builds under the wall floor,
 * breaching buildBattery's 15% MAX_WALL_SHARE. That is systematic, not six
 * separate content bugs: if a cell's mean is 30% and its build distribution is
 * bimodal (the usual shape), a large share of builds necessarily sit near 0%.
 *
 * This may mean the CAP is wrong for nightmare rather than the content. The
 * owner's stated philosophy is "I am really okay with nightmare only being
 * beatable with certain strategies", which describes a high nightmare wall share
 * as the DESIGN, and the separate NIGHTMARE_BEST_MIN solvability check already
 * guarantees some build cracks each cell. A difficulty-scaled cap (tight on
 * easy/medium where the party is locked in for the run, loose on nightmare)
 * would encode that. Not changed unilaterally — the thresholds are owner-set.
 *
 * `free: false` — this is the first paid campaign, but no purchase-gating exists yet
 * in the engine. Today `free: false` only omits a "FREE" badge in the UI; actual
 * paywall enforcement is a separate E4 task, not built here.
 */
import { CampaignDefinition } from './types.js';
export declare const sealedDeepCampaign: CampaignDefinition;
//# sourceMappingURL=sealeddeep.d.ts.map