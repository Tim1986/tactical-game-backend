# Campaign text

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


# The Unlit Beacon

## Campaign

[unlitbeacon.title]

The Unlit Beacon

[unlitbeacon.blurb]

The beacon above Coldgate Pass went dark three nights ago, and the army under the glacier is marching home — straight through Frostmere.

[unlitbeacon.enemyFactionName]

The Winter Host

[unlitbeacon.rewardSkin.name]

Goblin Hexer

## Story

### intro (story)

[unlitbeacon.node.intro.text]

For four hundred years, a light has burned above Coldgate Pass. Nobody in Frostmere remembers who lit it first — only that the keeper keeps it, the way her mother did, the way the mountain keeps the snow. The town saying goes: "While the Vigil burns, the ice sleeps sound."

Three nights ago, in the worst storm of the year, the Vigil went out.

Tonight {mainName} stands at the town gate, watching a single point of frost-blue light come down the glacier road. It walks like a soldier. It does not stop at the gate. And behind it, high on the White Shelf, a hundred more lights are forming into columns.

### gate_pre (encounter — e1)

[unlitbeacon.node.gate_pre.preText]

They come through the gate in step — three soldiers of frost-rimed bone, shields locked, pikes level, snow settling on shoulders that have not felt it in four centuries. They do not shout. They do not hurry. {mainName} plants the party in the market lane, between the barricades, and the first shove of the winter begins.

[unlitbeacon.encounter.e1.goal.0.name]

Held the Gate

[unlitbeacon.encounter.e1.goal.0.description]

Turn back the first column without losing anyone.

### lv2 (levelup)

### tam_arrives (story)

[unlitbeacon.node.tam_arrives.text]

The column withdraws in good order — withdraws, {mainName} notices, not flees — and the square erupts in questions nobody can answer. Alderman Pell keeps saying "the light keeps them asleep" in the voice of a man reciting a rhyme he no longer believes.

Then the crowd parts. A figure staggers in off the pass road, snow-caked to the eyebrows: Tam Emberwright, the keeper's grandchild and apprentice, half-frozen and wild-eyed.

"Gran's gone," Tam manages. "And the beacon — she LET it go out. She said — she said she was going to—" Whatever Maren Emberwright said, Tam is asleep on their feet before they can finish saying it. The town decides it was grief talking. Somebody doused that light, they mutter. Poachers, probably.

On the White Shelf, the columns keep forming.

### night_pre (encounter — e2)

[unlitbeacon.node.night_pre.preText]

They come again at midnight, down both streets at once, patient as the tide. The barricades hold the pikemen — until the first vaulting shape clears the wall entirely in one impossible leap and lands in the square. {mainName} holds the center as the night grinds on.

### lv3 (levelup)

### fork_town (choice)

[unlitbeacon.node.fork_town.text]

Dawn buys a pause, not a peace. The column will come again at dusk, and Frostmere must decide before it does. Alderman Pell looks to {mainName}: the keep's cellars are stone and deep, but a trap if the walls fail; the bridges lead out across the Merewater, but a column of families on the ice road is slow, cold, and exposed. Where do the people go?

[unlitbeacon.node.fork_town.choice.0.label]

Shelter them in the keep — stone walls, and the party holds the line.

[unlitbeacon.node.fork_town.choice.1.label]

Send them across the bridges — get everyone out of the road entirely.

### bridges_pre (encounter — e3)

[unlitbeacon.node.bridges_pre.preText]

{if sheltered}With the families barred safe inside the keep, the bridges become the thing to DENY — if the column crosses the Merewater it can flank the keep by morning. {mainName} splits the party to hold both bridgeheads at once, and the pikemen come on with their shields up, shoving for the marks.{else}The wagons start across at first light, families and lanterns and everything that can be carried. The column reads the movement and turns for the bridges. {mainName} splits the party to hold both bridgeheads until the last wagon is over — and the pikemen come shoving.{/if}

[unlitbeacon.encounter.e3.objective]

Hold both bridgeheads at once

[unlitbeacon.encounter.e3.goal.0.name]

Every Lantern Lit

[unlitbeacon.encounter.e3.goal.0.description]

Hold both bridgeheads with the whole party still standing.

### road_note (story)

[unlitbeacon.node.road_note.text]

The bridgeheads hold, and for one long breath the valley is quiet.

"They'll keep coming," Tam says, awake at last and refusing to be put back to bed. "As long as the beacon's dark, they'll keep coming. So light it again — that's the answer, isn't it? Except—" Tam's face does something complicated. "Except Gran said... no. Never mind what Gran said. The Vigil burns emberwood. The grove's halfway up the pass. Go. I'll mind the town."

Halfway up the pass, {mainName} smells the answer before seeing it: woodsmoke. The emberwood grove is burning — and not by accident. Poachers move among the trees with torches and sledges, stripping four hundred years of the beacon's fuel supply for charcoal money while the town below fights for its life. And swinging beside them, tireless, are the cutters: dead men in poachers' leathers, working the saw-lines with the awful patience of things that do not need to rest.

### grove_pre (encounter — e4)

[unlitbeacon.node.grove_pre.preText]

A woman in a fine fur coat — Sorrel, by the way the others keep looking at her — sees the party and sighs like an accountant interrupted at lunch. "The dead don't buy charcoal," she calls across the burning grove. "They do cut it, though — cheaper than a living crew, and they never once asked me for wages." She nods at the shapes shambling out of the smoke in dead men' leathers. "Whatever your beacon kept asleep woke up hungry and short of hands. I made an arrangement." Her living crew fans out among the fire lanes, knives and torches out. They know exactly which ground is about to burn.

### lv4 (levelup)

### icefall_note (story)

[unlitbeacon.node.icefall_note.text]

Sorrel is gone before the last torch drops — poachers always know a back way — but the grove is gone with her. What emberwood the fire spared, the sledges took. There will be no relighting the Vigil this winter. Perhaps not for a generation.

{mainName} looks up the pass, past the smoke, to where the beacon tower stands dark against the White Shelf. If the light cannot be restored, then the answer is wherever Maren Emberwright went — and the only way is up: the frozen cascade the pass-folk call the Icefall, glittering, silent, and watched.

### icefall_pre (encounter — e5)

[unlitbeacon.node.icefall_pre.preText]

Archers of the Host hold the high shelf, patient behind four hundred winters of ice pillars, and something pale drifts BETWEEN the pillars without going around them. {mainName} starts up the cascade, cover to cover, into the volleys.

### lv5 (levelup)

### mere_note (story)

[unlitbeacon.node.mere_note.text]

Above the Icefall the pass opens out, and {mainName} understands where the Merewater begins: a mountain lake, frozen ten feet down, white as a held breath. The trail runs straight across it.

Old pass-folk stories say a supply company went under the ice here, wagons and all, the winter the Host first marched — still waiting, the stories say, for the quartermaster's whistle to tell them the ford is safe.

Out on the white, something knocks, politely, from underneath.

### mere_pre (encounter — e6)

[unlitbeacon.node.mere_pre.preText]

The drowned company rises through the ice without breaking it — waterlogged, patient, reaching. Every step forward, cold hands drag somebody back. {mainName} strings the party out across the mere and pushes for the far shore: keep moving, keep together, do not stop to fight what only wants you to stop.

[unlitbeacon.encounter.e6.objective]

Get everyone across the Frozen Mere

[unlitbeacon.encounter.e6.goal.0.name]

Dry Boots

[unlitbeacon.encounter.e6.goal.0.description]

Cross the Frozen Mere by round 4.

### fork_trail (choice)

[unlitbeacon.node.fork_trail.text]

On the far shore stands the trailhead shrine — the last shelter below the Vigil, kept stocked by generations of Emberwrights. Inside: the keeper's spare oilskins, waxed and ward-stitched against the storm... and a rack of old snowshoes, mended and true. The climb ahead is steep and the storm is building. The party can carry one or the other, not both.

[unlitbeacon.node.fork_trail.choice.0.label]

Take the warded oilskins — let the storm break on them, not on you.

[unlitbeacon.node.fork_trail.choice.1.label]

Take the snowshoes — speed over the drifts is its own armor.

### storm_note (story)

[unlitbeacon.node.storm_note.text]

{if tookOilskins}The oilskins settle over the party's shoulders like a promise kept — the storm's first gust breaks around them and finds no purchase.{else}The snowshoes bite true, and the drifts that should swallow a climber to the waist barely slow the party down.{/if}

Above, the Vigil tower appears and disappears in the whiteout. The storm is not weather, {mainName} realizes, watching pale shapes wheel inside it. The storm is a DOOR, and winter is holding it shut.

### storm_pre (encounter — e7)

[unlitbeacon.node.storm_pre.preText]

The trail to the tower door is a slot between drift-walls taller than a wagon, and the drifts are closing like a slow fist. Frost-voiced casters chant runners to a standstill; wisps ride the wind straight through the walls. One of the party has to reach that door before the trail seals — whoever can be spared, sped, and spent. {mainName} chooses the runner and the rest become the road.

[unlitbeacon.encounter.e7.objective]

Reach the Vigil's door before the storm closes (6 rounds)

### lv7 (levelup)

### vigil_pre (encounter — e8)

[unlitbeacon.node.vigil_pre.preText]

The door gives onto darkness and old stone stairs. The Vigil is not empty: soldiers of the Host stand watch on every floor — not ransacking, not searching. Waiting. As if the tower were suddenly the most important place in the world, and they had come to see for themselves that the light is truly out. {mainName} climbs, floor by floor, toward the cold beacon at the top.

### lv8 (levelup)

### rolls_note (story)

[unlitbeacon.node.rolls_note.text]

The beacon platform is scoured clean by wind. No body — of Maren Emberwright there is no sign at all but a chair, a spyglass, and a letter weighted under the great cold fire-bowl, addressed in a firm hand: "To whoever climbs next."

"The rolls are in the chest," it begins. "Read them before you judge me."

The muster rolls of the Winter Host. Four hundred years old. And at the top, the standing order, copied fair in some long-dead clerk's best hand: HOLD THE PASS UNTIL THE BEACON ABOVE COLDGATE GOES DARK. DARK MEANS RELIEF IS COME. THEN MARCH HOME.

The letter again: "The war ended. Nobody sent the relief. The first keepers lit the light to keep an army standing at a post the world forgot — because home, for the Host, is the muster field down the valley, and the war-road home runs through the town we built on top of it. Four hundred years of NOT YET is not keeping faith. It is theft. I have given them their dark. I am sorry for what it costs, and I have gone ahead to say so to the Marshal myself.

There is a law in the rolls older than the beacon: the road may be contested by challenge. Take my ring. Take Tam. And ask the Marshal for the Standard."

{mainName} looks down from the platform. Far below, on the White Shelf, the Winter Host is forming into a column four hundred years long — and it is pointed at Frostmere.

### night2_pre (encounter — e9)

[unlitbeacon.node.night2_pre.preText]

There is no outrunning a column on its own road. Where the war-road cuts through the mountain, {mainName} shelters the party in the old road-cave and holds its narrow mouth while the vanguard of the Host marches PAST in the dark — rank on rank on rank, and every few ranks, some of them peel off toward the light of the party's fire.

[unlitbeacon.encounter.e9.objective]

Hold the cave mouth until the column passes

### fork_dawn (choice)

[unlitbeacon.node.fork_dawn.text]

The column camps below the shelf before its last descent — even the dead, it seems, keep march discipline. The challenge must be made before they move again. Tam arrives with the ring an hour before first light, having climbed half the night, and now there is one decision left: how does {mainName} spend the hours until the parley?

[unlitbeacon.node.fork_dawn.choice.0.label]

Rest by the fire until dawn — meet the Host whole and warm.

[unlitbeacon.node.fork_dawn.choice.1.label]

Walk the old battlefield and arm from the ice — shields for everyone.

### muster_note (story)

[unlitbeacon.node.muster_note.text]

{if choseDawn}Dawn comes up gold and bitter cold, and the party rises rested for the first time since the beacon died.{else}By lantern light the party walks the old field, and the ice gives up what it has kept: shields with four hundred winters in them and no owners left to mind the borrowing.{/if}

Below, the muster field. The Host stands in perfect ranks around a ring of planted spears — the parley ring, exactly where the rolls said it would be. By the law of the road, the challenge must be READ by a keeper's line before it can be answered.

Tam Emberwright squares their shoulders, holds the ring so hard their knuckles go white, and says, "Right. Walk me in."

The Host does not intend to make it easy. Wardens are already moving to turn the reader back.

### muster_pre (encounter — e10)

[unlitbeacon.node.muster_pre.preText]

Tam walks with the party, mace in one hand and Maren's ring in the other, patching wounds on the move and swinging when it comes to it — an Emberwright to the bone. The Host's wardens converge, bent on one thing only: no reader reaches the ring. {mainName} clears the way.

[unlitbeacon.encounter.e10.objective]

Bring Tam to the parley ring to read the discharge

[unlitbeacon.encounter.e10.goal.0.name]

The Reading

[unlitbeacon.encounter.e10.goal.0.description]

Bring Tam to the parley ring without a scratch on anyone.

### lv10 (levelup)

### adjutant_pre (encounter — e11)

[unlitbeacon.node.adjutant_pre.preText]

Tam's voice carries across the muster field, reading the discharge into the wind, and the whole Host turns its head at once. From beside the Standard, something folds itself out of the cold — the Adjutant, the Marshal's own champion, drawn thin as a blade's shadow. It points, precisely, at {mainName}.

The law of the road: the champion answers first. This duel is the hero's to win — and the hero's to lose.

[unlitbeacon.encounter.e11.objective]

Answer the Adjutant's challenge

[unlitbeacon.encounter.e11.goal.0.name]

Answered Alone

[unlitbeacon.encounter.e11.goal.0.description]

Let the hero personally strike down the Adjutant.

### standard_note (story)

[unlitbeacon.node.standard_note.text]

The Adjutant comes apart like frost off a window, and — {mainName} would swear to it — bows on the way down.

The ranks part. At the heart of the muster field waits a tall figure in a general's tattered greatcoat, the great Standard of the Host planted in the ice at his back: Marshal Vail, four hundred years at attention, waiting beside a folding table on which sits — set out with terrible, hopeful care — a single cup, as if for a guest long expected.

"Keeper's kin. Champion." The Marshal's voice is the sound of a gate in winter. "Your reading is heard. My soldiers have somewhere to be, and your town is standing in the road. The law gives us this: take the Standard from me, and the column halts where it stands. Fail, and we march at noon." He draws a sword that remembers being bright.

"For what it is worth," he adds, quietly, "your keeper said the same. She is safe, and she argued well. But a lie four centuries old does not die of argument."

### standard_pre (encounter — e12)

[unlitbeacon.node.standard_pre.preText]

The honor guard closes ranks before the Standard, and the Marshal rolls his shoulders like a man glad, after four hundred years, to finally be at something. Strike him down and the challenge is won — or cut through and let {mainName}'s own hand seize the Standard from the ice. The law honors either. The Host watches, forty deep and silent, to see which it will be.

[unlitbeacon.encounter.e12.objective]

Strike down the Marshal — or seize the Standard

[unlitbeacon.encounter.e12.goal.0.name]

The Whole Line Home

[unlitbeacon.encounter.e12.goal.0.description]

Face the Marshal and lose no one.

### fork_rest (choice)

[unlitbeacon.node.fork_rest.text]

It is over. The Standard leans in {mainName}'s grip, and the entire Winter Host stands at ease for the first time in four centuries, awaiting one last order. Marshal Vail — what remains of him, settling into the ice with his salute unbroken — leaves the choice to the challenger, as the law requires. Where does the Host go?

[unlitbeacon.node.fork_rest.choice.0.label]

Into the glacier — lay them to rest at the post they kept so long.

[unlitbeacon.node.fork_rest.choice.1.label]

Down the long road — march them the slow way around the valley, home to the muster field at last.

### end (end)

[unlitbeacon.node.end.text]

{if laidToIce}{mainName} plants the Standard high on the White Shelf, and the Winter Host marches into the glacier by companies, in perfect order, each rank saluting the colors as it passes into the blue. The ice takes them the way a bed takes a tired soldier. The mountain has never been so quiet.{else}{mainName} carries the Standard at the head of the column, down the long eastern road that spares the valley, two days' march to a snow-covered field that was once called the muster ground. There the Winter Host forms up one final time, dresses its lines, and — released at last — lies down in the snow it has waited four hundred years to reach. Where each soldier rests, the snow holds the shape of someone finally home.{/if}

Maren Emberwright is waiting in Frostmere when the party returns — alive, unrepentant, and already arguing with Alderman Pell about what to tell the children. Tam relights the Vigil one last time on midwinter's night: not as a lock, but as a lamp — one bright night a year, so nobody forgets the four hundred dark ones it took to pay an army what it was owed.

{if sheltered}The families come up from the keep cellars into the sunlight{else}The wagons come back across the bridges, families and lanterns and all{/if}, and Frostmere rings its bell until the icicles fall off it.

THE UNLIT BEACON — COMPLETE

## Achievements

### complete_easy

[unlitbeacon.achievement.complete_easy.name]

First Snow

[unlitbeacon.achievement.complete_easy.description]

Complete The Unlit Beacon on Easy.

### complete_medium

[unlitbeacon.achievement.complete_medium.name]

Kept the Road

[unlitbeacon.achievement.complete_medium.description]

Complete The Unlit Beacon on Medium.

### complete_hard

[unlitbeacon.achievement.complete_hard.name]

Voice of the Pass

[unlitbeacon.achievement.complete_hard.description]

Complete The Unlit Beacon on Hard.

### complete_nightmare

[unlitbeacon.achievement.complete_nightmare.name]

The Standard-Taker

[unlitbeacon.achievement.complete_nightmare.description]

Complete The Unlit Beacon on Nightmare — unlocks the campaign reward skin.

### held_the_keep

[unlitbeacon.achievement.held_the_keep.name]

Shelter in Stone

[unlitbeacon.achievement.held_the_keep.description]

Shelter Frostmere's families in the keep.

### crossed_the_water

[unlitbeacon.achievement.crossed_the_water.name]

The Long Column

[unlitbeacon.achievement.crossed_the_water.description]

Send Frostmere's families across the bridges.

### keepers_oilskins

[unlitbeacon.achievement.keepers_oilskins.name]

The Keeper's Oilskins

[unlitbeacon.achievement.keepers_oilskins.description]

Take the warded oilskins at the trailhead shrine.

### snowshoe_march

[unlitbeacon.achievement.snowshoe_march.name]

Snowshoe March

[unlitbeacon.achievement.snowshoe_march.description]

Take the snowshoes at the trailhead shrine.

### waited_for_dawn

[unlitbeacon.achievement.waited_for_dawn.name]

The Dawn Challenge

[unlitbeacon.achievement.waited_for_dawn.description]

Rest until dawn before answering the Host.

### armed_from_the_ice

[unlitbeacon.achievement.armed_from_the_ice.name]

Armed from the Ice

[unlitbeacon.achievement.armed_from_the_ice.description]

Salvage shields from the old battlefield.

### laid_to_ice

[unlitbeacon.achievement.laid_to_ice.name]

At Their Post

[unlitbeacon.achievement.laid_to_ice.description]

Lay the Winter Host to rest inside the glacier.

### marched_home

[unlitbeacon.achievement.marched_home.name]

The Long Road Home

[unlitbeacon.achievement.marched_home.description]

Send the Winter Host down the long road to the old muster field.

### held_the_gate

[unlitbeacon.achievement.held_the_gate.name]

Held the Gate

[unlitbeacon.achievement.held_the_gate.description]

Turn back the first column without losing anyone.

### every_lantern_lit

[unlitbeacon.achievement.every_lantern_lit.name]

Every Lantern Lit

[unlitbeacon.achievement.every_lantern_lit.description]

Hold both bridgeheads with the whole party still standing.

### dry_boots

[unlitbeacon.achievement.dry_boots.name]

Dry Boots

[unlitbeacon.achievement.dry_boots.description]

Cross the Frozen Mere by round 6.

### reader_unharmed

[unlitbeacon.achievement.reader_unharmed.name]

The Reading

[unlitbeacon.achievement.reader_unharmed.description]

Bring Tam to the parley ring without a scratch on anyone.

### answered_alone

[unlitbeacon.achievement.answered_alone.name]

Answered Alone

[unlitbeacon.achievement.answered_alone.description]

Let the hero personally strike down the Adjutant.

### whole_line_home

[unlitbeacon.achievement.whole_line_home.name]

The Whole Line Home

[unlitbeacon.achievement.whole_line_home.description]

Face the Marshal and lose no one.

## Boons

### keepers_oilskins

[unlitbeacon.boon.keepers_oilskins.name]

The Keeper's Oilskins

[unlitbeacon.boon.keepers_oilskins.description]

Ward-stitched against the storm — every unit starts each remaining encounter shielded.

### snowshoe_march

[unlitbeacon.boon.snowshoe_march.name]

Snowshoe March

[unlitbeacon.boon.snowshoe_march.description]

+1 movement range for the rest of the climb.

### dawn_rest

[unlitbeacon.boon.dawn_rest.name]

The Dawn Challenge

[unlitbeacon.boon.dawn_rest.description]

Rested and whole — +6 max HP for the rest of the run.

### battlefield_arms

[unlitbeacon.boon.battlefield_arms.name]

Armed from the Ice

[unlitbeacon.boon.battlefield_arms.description]

Shields with four hundred winters in them — +2 armor class for the rest of the run.

## Ally names

[unlitbeacon.ally.tam.name]

Tam Emberwright

## Enemy names

[unlitbeacon.enemy.shelf_pikeman.name]

Shelf Pikeman

[unlitbeacon.enemy.volley_archer.name]

Volley Archer

[unlitbeacon.enemy.vanguard.name]

Vanguard

[unlitbeacon.enemy.breaker.name]

Breaker

[unlitbeacon.enemy.frozen_watchman.name]

Frozen Watchman

[unlitbeacon.enemy.meredrowned.name]

Meredrowned

[unlitbeacon.enemy.blizzard_wisp.name]

Blizzard Wisp

[unlitbeacon.enemy.winters_voice.name]

Winter's Voice

[unlitbeacon.enemy.winters_voice_quiet.name]

Winter's Voice

[unlitbeacon.enemy.glacier_poacher.name]

Glacier Poacher

[unlitbeacon.enemy.poacher_torchhand.name]

Torchhand

[unlitbeacon.enemy.poacher_torchhand_unlit.name]

Torchhand

[unlitbeacon.enemy.poacher_torchhand_soft.name]

Torchhand

[unlitbeacon.enemy.poacher_cutter.name]

Poacher Cutter

[unlitbeacon.enemy.muster_warden.name]

Muster Warden

[unlitbeacon.enemy.the_adjutant.name]

The Adjutant

[unlitbeacon.enemy.honor_guard.name]

Honor Guard

[unlitbeacon.enemy.marshal_vail.name]

Marshal Vail

# The Lantern of Elmsworth

## Campaign

[lantern.title]

The Lantern of Elmsworth

[lantern.blurb]

Goblins have stolen the Harvest Lantern on the eve of the festival — and the reason why is colder than the theft.

[lantern.enemyFactionName]

Goblins

[lantern.rewardSkin.name]

Goblin King

## Story

### intro (story)

[lantern.node.intro.text]

On the eve of the Harvest Festival, the great Lantern of Elmsworth vanishes from the village square — and goblin tracks lead east into the Bramblewood. The elders wring their hands. The festival cannot happen in the dark.

{mainName} steps forward. "We'll bring it back before the first dance."

Three companions shoulder their packs and follow you onto the east road. Behind you the square is very quiet, and colder than an autumn evening has any business being.

### e1_pre (encounter — e1)

[lantern.node.e1_pre.preText]

The road narrows between two hedgerows. Too quiet. Then — a whistle from ahead, an answering whistle from BEHIND. Goblin scrappers spring the ambush from both sides!

### lv2 (levelup)

### crossroads (choice)

[lantern.node.crossroads.text]

At the crossroads, chaos: the miller's cart is under attack by goblins to the north — while two goblin scouts sprint east with a stuffed sack, giggling.

"{mainName}, we can't do both!"

[lantern.node.crossroads.choice.0.label]

Defend the miller's cart

[lantern.node.crossroads.choice.1.label]

Run down the scouts

### e2_mill (encounter — e2)

[lantern.node.e2_mill.preText]

You charge the cart — and the goblins scatter toward the old mill, where more of them wait. A slinger scrambles up beside the mill wheel, sling already spinning. The miller cheers you on from under the cart.

### lv3 (levelup)

### cart_note (story)

[lantern.node.cart_note.text]

{if helpedMiller}The grateful miller will not let you leave empty-handed.{else}Word of the chase reaches Elmsworth before you do.{/if} By dusk a wagon comes creaking up the east road after you — the village brazier, packed in sand, still burning.

"If the Lantern's gone," says the carter, "the festival still needs a FIRE. You get the light. We'll keep this lit until you do."

It is a kind, impractical, entirely Elmsworth idea. And within the hour, {mainName}, something in the trees decides it wants those coals very badly indeed.

### e3_pre (encounter — e3)

[lantern.node.e3_pre.preText]

They come out of the bramble for the CART, not for you — quick little shapes with cloth-wrapped hands, reaching straight past your blades for the hot coals.

The carter dives clear. The brazier cannot run and cannot fight. Six rounds until the wagon-team is hitched and away, {mainName}. Keep it burning.

[lantern.encounter.e3.objective]

Keep the ember-cart burning — hold them off until the wagon-team is hitched

[lantern.encounter.e3.goal.0.name]

Not a Spark Lost

[lantern.encounter.e3.goal.0.description]

Finish with the whole party standing.

### lv4 (levelup)

### orchard_note (story)

[lantern.node.orchard_note.text]

The thieves flee east through the old orchard — and set it alight behind them.

It is not spite. You watch them do it: they touch a torch to the low branches almost apologetically, hands wrapped in the same rags they used for the coals, and run on cradling their stolen fire like an egg.

"They're not burning the orchard to stop us," your companion says slowly. "They're burning it because they can't carry enough."

### e4_pre (encounter — e4)

[lantern.node.e4_pre.preText]

Smoke lies flat between the rows and the fire is spreading with the wind — across your path, not theirs. Torch hurlers stand in the clear ground beyond, lobbing more of it into the gaps you would most like to use.

There is no way around, {mainName}. Only through, and only where the ground is not yet burning.

[lantern.encounter.e4.goal.0.name]

Through the Smoke

[lantern.encounter.e4.goal.0.description]

Lose nobody to the fire or the hurlers.

### lv5 (levelup)

### hollow_note (story)

[lantern.node.hollow_note.text]

Past the orchard the land drops into the Howling Hollow, and dusk comes down with it. From the treeline comes a long, wobbly howl — enthusiastic, but not very wolf-like. A second joins in, badly out of tune.

They are thinner than they should be, these wolfpelts. You can see it even at this distance, even under the pelts: too much shoulder, not enough belly. Something has been going hungry in the Bramblewood for a while now.

### e5_pre (encounter — e5)

[lantern.node.e5_pre.preText]

The pack bursts from the trees — goblins in wolf pelts, sprinting on all fours, coming from three directions at once. The pelts have button eyes sewn on. The daggers are real.

And they keep howling for friends. You will not clear this hollow, {mainName} — you only have to still be standing when they lose their nerve. Put the trees at your back and HOLD.

[lantern.encounter.e5.objective]

Hold out until the pack breaks off

[lantern.encounter.e5.goal.0.name]

Held the Hollow

[lantern.encounter.e5.goal.0.description]

Still standing, all four, when the pack breaks.

### ridge_note (story)

[lantern.node.ridge_note.text]

The pack breaks and scatters into the dark, and in the sudden quiet somebody points east.

There — high on the ridge, moving fast — a warm gold glow, bobbing along at a dead run. Your lantern, {mainName}, in somebody's arms, going up and over.

Once it crosses that ridge line the trail forks four ways into the deep rock, and you will be guessing for a week.

### e6_pre (encounter — e6)

[lantern.node.e6_pre.preText]

It is a footrace with knives in it. The carriers have the head start and the ridge is seven rounds away at a sprint.

Do not stop to win the fight, {mainName}. Winning the fight IS losing the race — get somebody onto that ridge line.

[lantern.encounter.e6.objective]

Bring down both lantern-carriers before they crest the ridge

[lantern.encounter.e6.goal.0.name]

Cut Them Off

[lantern.encounter.e6.goal.0.description]

Reach the ridge by round 6.

### fork_woods (choice)

[lantern.node.fork_woods.text]

You catch them at the ridge — and they drop the Lantern and run, which no thief has ever done in the history of thieving.

Below, in the scrub, the wolfpelts have regrouped. Not charging. Just watching the party eat, with the terrible patience of something that has not eaten in a while.

You have three days of provisions and a long dark descent ahead of you, {mainName}. And a decision.

[lantern.node.fork_woods.choice.0.label]

Set the provisions out for the pack — they are starving.

[lantern.node.fork_woods.choice.1.label]

Keep the packs full — the deep rock is no place to go hungry.

### cave_note (story)

[lantern.node.cave_note.text]

{if fedPack}The wolfpelts take the food without a sound and vanish. Some way down the trail you notice the howling has stopped following you — and, a mile on, a fresh-killed hare left square in the middle of the path, which is either a gift or a very pointed comment.{else}The party keeps its larder and the wolfpelts keep their distance, howling from the ridge until the dark swallows the sound. Whatever else the descent brings, nobody in this company will be going hungry in it.{/if}

At the bottom of the trail, a warm orange glow spills from a cave mouth in the hillside. Not lantern-light. Firelight, and a lot of it — the Bramblewood goblins have taken every stolen ember down this hole.

Something very large is snoring just inside the entrance.

### e7_pre (encounter — e7)

[lantern.node.e7_pre.preText]

The snoring stops. An orc bruiser fills the cave mouth like a boulder with shoulders, and he does not intend to move — so do not waste the evening trying to make him.

The gap beside him is barely wide enough for one. Scrappers slip along the walls to catch you in the squeeze. Get the whole party through to the far side, {mainName}, and let the doorman keep his door.

[lantern.encounter.e7.objective]

Push past the cave mouth — get everyone through

[lantern.encounter.e7.goal.0.name]

Last One Through

[lantern.encounter.e7.goal.0.description]

Get out with nobody lost in the squeeze.

### lv7 (levelup)

### bridge_note (story)

[lantern.node.bridge_note.text]

Beyond the cave mouth the passage opens into a hall no goblin ever carved: a stone span over a black river, with lamp-brackets set into the walls every ten feet.

Every bracket is empty. Every one of them is scorched — decades of soot, centuries of it, and not a coal left anywhere.

"{mainName}," says your companion quietly, "this place used to be LIT."

### e8_pre (encounter — e8)

[lantern.node.e8_pre.preText]

They hit the span from both ends at once — a warden anchoring the far side, runners pouring in behind you. The bridge is the only way down and it is exactly wide enough to be a problem.

Six rounds to hold both ends, {mainName}. Give up either one and you are fighting in two directions on a stone ribbon over a river.

[lantern.encounter.e8.objective]

Take both ends of the bridge at once, before the way down closes

[lantern.encounter.e8.goal.0.name]

Both Ends Held

[lantern.encounter.e8.goal.0.description]

Take the span with nobody down.

### lv8 (levelup)

### dark_note (story)

[lantern.node.dark_note.text]

Below the bridge the warren goes properly dark.

Not unlit — EXTINGUISHED. Cold hearths in every side-chamber, swept clean and stacked with kindling that nobody has lit. Sleeping-nooks crowded three deep around the chimney stones, as if the whole warren had been huddling in the same few rooms for weeks.

And then your own lantern gutters, gasps, and goes out. Something in the dark makes a sound like a very large frog being polite.

### e9_pre (encounter — e9)

[lantern.node.e9_pre.preText]

You cannot see the walls. You can see each other, barely, and that only while somebody keeps a blade raised to catch what light there is.

Things come out of the black, take hold, and pull — and whoever gets pulled out of the circle is alone in a way that does not bear thinking about. Seven rounds until the dark thins, {mainName}. Keep the circle.

[lantern.encounter.e9.objective]

Keep the circle until the dark thins

[lantern.encounter.e9.goal.0.name]

Kept the Dark Out

[lantern.encounter.e9.goal.0.description]

Nobody lost to the black.

### emberheart (story)

[lantern.node.emberheart.text]

When the dark finally thins, the party is standing in the biggest chamber yet — and at the center of it, in a firepit forty feet across, sits the reason for all of this.

The Emberheart. A hearth-stone the size of a cottage, banked and tended and fed for nine hundred years by every goblin generation of the Bramblewood.

It is dead. Grey through and through, cold as the river, with a month of untouched kindling stacked around it in hopeful little pyramids.

A goblin child is asleep against the base of it, wrapped in three coats.

"They didn't steal our light because they're thieves," {mainName} says, and nobody in the party has an answer to that. "They stole it because theirs went out and they were too proud to knock."

### fork_door (choice)

[lantern.node.fork_door.text]

The throne room is one level up, and there are two ways into it.

A goblin in a stained apron detaches himself from the shadows by the cold ovens and clears his throat. "Name's Nib. Cook. Was a cook." He looks at the dead Emberheart, then at the Lantern in your hands, and something in his face gives up. "There's a scullery stair nobody guards. I'll walk you up it. Just — don't let them scrap the little ones over a hat."

The other road is the Coalgate: wardens, shields, and a straight fight up the main stair.

[lantern.node.fork_door.choice.0.label]

Follow Nib up the scullery stair.

[lantern.node.fork_door.choice.1.label]

Force the Coalgate and go up the front way.

### e10_pre (encounter — e10)

[lantern.node.e10_pre.preText]

{if tookScullery}Nib leads, and Nib is not quiet. Pans, apparently, are not designed for stealth.{else}The Coalgate goes down in splinters — and the noise brings every scullery in the warren out at once. Nib appears at your elbow anyway, ladle in hand, looking grimly resigned. "Front way. Course it was the front way."{/if}

Get the cook to the throne-room stair, {mainName}. He is armed, he is willing, and he is the only one down here still speaking to you.

[lantern.encounter.e10.objective]

Get Nib to the throne-room stair

[lantern.encounter.e10.goal.0.name]

The Cook Repaid

[lantern.encounter.e10.goal.0.description]

Bring Nib through with the whole party alive.

### lv10 (levelup)

### e11_pre (encounter — e11)

[lantern.node.e11_pre.preText]

Two chambers stand between the party and the throne: the cold hall where the Emberheart sits grey, and the throne approach beyond it.

No rest between them, {mainName}. Whatever you spend in the first room, you fight the second without.

### court_approach (story)

[lantern.node.court_approach.text]

The throne room is warm. It is the only warm room in the Bramblewood, and it is warm because every stolen coal, every pilfered ember, every lamp and brazier and candle-stub from three days of raiding is heaped around one chair.

Atop a throne of stolen furniture sits King Grubnash — an orc twice the size of his goblin subjects, wearing the Harvest Lantern as a crown, and looking less pleased with himself than the stories promised.

"MINE," he announces, without much conviction. "Prettiest hat in the Bramblewood."

Nib, very quietly, from behind you: "It's been the warmest room since the Heart went out. He sits in it so the little ones can have the rest."

"{mainName}," whispers your companion, "the crown is what we came for. Drop the King and the court scatters — but mind the shaman. Every wound you open, she closes."

### e12_pre (encounter — e12)

[lantern.node.e12_pre.preText]

King Grubnash rises, lantern-crown blazing, and for one moment he looks exactly like what he is: a very large orc, standing between a cold warren and the last warm thing in it.

Then he swings, and the moment is over.

Only the King has to fall, {mainName}. Silence the shaman first and take your time, or throw everything at the throne and hope he drops before she can mend him.

[lantern.encounter.e12.objective]

Bring down King Grubnash

[lantern.encounter.e12.goal.0.name]

Crowned Yourself

[lantern.encounter.e12.goal.0.description]

Let the hero strike the final blow.

### finale (end)

[lantern.node.finale.text]

Grubnash goes down like a felled oak, and the court scatters exactly as promised — out of the warm room, into the cold.

The Lantern is heavier than it looks. Warmer, too. {mainName} stands in a dead goblin warren holding a light that a village is waiting up for, and does the arithmetic that the whole descent has been building toward: one lantern, one festival, one night. Or one hearth, nine hundred years old, and a warren that will not see another winter without it.

It is not, in the end, a very hard sum.

The Emberheart takes the flame like something waking from a long faint — a crawl of orange through grey stone, then a breath of heat that knocks the kindling-pyramids over, then a roar. Goblins come out of the side-passages at a dead run, and stop, and stare, and start shouting for people who are still asleep.

Nib puts a pan on before the party is out of the chamber.

Elmsworth gets its festival two days late, in the dark, by candlelight — and every candle in the square was carried up out of the Bramblewood by somebody small and green who wanted to see what a harvest dance looked like. {if helpedMiller}The miller's family leads the first one.{else}The recovered pastries are served at the head table, only slightly dented.{/if} {if fedPack}The wolfpelts do not come to the square, but a great many hares are found on the village road that week, laid out very deliberately in the middle of the path.{/if}

King Grubnash, thoroughly dethroned, was last seen wearing a bucket and arguing about seating arrangements.

THE LANTERN OF ELMSWORTH — COMPLETE

### e2_chase (encounter — e2)

[lantern.node.e2_chase.preText]

The scouts lead you straight to the old mill and dive behind their friends. A slinger scrambles up beside the mill wheel, sling already spinning. The sack they dropped is full of festival pastries — and, oddly, charcoal.

## Achievements

### complete_easy

[lantern.achievement.complete_easy.name]

Lantern Lit

[lantern.achievement.complete_easy.description]

Complete The Lantern of Elmsworth on Easy.

### complete_medium

[lantern.achievement.complete_medium.name]

Lantern Blazing

[lantern.achievement.complete_medium.description]

Complete The Lantern of Elmsworth on Medium.

### complete_hard

[lantern.achievement.complete_hard.name]

Festival Hero

[lantern.achievement.complete_hard.description]

Complete The Lantern of Elmsworth on Hard.

### complete_nightmare

[lantern.achievement.complete_nightmare.name]

Light in the Dark

[lantern.achievement.complete_nightmare.description]

Complete The Lantern of Elmsworth on Nightmare — unlocks the Goblin King skin.

### friend_of_the_mill

[lantern.achievement.friend_of_the_mill.name]

Friend of the Mill

[lantern.achievement.friend_of_the_mill.description]

Defend the miller's cart.

### swift_justice

[lantern.achievement.swift_justice.name]

Swift Justice

[lantern.achievement.swift_justice.description]

Run down the goblin scouts.

### fed_the_pack

[lantern.achievement.fed_the_pack.name]

Fed the Pack

[lantern.achievement.fed_the_pack.description]

Give the wolfpelts the party's provisions.

### kept_the_larder

[lantern.achievement.kept_the_larder.name]

Kept the Larder

[lantern.achievement.kept_the_larder.description]

Keep the provisions for the descent.

### the_scullery_door

[lantern.achievement.the_scullery_door.name]

The Scullery Door

[lantern.achievement.the_scullery_door.description]

Enter the Undervault through the kitchens.

### the_coalgate

[lantern.achievement.the_coalgate.name]

The Coalgate

[lantern.achievement.the_coalgate.description]

Force the Coalgate and walk in the front way.

### not_a_spark_lost

[lantern.achievement.not_a_spark_lost.name]

Not a Spark Lost

[lantern.achievement.not_a_spark_lost.description]

Bring the ember-cart through with its brazier untouched.

### through_the_smoke

[lantern.achievement.through_the_smoke.name]

Through the Smoke

[lantern.achievement.through_the_smoke.description]

Cross the burning orchard without losing anyone.

### held_the_hollow

[lantern.achievement.held_the_hollow.name]

Held the Hollow

[lantern.achievement.held_the_hollow.description]

Hold the wolfpelt camp with the whole party standing.

### cut_them_off

[lantern.achievement.cut_them_off.name]

Cut Them Off

[lantern.achievement.cut_them_off.description]

Catch the lantern-carriers on the ridge by round 6.

### last_one_through

[lantern.achievement.last_one_through.name]

Last One Through

[lantern.achievement.last_one_through.description]

Escape the cave mouth without losing anyone.

### both_ends_held

[lantern.achievement.both_ends_held.name]

Both Ends Held

[lantern.achievement.both_ends_held.description]

Hold both ends of the Underbridge with nobody down.

### kept_the_dark_out

[lantern.achievement.kept_the_dark_out.name]

Kept the Dark Out

[lantern.achievement.kept_the_dark_out.description]

Survive the Dark Between without a single loss.

### the_cook_repaid

[lantern.achievement.the_cook_repaid.name]

The Cook Repaid

[lantern.achievement.the_cook_repaid.description]

Bring Nib through the sculleries without a scratch on the party.

### crowned_yourself

[lantern.achievement.crowned_yourself.name]

Crowned Yourself

[lantern.achievement.crowned_yourself.description]

Let the hero personally strike down King Grubnash.

## Boons

### fed_the_pack

[lantern.boon.fed_the_pack.name]

Fed the Pack

[lantern.boon.fed_the_pack.description]

Well-fed and unhunted — +4 max HP for every hero, for the rest of the run.

### kept_the_larder

[lantern.boon.kept_the_larder.name]

Kept the Larder

[lantern.boon.kept_the_larder.description]

Full packs for the long dark — +1 movement range for the rest of the run.

### scullery_door

[lantern.boon.scullery_door.name]

The Scullery Door

[lantern.boon.scullery_door.description]

Nib's pilfered kitchen plate, strapped on in the dark — +2 armor class for the rest of the run.

### coalgate_forced

[lantern.boon.coalgate_forced.name]

The Coalgate Forced

[lantern.boon.coalgate_forced.description]

Warden's shields, taken the hard way — every hero starts each remaining encounter shielded.

## Ally names

[lantern.ally.cart.name]

The Ember-Cart

[lantern.ally.nib.name]

Nib the Cook

## Enemy names

[lantern.enemy.goblin_scrapper.name]

Goblin Scrapper

[lantern.enemy.goblin_slinger.name]

Goblin Slinger

[lantern.enemy.wolfpelt_runner.name]

Wolfpelt Runner

[lantern.enemy.ember_carrier.name]

Ember Carrier

[lantern.enemy.ladle_snatcher.name]

Ladle Snatcher

[lantern.enemy.ember_warden.name]

Ember Warden

[lantern.enemy.ember_thief.name]

Ember Thief

[lantern.enemy.torch_hurler.name]

Torch Hurler

[lantern.enemy.orc_bruiser.name]

Orc Bruiser

[lantern.enemy.dark_croaker.name]

Dark Croaker

[lantern.enemy.coalgate_warden.name]

Coalgate Warden

[lantern.enemy.moss_shaman.name]

Moss Shaman

[lantern.enemy.king_grubnash.name]

King Grubnash

# The Bell of Goblinopolis

## Campaign

[goblinopolis.title]

The Bell of Goblinopolis

[goblinopolis.blurb]

Amrun's flood-bell has cracked, the rain is three weeks out, and the only foundry that can cast a new one is in a city where moving a bell requires a form nobody has invented yet.

[goblinopolis.enemyFactionName]

Bluecaps

[goblinopolis.rewardSkin.name]

Bluecap Pathfinder

## Story

### intro (story)

[goblinopolis.node.intro.text]

The flood-bell of Amrun has hung in its tower for two hundred years, and for two hundred years it has rung twice: once a season for practice, and eleven times for real. Every one of those eleven, the lower town got out in time.

Last Tuesday it cracked. Not dramatically — a hairline, and a sound like a dropped plate.

The rain season is three weeks out. The only foundry that can cast a bell that size is in Goblinopolis, four days downriver, and Goblinopolis has already agreed to sell them one at a fair price.

"So it's simple," says the Amrun reeve, handing {mainName} a purse and a receipt. "Go and fetch it."

It is not simple.

### foundry_pre (encounter — e1)

[goblinopolis.node.foundry_pre.preText]

The bell is beautiful. Two tons of new bronze, still warm, sitting in the foundry yard under a tarp — and the foundry yard, at dusk, turns out to be a popular place for people who like bronze.

They come over the east wall in ones and twos, hopeful rather than organised. {mainName} puts the company between them and the bell.

[goblinopolis.encounter.e1.goal.0.name]

Nothing Pilfered

[goblinopolis.encounter.e1.goal.0.description]

Hold the yard without losing anyone.

### lv2 (levelup)

### permit_1 (story)

[goblinopolis.node.permit_1.text]

In the morning a goblin in a very clean coat is standing at the yard gate with a clipboard.

"Bell?" he says. "Moving a bell requires Form 12-C. Movement of Cast Goods Exceeding One Ton Within City Limits."

"We bought it. Here's the receipt."

"The receipt is excellent. Twelve-C is about MOVEMENT." He produces one, stamps it, hands it over, and looks quietly pleased. "Undersecretary Snagg. You'll be seeing me."

The form is, as far as anyone can tell, entirely genuine.

### first_mile_pre (encounter — e2)

[goblinopolis.node.first_mile_pre.preText]

The wagon is the slowest thing on the road and the loudest thing in the city — two tons of bronze on ungreased axles, announcing itself to every opportunist within four streets.

It cannot fight, {mainName}. It cannot even hurry. Walk it to the crossroads.

[goblinopolis.encounter.e2.objective]

Get the bell-wagon down the road

[goblinopolis.encounter.e2.goal.0.name]

Not a Scratch

[goblinopolis.encounter.e2.goal.0.description]

Finish with the whole party standing.

### lv3 (levelup)

### tollgate_note (story)

[goblinopolis.node.tollgate_note.text]

At the Blue-Ribbon Tollgate a kettlehelm orc reads Form 12-C twice, upside down once, and shakes his head.

"Twelve-C's movement. This here's a GATE. Gate needs 12-C ANNEX FOUR."

"Where do we get Annex Four?"

He points back down the road you came from, at a small office you have already walked past twice.

"Or," he says, in the voice of a man offering a great kindness, "you could pay the toll."

The toll is precisely the amount of money the company is carrying.

### tollgate_pre (encounter — e3)

[goblinopolis.node.tollgate_pre.preText]

Nobody at the tollgate wants a fight. They want the toll, and they want it more than they want to be reasonable, and somewhere between the third and fourth explanation the barricade stops being a formality.

{mainName} takes the direct lane. The gap in the barricade is the whole argument.

[goblinopolis.encounter.e3.goal.0.name]

Exact Change

[goblinopolis.encounter.e3.goal.0.description]

Clear the gate without losing anyone.

### lv4 (levelup)

### office_note (story)

[goblinopolis.node.office_note.text]

The Office of Forms occupies a building the size of a granary, and every window is lit at midnight.

Inside there is an antechamber for people waiting to be told which queue to join, and beyond it the stamp hall, where the actual stamping happens. Between them: one door, one clerk, and a sign reading PLEASE HAVE YOUR FORM READY.

The company's form is ready. The company's form has been ready for two days.

### office_pre (encounter — e4)

[goblinopolis.node.office_pre.preText]

The clerk looks at Annex Four, then at the party, then at the clock — which reads four minutes to closing — and reaches, with enormous deliberation, for a different stamp.

What happens next is technically a queue dispute. {mainName} will have to get through the antechamber AND the hall, and there is no rest between them.

[goblinopolis.encounter.e4.goal.0.name]

In Triplicate

[goblinopolis.encounter.e4.goal.0.description]

Clear both rooms with the whole party standing.

### lv5 (levelup)

### ink_note (story)

[goblinopolis.node.ink_note.text]

Annex Four is stamped. Annex Four, it turns out, must be COUNTERSIGNED, and the countersigning office is on the far side of the Ink Works.

The Ink Works is where Goblinopolis prints its forms. All of them. Vats of lamp-black, presses the size of houses, and a floor that is slick with two centuries of spilled ink and lamp oil.

Somebody has knocked over a lamp. The lanes between the presses are burning, and the print crew — reasonably — assumes the party did it.

### ink_pre (encounter — e5)

[goblinopolis.node.ink_pre.preText]

Fire runs in lanes across the press floor, exactly where you would want to walk. Sparkcap slingers throw more of it from the clear ground beyond.

There is no way around, {mainName}. Only through, and only where the ground is not yet burning.

[goblinopolis.encounter.e5.goal.0.name]

Dry Pages

[goblinopolis.encounter.e5.goal.0.description]

Lose nobody to the fire.

### barge_note (story)

[goblinopolis.node.barge_note.text]

Countersigned. Stamped. Annexed. The bell reaches the river dock with four days to spare and a folder two inches thick.

The customs barge casts off at the turn of the tide, and it is the only crossing that can take the wagon's weight. The inspectors want to open the folder. All of it. Page by page.

The tide, unlike the inspectors, is not negotiable.

### barge_pre (encounter — e6)

[goblinopolis.node.barge_pre.preText]

Seven rounds until the barge casts off with or without you, {mainName}. The inspectors are not villains — they are people with a job and a checklist, standing exactly where you need to be.

Settle it quickly. The tide is the enemy here.

[goblinopolis.encounter.e6.objective]

Clear the barge before it casts off

[goblinopolis.encounter.e6.goal.0.name]

Cleared Customs

[goblinopolis.encounter.e6.goal.0.description]

Clear the barge by round 6.

### fork_district (choice)

[goblinopolis.node.fork_district.text]

Across the river, two roads run up to the Records Hall, and the wagon can take one.

The Sparkyard is the foundry district — hot, loud, and full of people who work metal for a living and have opinions about a company hauling two tons of it.

The Old Ledger Quarter is where the city's clerks live: narrow, quiet, and threaded with courier shortcuts that do not appear on any map the city admits to.

[goblinopolis.node.fork_district.choice.0.label]

Take the Sparkyard — let the smiths look at the bell.

[goblinopolis.node.fork_district.choice.1.label]

Take the Old Ledger Quarter — follow the couriers.

### district_note (story)

[goblinopolis.node.district_note.text]

{if sparkRoute}The Sparkyard smiths come out to look at the bell the way farriers look at a good horse, and by the time the wagon is through, half the company is wearing hammered offcuts strapped over their gear. Nobody offered. Nobody asked. It simply happened.{else}The Ledger Quarter's couriers take one look at the folder, another at the wagon, and start calling directions from the rooftops — left here, cut through, mind the step. By the far end the company is moving a third faster and has learned six shortcuts that do not exist.{/if}

Ahead, the Records Hall. And in front of it, an entire street of weighing machinery.

### weigh_pre (encounter — e7)

[goblinopolis.node.weigh_pre.preText]

The city will not issue the final permit without a certified weight, and a certified weight requires both plates of the municipal weighbridge to hold steady for a full reading.

Both plates, {mainName}. Step off either one and the needle drops and the reading voids — and the Bellrunners have worked out exactly what that means.

[goblinopolis.encounter.e7.objective]

Hold both weigh-plates at once to take the reading early — or hold out until it takes on its own

[goblinopolis.encounter.e7.goal.0.name]

True Weight

[goblinopolis.encounter.e7.goal.0.description]

Take the plates with nobody down.

### lv7 (levelup)

### impound_note (story)

[goblinopolis.node.impound_note.text]

The certified weight is 2.04 tons. Form 12-C covers goods "exceeding one ton". Annex Four covers "exceeding two".

"So we're covered," says {mainName}.

"You're covered TWICE," Snagg agrees, delighted. "Which is an irregularity. I'm impounding pending review."

And there it is, finally, plain: he does not want the bell. He does not want the money. He wants the delivery to remain, permanently, in progress.

The impound yard gates lock at sundown. The company is inside them, with the bell, and the review is scheduled for a date Snagg has not yet chosen.

### impound_pre (encounter — e8)

[goblinopolis.node.impound_pre.preText]

They come over the yard walls all night, in shifts, with the patience of people being paid by the hour.

Hold until dawn, {mainName}. At dawn the gates open on their own — that, at least, is in the regulations.

[goblinopolis.encounter.e8.objective]

Hold the impound yard until dawn

[goblinopolis.encounter.e8.goal.0.name]

Held the Yard

[goblinopolis.encounter.e8.goal.0.description]

Survive with the whole party standing.

### lv8 (levelup)

### audit_note (story)

[goblinopolis.node.audit_note.text]

At dawn {mainName} does not take the bell out of the yard. {mainName} walks into the Records Hall and asks, for the first time, the question nobody has asked all week:

"Who signs the final permit?"

The answer is on the wall in a frame, and it has been there for eleven years. THE WARBOSS. And under it, in Gurm's enormous careless hand, a standing order:

*"LET BELLS THROUGH. WARS ARE LOUD ENOUGH."*

Signed. Sealed. Eleven years old. It covers every bell that has ever entered or left this city, and it has been hanging four rooms from Snagg's desk the entire time.

Snagg is already reaching for the file cabinet.

### audit_pre (encounter — e9)

[goblinopolis.node.audit_pre.preText]

"That order," Snagg says, with the first real feeling he has shown all week, "is UNFILED."

He is not a warrior. He is a middle-clerk with a grasp like a closing drawer and two departments who will do as they are told, and he is standing between {mainName} and eleven years of signed permission.

Only Snagg has to fall. The clerks are a problem you may solve or simply walk around.

[goblinopolis.encounter.e9.objective]

Close Undersecretary Snagg's file

[goblinopolis.encounter.e9.goal.0.name]

Audited Him

[goblinopolis.encounter.e9.goal.0.description]

Let the hero strike the final blow.

### fork_cabinet (choice)

[goblinopolis.node.fork_cabinet.text]

Snagg's file cabinet is enormous, and it is full.

Not of nothing — of PERMITS. Hundreds of them. Stalled applications going back years: a bakery expansion, a bridge repair, a widow's pension, a school. Every one of them stamped, complete, and never released.

Outside, the rain has started early.

[goblinopolis.node.fork_cabinet.choice.0.label]

Nail every one of them to the Records Hall door.

[goblinopolis.node.fork_cabinet.choice.1.label]

Carry each one back to whoever filed it.

### rain_note (story)

[goblinopolis.node.rain_note.text]

{if publishedLot}By noon the Records Hall door is papered edge to edge and there is a crowd four deep reading it, and somewhere near the back a woman starts laughing and cannot stop. The city knows the company's faces now. Doors open as the wagon passes.{else}It takes until dusk and the company knocks on ninety-one doors. At the fortieth, someone starts following along to help carry. By the ninetieth there are a dozen of them, and every one is fed, soaked, and extremely well informed about where the party is going next.{/if}

And the rain does not stop. It is three weeks early and it is not stopping.

Amrun is four days downriver. The bell is here. The lower town is there.

There is no version of this where the wagon arrives in time.

"Then we don't send the bell," says {mainName}. "We send the SOUND. Goblinopolis has a tower."

### first_rain_pre (encounter — e10)

[goblinopolis.node.first_rain_pre.preText]

The lower streets are already shin-deep and the water is still rising. The bell has to get to the tower, and everyone in Goblinopolis with a wet boot and a bad idea is between here and there.

They are not soldiers, {mainName}. They are frightened people in a flooding city. Keep the bell above the water.

[goblinopolis.encounter.e10.objective]

Keep the bell above the water until the street drains

[goblinopolis.encounter.e10.goal.0.name]

Above the Water

[goblinopolis.encounter.e10.goal.0.description]

Nobody lost to the flood.

### stair_pre (encounter — e11)

[goblinopolis.node.stair_pre.preText]

The Stair of Stamps is a switchback of ninety-one steps, and the bell weighs two tons, and it is going UP.

The yard is filling behind you with everyone who would rather this did not happen. Get the whole company to the belfry landing, {mainName}. Nobody left on the stair.

[goblinopolis.encounter.e11.objective]

Carry the bell to the belfry stair — get everyone up

[goblinopolis.encounter.e11.goal.0.name]

Up the Stair

[goblinopolis.encounter.e11.goal.0.description]

Get everyone up with nobody lost.

### lv10 (levelup)

### ring_pre (encounter — e12)

[goblinopolis.node.ring_pre.preText]

The bell hangs. The rope is in reach. Down in the lower streets the crest is coming up the avenue like a hand pushed under a rug — and four days downriver, Amrun's watchmen are standing in the rain waiting for a sound that cannot possibly come from their own cracked tower.

Sound carries a long way over water, {mainName}. Eight rounds. Reach the rope.

[goblinopolis.encounter.e12.objective]

Ring the flood-bell before the crest arrives

[goblinopolis.encounter.e12.goal.0.name]

Rung On Time

[goblinopolis.encounter.e12.goal.0.description]

Ring it by round 7.

### finale (end)

[goblinopolis.node.finale.text]

The new bell of Goblinopolis rings for the first time at twenty past four in the afternoon, in driving rain, four days upriver of the town that paid for it.

It is not, by any measure, where it was supposed to be.

Amrun hears it. Nobody there can explain how — the river fog, the valley, two hundred years of knowing exactly what that sound means and not needing to be told twice — but the lower town is empty by dark, and when the water comes through at midnight it takes eleven houses, a mill, and nobody at all.

The bell stays. Amrun votes on it, formally, and the vote is not close: a bell that rang for them from another city's tower is not a bell you take down. Goblinopolis rings it every season now, twice — once for practice, and once, at the turn of the year, for a town four days downriver that can hear it.

{if publishedLot}The bakery expansion was approved eleven days later. So was the school.{else}The widow whose pension you carried up three flights of stairs sends a letter to Amrun every year, and has never once mentioned the flood.{/if}

Undersecretary Snagg was reassigned to Rural Fencing Disputes, where he is, by all accounts, extremely thorough and completely harmless.

Warboss Gurm never learned any of it had happened. He signed the order eleven years ago, on a Tuesday, between two other things, and has not thought about bells since.

THE BELL OF GOBLINOPOLIS — COMPLETE

## Achievements

### complete_easy

[goblinopolis.achievement.complete_easy.name]

Bell-Road Beginner

[goblinopolis.achievement.complete_easy.description]

Complete The Bell of Goblinopolis on Easy.

### complete_medium

[goblinopolis.achievement.complete_medium.name]

Buckbridge Deputy

[goblinopolis.achievement.complete_medium.description]

Complete The Bell of Goblinopolis on Medium.

### complete_hard

[goblinopolis.achievement.complete_hard.name]

Goblinopolis Envoy

[goblinopolis.achievement.complete_hard.description]

Complete The Bell of Goblinopolis on Hard.

### complete_nightmare

[goblinopolis.achievement.complete_nightmare.name]

Ringer of the Impossible Bell

[goblinopolis.achievement.complete_nightmare.description]

Complete The Bell of Goblinopolis on Nightmare — unlocks the Bluecap Pathfinder skin.

### the_sparkyard

[goblinopolis.achievement.the_sparkyard.name]

The Sparkyard Route

[goblinopolis.achievement.the_sparkyard.description]

Take the bell through the foundry district.

### the_ledger_quarter

[goblinopolis.achievement.the_ledger_quarter.name]

The Ledger Quarter

[goblinopolis.achievement.the_ledger_quarter.description]

Take the bell through the old clerks' quarter.

### published_the_lot

[goblinopolis.achievement.published_the_lot.name]

Published the Lot

[goblinopolis.achievement.published_the_lot.description]

Nail every stalled permit to the Records Hall door.

### returned_by_hand

[goblinopolis.achievement.returned_by_hand.name]

Returned by Hand

[goblinopolis.achievement.returned_by_hand.description]

Carry every stalled permit back to the goblin who filed it.

### nothing_pilfered

[goblinopolis.achievement.nothing_pilfered.name]

Nothing Pilfered

[goblinopolis.achievement.nothing_pilfered.description]

Hold the foundry yard without losing anyone.

### not_a_scratch

[goblinopolis.achievement.not_a_scratch.name]

Not a Scratch

[goblinopolis.achievement.not_a_scratch.description]

Bring the bell-wagon through its first mile untouched.

### exact_change

[goblinopolis.achievement.exact_change.name]

Exact Change

[goblinopolis.achievement.exact_change.description]

Clear the tollgate without losing anyone.

### in_triplicate

[goblinopolis.achievement.in_triplicate.name]

In Triplicate

[goblinopolis.achievement.in_triplicate.description]

Clear the Office of Forms with the whole party standing.

### dry_pages

[goblinopolis.achievement.dry_pages.name]

Dry Pages

[goblinopolis.achievement.dry_pages.description]

Cross the Ink Works without losing anyone to the fire.

### cleared_customs

[goblinopolis.achievement.cleared_customs.name]

Cleared Customs

[goblinopolis.achievement.cleared_customs.description]

Clear the customs barge by round 6.

### true_weight

[goblinopolis.achievement.true_weight.name]

True Weight

[goblinopolis.achievement.true_weight.description]

Hold both scale platforms with nobody down.

### held_the_yard

[goblinopolis.achievement.held_the_yard.name]

Held the Yard

[goblinopolis.achievement.held_the_yard.description]

Survive the impound yard with the whole party standing.

### audited_him

[goblinopolis.achievement.audited_him.name]

Audited Him

[goblinopolis.achievement.audited_him.description]

Let the hero personally close Snagg's file.

### above_the_water

[goblinopolis.achievement.above_the_water.name]

Above the Water

[goblinopolis.achievement.above_the_water.description]

Survive the first rain without a single loss.

### up_the_stair

[goblinopolis.achievement.up_the_stair.name]

Up the Stair

[goblinopolis.achievement.up_the_stair.description]

Carry the bell up the Stair of Stamps with nobody lost.

### rung_on_time

[goblinopolis.achievement.rung_on_time.name]

Rung On Time

[goblinopolis.achievement.rung_on_time.description]

Ring the flood-bell by round 7.

## Boons

### sparkyard_plate

[goblinopolis.boon.sparkyard_plate.name]

Sparkyard Plate

[goblinopolis.boon.sparkyard_plate.description]

Foundry offcuts, hammered to fit — +2 armor class for the rest of the run.

### ledger_boots

[goblinopolis.boon.ledger_boots.name]

Ledger-Runner Boots

[goblinopolis.boon.ledger_boots.description]

The quarter's couriers know every shortcut — +1 movement range for the rest of the run.

### the_published_lot

[goblinopolis.boon.the_published_lot.name]

Published the Lot

[goblinopolis.boon.the_published_lot.description]

A city that suddenly owes you a favor — every unit starts each remaining encounter shielded.

### returned_by_hand

[goblinopolis.boon.returned_by_hand.name]

Returned by Hand

[goblinopolis.boon.returned_by_hand.description]

Fed at every door you knocked on — +6 max HP for the rest of the run.

## Ally names

[goblinopolis.ally.wagon.name]

The Bell-Wagon

## Enemy names

[goblinopolis.enemy.bluecap_scout.name]

Bluecap Scout

[goblinopolis.enemy.bellrunner.name]

Bellrunner

[goblinopolis.enemy.sparkcap_slinger.name]

Sparkcap Slinger

[goblinopolis.enemy.bluecap_pathfinder.name]

Bluecap Pathfinder

[goblinopolis.enemy.kettlehelm_orc.name]

Kettlehelm Orc

[goblinopolis.enemy.mudboot_bruiser.name]

Mudboot Bruiser

[goblinopolis.enemy.patchcoat_mender.name]

Patchcoat Mender

[goblinopolis.enemy.ironbell_warden.name]

Ironbell Warden

[goblinopolis.enemy.undersecretary_snagg.name]

Undersecretary Snagg

[goblinopolis.enemy.clerk_of_seals.name]

Clerk of Seals

[goblinopolis.enemy.clerk_of_stamps.name]

Clerk of Stamps

[goblinopolis.enemy.wet_boot_looter.name]

Wet-Boot Looter

[goblinopolis.enemy.flood_looter.name]

Wet-Boot Looter

[goblinopolis.enemy.customs_inspector.name]

Customs Inspector

# The Moonberry Masquerade

## Campaign

[moonberry.title]

The Moonberry Masquerade

[moonberry.blurb]

The deed to the night-market hangs around one man's neck, one night a year, at a party you were not invited to.

[moonberry.enemyFactionName]

Masquers

[moonberry.rewardSkin.name]

Ember Juggler

## Story

### intro (story)

[moonberry.node.intro.text]

The Moonberry night-market is four hundred stalls on eleven pontoons, and it has fed this city since before the city had a name. It belongs, on paper, to the families who built it.

On different paper — one sheet, signed, witnessed, and won at cards eleven years ago in a game everybody now agrees was rigged — it belongs to the Night Cartographer.

He has never closed it. He simply takes a third of everything, and once a year, on the brightest night of the summer, he throws a masquerade aboard his floating palace to celebrate the anniversary of winning it.

The families have exhausted the courts. Tonight they hire {mainName} instead.

"Get in," says the eldest of them, sliding a purse across the table. "Open his vault. Bring back the Charter."

### dock_pre (encounter — e1)

[moonberry.node.dock_pre.preText]

You come in low and quiet on the canal side, and the dock is not as empty as it was supposed to be — three of the Cartographer's lantern lifters, working the water-stairs for whatever the tide brings up.

They have not raised an alarm. {mainName} would very much like to keep it that way, which means finishing this before anyone thinks to.

[moonberry.encounter.e1.goal.0.name]

Quiet Landing

[moonberry.encounter.e1.goal.0.description]

Take the dock without losing anyone.

### lv2 (levelup)

### contact_note (story)

[moonberry.node.contact_note.text]

A heist needs three things the company does not have: a way in, a way through, and a way out.

It has, instead, a name — a market-family contact who knows all three, currently sitting in a tea-house on the far side of the night market with people watching the door.

"They'll have somebody on me," the note says. "Somebody fast."

### market_pre (encounter — e2)

[moonberry.node.market_pre.preText]

The market at midnight is four hundred stalls of cover and no sightlines at all, which cuts both ways.

Something is moving parallel to you through the aisles — fast, patient, and not interested in the party at all. It wants the contact.

Keep them alive, {mainName}, and keep moving.

[moonberry.encounter.e2.objective]

Get your contact through the market

[moonberry.encounter.e2.goal.0.name]

Unremarked

[moonberry.encounter.e2.goal.0.description]

Finish with the whole party standing.

### lv3 (levelup)

### arch_note (story)

[moonberry.node.arch_note.text]

"Three ways in," says the contact, drawing on the table in spilled tea. "Front gate — the Silver Arch — invitation only, and the invitations are hand-checked by a woman who has met every guest personally.

"Water-door, under the west wing. Gondoliers only, and they know each other's faces.

"Or the troupe entrance." A pause. "He hires performers. Dozens of them, every year, and they come in wearing masks."

"So we get hired," says {mainName}.

"So you audition," says the contact. "But first — we watch the arch, and we learn who stands where."

### arch_pre (encounter — e3)

[moonberry.node.arch_pre.preText]

Casing a gate means being AT the gate long enough to read it — six rounds of guard rotation, from close enough to count.

The velvet guards notice, eventually. They always do. Hold the arch, {mainName}, and let the eyes do their work.

[moonberry.encounter.e3.objective]

Hold the arch and read the rotation

[moonberry.encounter.e3.goal.0.name]

Cased It

[moonberry.encounter.e3.goal.0.description]

Hold with the whole party standing.

### lv4 (levelup)

### audition_note (story)

[moonberry.node.audition_note.text]

The troupe auditions on a moored ferry-stage two hours before the doors open, and the Cartographer's people are not gentle about it. Last year's juggler is this year's judge, and the judging involves live fire.

"They throw," the contact says, apologetic. "It's not personal. It's just the standard."

{mainName} looks at the stage, and at the embers already scattered across it, and at the company.

"We've done worse for less."

### fork_stage (choice)

[moonberry.node.fork_stage.text]

The colours can be earned or they can be taken.

On the ferry-stage the troupe judges an audition with live fire and marksmen at the back — showmanship, at range, on a floor that is already burning.

At the loading dock behind the stage, the same colours hang on the same hooks, guarded by stagehands who have never once been asked for them. A narrow dock, a locked cage, and a footman who does not stay down.

[moonberry.node.fork_stage.choice.0.label]

Audition on the ferry-stage — earn the colours in front of the judges.

[moonberry.node.fork_stage.choice.1.label]

Take the loading dock — the colours are on a hook, and the hook is behind the stagehands.

### audition_pre (encounter — e4)

[moonberry.node.audition_pre.preText]

The stage is small, the embers are already burning where you want to stand, and the marksmen at the back are scoring the performance.

Do not stand in the fire, {mainName}. Everything else is showmanship.

[moonberry.encounter.e4.goal.0.name]

A Good Audition

[moonberry.encounter.e4.goal.0.description]

Take the stage without losing anyone.

### lv5 (levelup)

### servants_note (story)

[moonberry.node.servants_note.text]

The company gets the colours: half-masks, silver on black, and a call time.

Colours get you aboard. They do not get you above the waterline — performers stay in the servants' wing until they are wanted, and the servants' wing is where the palace keeps everything it does not want guests to see.

Including, it turns out, its footmen.

### servants_pre (encounter — e5)

[moonberry.node.servants_pre.preText]

Laundry first, then the silver hall — two rooms, one door between them, and no rest on the way through.

Whatever you spend below stairs, {mainName}, you will not have upstairs.

[moonberry.encounter.e5.goal.0.name]

Below Stairs

[moonberry.encounter.e5.goal.0.description]

Clear both rooms with the whole party standing.

### courier_note (story)

[moonberry.node.courier_note.text]

In the silver hall the contact stops dead, holding a schedule pinned to the wall.

"They're running the guest list to the gate. Physical copy, checked against every mask at the door — including the performers." A beat. "Our names are not on it. When it arrives, our colours stop working."

"How long?"

"Two couriers, six minutes, and they left before we did."

### courier_pre (encounter — e6)

[moonberry.node.courier_pre.preText]

Two couriers, going in different directions, both faster than anyone in the company.

Both of them, {mainName}, and quickly. A list that reaches the gate is a list that gets read.

[moonberry.encounter.e6.objective]

Stop the guest list reaching the gate

[moonberry.encounter.e6.goal.0.name]

The Guest List

[moonberry.encounter.e6.goal.0.description]

Intercept them by round 5.

### fork_specialist (choice)

[moonberry.node.fork_specialist.text]

The contact can reach exactly one more person before the doors open, and the two of them do not work together.

The Forger can put the company on any list in the city and make the paper older than the ink. Walk in the front, greeted by name.

The Gondolier knows every water-door, service stair and rooftop crossing on the canal — not a way IN so much as a way through, and out again.

[moonberry.node.fork_specialist.choice.0.label]

The Forger — go in the front, invited.

[moonberry.node.fork_specialist.choice.1.label]

The Gondolier — come up through the water-door.

### specialist_note (story)

[moonberry.node.specialist_note.text]

{if tookForger}The Forger works for forty minutes and hands over four invitations that are, in every measurable respect, more genuine than the real ones. The woman at the arch greets the company by names they have never heard before and means it.{else}The Gondolier says almost nothing and simply walks, and the company follows her through a water-door, up a service stair, along a roof, and down into a linen store — inside the palace, forty feet from the ballroom, in under four minutes.{/if}

Either way, the company is aboard. And either way, the Cartographer's private wing is behind one locked door on the upper landing, with the ball in full voice below.

### door_pre (encounter — e7)

[moonberry.node.door_pre.preText]

The lock is not a lock so much as an opinion — but opinions take time, and the landing is overlooked from three sides.

Your specialist needs six rounds. {mainName} needs to make sure nobody reaches them for six rounds. That is the entire arrangement.

[moonberry.encounter.e7.objective]

Keep the specialist working

[moonberry.encounter.e7.goal.0.name]

Held the Landing

[moonberry.encounter.e7.goal.0.description]

Nobody down when the door opens.

### lv7 (levelup)

### mirrors_pre (encounter — e8)

[moonberry.node.mirrors_pre.preText]

Beyond the door: the Hall of Mirrors, which is not a hall with mirrors in it but a hall MADE of them — freestanding frames in ranks, angled so that every lane looks like every other lane and half of them end in glass.

The footmen know which lanes are real. {mainName} does not. Pick well.

[moonberry.encounter.e8.goal.0.name]

No Reflection

[moonberry.encounter.e8.goal.0.description]

Cross without losing anyone.

### lv8 (levelup)

### unmask_note (story)

[moonberry.node.unmask_note.text]

It goes wrong in the ballroom, and it goes wrong the way these things always do — not because of a mistake, but because somebody was simply looking at the right moment.

A guest turns. Squints. Says, quite loudly and without malice, "But you're not with the troupe."

And the room, four hundred masks strong, turns to look.

### unmask_pre (encounter — e9)

[moonberry.node.unmask_pre.preText]

The palace sweeps the floor for impostors, and the floor is crowded, and every mask looks like every other mask — which is the only thing keeping the company alive.

Seven rounds until the dance changes and the room re-mixes, {mainName}. Do not get cornered. Do not get counted.

[moonberry.encounter.e9.objective]

Survive the sweep until the room re-mixes

[moonberry.encounter.e9.goal.0.name]

Still Masked

[moonberry.encounter.e9.goal.0.description]

Nobody lost in the sweep.

### fork_sabotage (choice)

[moonberry.node.fork_sabotage.text]

The vault is two floors down and the company has one thing it can break on the way.

The lantern-lines feed every light in the palace from a single winch room. Cut them and the whole wing goes dark — including the vault.

The alarm bells run off the same winch room, on a separate drum. Cut those and nothing rings tonight, no matter what anyone sees.

[moonberry.node.fork_sabotage.choice.0.label]

Cut the lights — work in the dark.

[moonberry.node.fork_sabotage.choice.1.label]

Cut the bells — let them shout all they like.

### vault_pre (encounter — e10)

[moonberry.node.vault_pre.preText]

{if cutLights}The wing goes black between one step and the next, and the company keeps walking, because the company counted the steps on the way in.{else}The bells swing, and hammer, and produce a flat wooden knocking that carries nowhere at all. Somewhere above, a guard captain begins to shout himself hoarse.{/if}

Three rooms stand between the party and the vault door, and the vault door is already open — because the Cartographer, tonight of all nights, has been showing people his collection.

[moonberry.encounter.e10.goal.0.name]

The Whole Take

[moonberry.encounter.e10.goal.0.description]

Clear all three rooms with the party standing.

### reveal (story)

[moonberry.node.reveal.text]

The vault is everything the families said it would be, and none of what they wanted.

Invitations, eleven years of them, pinned in rows. Ledgers. A wall of small pretty stolen things, each labelled in a fine hand with the name of whoever used to own it. A gondola oar. Somebody's wedding ring.

No Charter.

{mainName} stands in the middle of eleven years of other people's property and works it out about half a second before the contact says it out loud.

"It's the sash," she says. "The Charter. He WEARS it. Every masquerade, eleven years running — that black sash with the silver thread. He's downstairs in it right now, in front of four hundred people, dancing."

A pause.

"Well," says {mainName}, already moving. "He did say he wanted a performance."

### stage_pre (encounter — e11)

[moonberry.node.stage_pre.preText]

The company comes down the grand stair in costume, in step, and four hundred masked guests assume — for about six seconds — that this is part of the entertainment.

The Night Cartographer, to his enormous credit, assumes it too. Then he sees who is under the masks, and smiles, and steps back into the ring of lanterns as though he had planned it.

"Oh, WONDERFUL," he says.

He is wearing the deed to the night-market like a costume, {mainName}. Take it off him.

[moonberry.encounter.e11.objective]

Take the Charter from the Night Cartographer

[moonberry.encounter.e11.goal.0.name]

Took the Sash

[moonberry.encounter.e11.goal.0.description]

Let the hero strike the final blow.

### lv10 (levelup)

### roof_pre (encounter — e12)

[moonberry.node.roof_pre.preText]

The sash is in {mainName}'s hand and the alarm is up — {if cutLights}shouted from window to window, since nothing in this wing will light{else}shouted, and only shouted, since nothing in this palace will ring{/if} — and the whole household is between the company and the water.

Up, then. Across the roof line, to the gondola mooring at the east end.

Eight rounds, and everyone goes over the edge together, {mainName}. Nobody gets left on this roof.

[moonberry.encounter.e12.objective]

Reach the gondola line — everyone gets out (8 rounds)

[moonberry.encounter.e12.goal.0.name]

Clean Getaway

[moonberry.encounter.e12.goal.0.description]

Reach the line by round 6.

### finale (end)

[moonberry.node.finale.text]

The gondola is where the contact promised, and the canal takes the company out through the lantern-lines before the palace works out which direction to look.

The Charter is read aloud at the night-market at dawn, to four hundred stalls on eleven pontoons and everyone who works them, and then it is burned in a brazier on the middle pontoon while people cheer — which is legally meaningless and, it turns out, entirely the point. The families file the original transfer the same morning. Nobody contests it. Contesting it would require explaining the card game.

The Night Cartographer does not pursue it. He sends, instead, a note: a map of the market drawn from memory, every stall in its right place, with a line beneath it in that same fine hand — *"It was the best thing I ever owned. You will take better care of it than I did. Do come next year."*

{if tookForger}The Forger has, by then, produced four invitations for next summer. They are, as usual, more genuine than the real ones.{else}The Gondolier will not say how she got out. She was on the far pontoon before the party reached the water, and she was not wet.{/if}

The masquerade is held again the following summer, on the brightest night, by the families. Everyone is invited. There is no guest list.

THE MOONBERRY MASQUERADE — COMPLETE

### loading_dock_pre (encounter — e4b)

[moonberry.node.loading_dock_pre.preText]

The dock is two wagons wide and every crate on it is somebody's cover. The stagehands come at you in the gap, the gate guard holds the cage, and the footman gets up again.

No fire, no marksmen, no room. Take the colours, {mainName}, and take them quickly — the audition ends in ten minutes and the winners come back here to change.

[moonberry.encounter.e4b.goal.0.name]

Clean Hands

[moonberry.encounter.e4b.goal.0.description]

Take the colours without losing anyone.

## Achievements

### complete_easy

[moonberry.achievement.complete_easy.name]

Invited

[moonberry.achievement.complete_easy.description]

Complete The Moonberry Masquerade on Easy.

### complete_medium

[moonberry.achievement.complete_medium.name]

Masked and Welcome

[moonberry.achievement.complete_medium.description]

Complete The Moonberry Masquerade on Medium.

### complete_hard

[moonberry.achievement.complete_hard.name]

The Quiet Guest

[moonberry.achievement.complete_hard.description]

Complete The Moonberry Masquerade on Hard.

### complete_nightmare

[moonberry.achievement.complete_nightmare.name]

Star of the Evening

[moonberry.achievement.complete_nightmare.description]

Complete The Moonberry Masquerade on Nightmare — unlocks the Ember Juggler skin.

### the_audition

[moonberry.achievement.the_audition.name]

The Audition

[moonberry.achievement.the_audition.description]

Earn the troupe's colours on the ferry-stage.

### the_loading_dock

[moonberry.achievement.the_loading_dock.name]

The Loading Dock

[moonberry.achievement.the_loading_dock.description]

Take the troupe's colours off the hook behind the stagehands.

### the_forger

[moonberry.achievement.the_forger.name]

The Forger

[moonberry.achievement.the_forger.description]

Recruit the forger and walk in the front gate.

### the_gondolier

[moonberry.achievement.the_gondolier.name]

The Gondolier

[moonberry.achievement.the_gondolier.description]

Recruit the gondolier and come up through the water-door.

### cut_the_lights

[moonberry.achievement.cut_the_lights.name]

Cut the Lights

[moonberry.achievement.cut_the_lights.description]

Sabotage the palace lanterns before the vault.

### cut_the_bells

[moonberry.achievement.cut_the_bells.name]

Cut the Bells

[moonberry.achievement.cut_the_bells.description]

Sabotage the alarm bells before the vault.

### quiet_landing

[moonberry.achievement.quiet_landing.name]

Quiet Landing

[moonberry.achievement.quiet_landing.description]

Take the canal dock without losing anyone.

### unremarked

[moonberry.achievement.unremarked.name]

Unremarked

[moonberry.achievement.unremarked.description]

Bring the specialist through the market untouched.

### cased_it

[moonberry.achievement.cased_it.name]

Cased It

[moonberry.achievement.cased_it.description]

Hold the Silver Arch with the whole party standing.

### good_audition

[moonberry.achievement.good_audition.name]

A Good Audition

[moonberry.achievement.good_audition.description]

Take the ferry stage without losing anyone.

### below_stairs

[moonberry.achievement.below_stairs.name]

Below Stairs

[moonberry.achievement.below_stairs.description]

Cross the servants' wing with the whole party standing.

### guest_list

[moonberry.achievement.guest_list.name]

The Guest List

[moonberry.achievement.guest_list.description]

Intercept the courier by round 5.

### held_the_landing

[moonberry.achievement.held_the_landing.name]

Held the Landing

[moonberry.achievement.held_the_landing.description]

Keep the specialist working with nobody down.

### no_reflection

[moonberry.achievement.no_reflection.name]

No Reflection

[moonberry.achievement.no_reflection.description]

Cross the Hall of Mirrors without losing anyone.

### still_masked

[moonberry.achievement.still_masked.name]

Still Masked

[moonberry.achievement.still_masked.description]

Survive the unmasking without a single loss.

### the_whole_take

[moonberry.achievement.the_whole_take.name]

The Whole Take

[moonberry.achievement.the_whole_take.description]

Clear the vault with the whole party standing.

### took_the_sash

[moonberry.achievement.took_the_sash.name]

Took the Sash

[moonberry.achievement.took_the_sash.description]

Let the hero personally take the Charter.

### clean_getaway

[moonberry.achievement.clean_getaway.name]

Clean Getaway

[moonberry.achievement.clean_getaway.description]

Reach the gondola line by round 6.

## Boons

### forgers_papers

[moonberry.boon.forgers_papers.name]

The Forger's Papers

[moonberry.boon.forgers_papers.description]

Invitations good enough to be greeted by name — every unit starts each remaining encounter shielded.

### gondoliers_route

[moonberry.boon.gondoliers_route.name]

The Gondolier's Route

[moonberry.boon.gondoliers_route.description]

Every water-door and service stair in the city — +1 movement range for the rest of the run.

### cut_the_lights

[moonberry.boon.cut_the_lights.name]

Cut the Lights

[moonberry.boon.cut_the_lights.description]

Working in the dark, and used to it — +2 armor class for the rest of the run.

### cut_the_bells

[moonberry.boon.cut_the_bells.name]

Cut the Bells

[moonberry.boon.cut_the_bells.description]

No alarm, no hurry, one good meal in the servants' hall — +6 max HP for the rest of the run.

## Ally names

[moonberry.ally.contact.name]

The Contact

[moonberry.ally.specialist.name]

Your Specialist

## Enemy names

[moonberry.enemy.lantern_lifter.name]

Lantern Lifter

[moonberry.enemy.mooncap_marksman.name]

Mooncap Marksman

[moonberry.enemy.ember_juggler.name]

Ember Juggler

[moonberry.enemy.moonhook_caller.name]

Moonhook Caller

[moonberry.enemy.starstep_duelist.name]

Starstep Duelist

[moonberry.enemy.velvet_gate_guard.name]

Velvet Gate Guard

[moonberry.enemy.silverthread_mender.name]

Silverthread Mender

[moonberry.enemy.crescent_stalker.name]

Crescent Stalker

[moonberry.enemy.night_cartographer.name]

The Night Cartographer

[moonberry.enemy.mirror_footman.name]

Mirror Footman

[moonberry.enemy.list_courier.name]

List Courier

[moonberry.enemy.palace_crier.name]

Palace Crier

# The Sealed Deep

## Campaign

[sealeddeep.title]

The Sealed Deep

[sealeddeep.blurb]

Under the moor town of Ashfen, a warden three centuries past her term is losing her grip on a door the dead keep walking toward.

[sealeddeep.enemyFactionName]

The Barrow Dead

[sealeddeep.rewardSkin.name]

Goblin Adept

## Story

### intro (story)

[sealeddeep.node.intro.text]

Under the moor town of Ashfen sits a barrow older than the town — a door, and a warden who has kept it three hundred years. Six weeks ago the survey crew went down to shore up a collapsed gallery. They did not come back.

{mainName} is hired to bring them out. The barrow entrance yawns at the edge of town, cold air breathing up from the dark.

### descent (story)

[sealeddeep.node.descent.text]

The steps down are worn smooth by centuries of feet that were never meant to climb back up. Halfway down, something moves — bones knitted into the shape of a soldier, still standing an old post.

It does not seem to notice {mainName}. It is walking the wrong way: not up, toward the town, but down, toward the door.

### barrow_steps_node (encounter — e1)

[sealeddeep.node.barrow_steps_node.preText]

The skeleton sentries turn only when {mainName} gets close — not hostile at first, more startled, like something that forgot it could be interrupted. Then old training takes over, and bone hands find old swords.

[sealeddeep.encounter.e1.goal.0.name]

Clean Descent

[sealeddeep.encounter.e1.goal.0.description]

Clear the barrow steps without losing anyone.

### lv2 (levelup)

### gallery_note (story)

[sealeddeep.node.gallery_note.text]

Past the steps, the passage narrows into a gallery half-choked with fallen stone — the collapse the survey crew came to shore up. Chalk marks on the wall, still legible, read SAFE ROUTE THIS WAY in a hand that was clearly in a hurry.

The survey crew's own signs. They made it at least this far.

### gallery_node (encounter — e2)

[sealeddeep.node.gallery_node.preText]

Rubble chokes the gallery into a single crooked lane. Skeleton archers hold the high rubble on either side, and two shambling shapes plant themselves in the gap — slow, but built like the collapse itself.

[sealeddeep.encounter.e2.goal.0.name]

Quiet Gallery

[sealeddeep.encounter.e2.goal.0.description]

Carve through the collapsed gallery without the hero taking a scratch.

### lv3 (levelup)

### whistle (story)

[sealeddeep.node.whistle.text]

Beyond the gallery, a thin, tuneless whistling drifts from a side chamber — someone keeping their own spirits up in the dark. A survey lantern, badly rationed, still burns.

{mainName} finds one of the crew alive, wedged behind a fallen support beam, too injured to move — and three shapes already closing in on the light.

### whistle_node (encounter — e3)

[sealeddeep.node.whistle_node.preText]

The survivor presses back against the stone, whistling through chattering teeth, too hurt to run. Feral shapes circle the lantern light. {mainName} plants between them and the beam.

[sealeddeep.encounter.e3.objective]

Keep the survivor alive

[sealeddeep.encounter.e3.goal.0.name]

Kept the Watch

[sealeddeep.encounter.e3.goal.0.description]

Keep the whistling survivor alive to the very end.

### lv2b_skip (story)

[sealeddeep.node.lv2b_skip.text]

The survivor grips {mainName}'s arm once the last shape falls still. "Ashfen sent someone," they say, disbelieving. "Vessa said no one comes down here anymore." They point deeper into the dark. "The others went on. Toward her. Toward the door — I don't know why. None of us could explain it, even to ourselves."

### censer_note (story)

[sealeddeep.node.censer_note.text]

Deeper in, the air turns thick with old incense. A long hall of iron censers lines the walls, most cold for centuries — but a few have been recently tipped, spilling embers across the stone floor in slow-crawling lines of fire.

Ghoulish shapes pick their way between the burning lanes like they know the pattern by heart.

### censer_node (encounter — e4)

[sealeddeep.node.censer_node.preText]

The ghouls scatter toward the fire lanes, using the flame to herd {mainName} instead of fearing it themselves. Something heavier comes on behind them, too slow to care about the fire at all. A hooded cultist stands at the hall's center, watching with open curiosity rather than alarm.

### lv4 (levelup)

### walls_note (story)

[sealeddeep.node.walls_note.text]

The cultist did not run when the fight turned. "You'll want to be careful past here," they said, almost kindly, before {mainName} could ask anything else. "Some of them don't need doors anymore."

A moment later, {mainName} understands: a pale shape drifts straight through solid stone ahead, unbothered, patient, and utterly wrong to look at.

### walls_node (encounter — e5)

[sealeddeep.node.walls_node.preText]

The wraiths do not walk around the crypt walls — they walk through them, appearing on whichever side is least defended. {mainName} plants the party where they can watch every angle and simply endures.

[sealeddeep.encounter.e5.objective]

Survive until the seal steadies

### lv5 (levelup)

### counting_note (story)

[sealeddeep.node.counting_note.text]

A chant echoes up from a lower chamber, counted out in a slow, steady rhythm — cultists keeping time with something {mainName} can't see yet. A witch stands apart from the circle, unbothered by the growing frost creeping across the stone.

The counting is getting faster. Whatever it is building toward, it will finish with or without permission.

### counting_node (encounter — e6)

[sealeddeep.node.counting_node.preText]

The cultists break the chant only to defend it, falling back into rhythm the instant they can. The witch weaves frost between {mainName}'s party and the circle, buying every second she can.

[sealeddeep.encounter.e6.objective]

Silence the three chanters before the counting song ends (13 rounds)

[sealeddeep.encounter.e6.goal.0.name]

Outpaced the Dead

[sealeddeep.encounter.e6.goal.0.description]

Win the counting song by round 8.

### fork_allegiance (choice)

[sealeddeep.node.fork_allegiance.text]

Past the counting chamber, a warded door bears fresh scratch marks — and a voice on the other side, tired and unapologetic: "Whoever you are, turn back. I don't have the strength to explain myself, and you won't like the truth anyway." Sister Vessa, the Warden, still alive after three centuries at her post. How does {mainName} answer her?

[sealeddeep.node.fork_allegiance.choice.0.label]

Stand with Vessa — trust the warden holding the line.

[sealeddeep.node.fork_allegiance.choice.1.label]

Seal her out — she is grim, alone, and surrounded by the dead. That is reason enough.

### fork_allegiance_after (story)

[sealeddeep.node.fork_allegiance_after.text]

{if stoodWithVessa}Vessa says nothing for a long moment, then presses a hand against the door. A faint ward settles over {mainName}'s party like a held breath. "Don't make me regret this," she says, which is as close to thanks as she seems to get.{else}{mainName} turns away from the door without answering. Vessa doesn't call out again — but somewhere below, the party sleeps a little easier that night, whatever that's worth.{/if}

Ahead, the passage drops sharply toward a flooded stair, water rising fast from somewhere below.

### stair_node (encounter — e7)

[sealeddeep.node.stair_node.preText]

The stair floods a step at a time, and the barrow itself seems to be answering the choice at the door — water rising faster than it should, dead things surging up through it. {mainName} races for the landing above the flood line.

[sealeddeep.encounter.e7.objective]

Reach the flooded landing before the stair gives way (7 rounds)

### lv7 (levelup)

### long_way_note (story)

[sealeddeep.node.long_way_note.text]

Beyond the flooded stair, {mainName} finds the rest of the survey crew huddled in a dry alcove — exhausted, but alive, and desperate to see daylight again. The way back up is long, and something down here does not want them to leave.

### long_way_node (encounter — e8)

[sealeddeep.node.long_way_node.preText]

A lean, hungry shape breaks from the dark the moment the crew starts moving, beelining past every easier target straight for them. {mainName} moves to screen the crew's path up the passage.

[sealeddeep.encounter.e8.objective]

Get the survey crew safely up the passage before the barrow wakes (10 rounds)

[sealeddeep.encounter.e8.goal.0.name]

Crew Intact

[sealeddeep.encounter.e8.goal.0.description]

Bring the whole survey crew out alive.

### lv8 (levelup)

### tide_note (story)

[sealeddeep.node.tide_note.text]

With the crew safely away, {mainName} turns back toward the door alone with the party. The deeper the barrow goes, the more the dead simply arrive — not summoned, not raised, just called, the way a tide comes in whether anyone wants it to or not.

### tide_node (encounter — e9)

[sealeddeep.node.tide_node.preText]

Zombies plant themselves at the chamber's heart, patient as stone, while more of the dead keep filing in from deeper passages as the fight wears on. Clearing the room does not stop the tide — only outlasting it does.

### choir_note (story)

[sealeddeep.node.choir_note.text]

Past the tide, a ring of robed figures stands in perfect unmoving silence around a raised dais — a bone choir, still and waiting. At its center stands a hooded shape neither speaking nor singing, simply conducting a song no one else can hear yet.

"You don't have to kill the conductor," comes Vessa's voice from somewhere behind, quieter than before. "You have to make the choir stop singing."

### fork_facing (choice)

[sealeddeep.node.fork_facing.text]

The choir chamber opens ahead, and {mainName} has one more choice before stepping through: how to face whatever comes after.

[sealeddeep.node.fork_facing.choice.0.label]

Move light and fast — better footing than armor down here.

[sealeddeep.node.fork_facing.choice.1.label]

Brace and hold — better to be hard to knock down.

### fork_facing_after (story)

[sealeddeep.node.fork_facing_after.text]

{if choseSwiftFooting}{mainName} leads the party in light and quick, trusting speed over sturdiness for whatever the choir chamber holds.{else}{mainName} leads the party in braced and steady, trusting that nothing down here will knock them off their feet.{/if}

The choir chamber waits, silent and patient, just ahead.

### choir_node (encounter — e10)

[sealeddeep.node.choir_node.preText]

The three choristers begin to hum the instant {mainName} enters — a low, rising note that seems to pull at the walls themselves. The conductor never moves from the dais, never has to. Silence the choir.

[sealeddeep.encounter.e10.objective]

Silence the three choristers

[sealeddeep.encounter.e10.goal.0.name]

The Final Note

[sealeddeep.encounter.e10.goal.0.description]

Let the hero personally silence the bone choir.

### lv10 (levelup)

### wards_note (story)

[sealeddeep.node.wards_note.text]

With the choir silenced, the door's failing seal is laid bare — three warding stones, each guttering like a candle in wind. "Hold all three at once," Vessa says, appearing at last at the edge of the light, hollow-eyed and steady. "That's the only mending left in me. The rest is yours to hold."

### wards_node (encounter — e11)

[sealeddeep.node.wards_node.preText]

Witches and archers converge the instant a party member sets foot on a warding stone, determined to keep at least one uncovered. {mainName} splits the party to hold all three at once.

[sealeddeep.encounter.e11.objective]

Hold all three wards at once

### door_note (story)

[sealeddeep.node.door_note.text]

The seal steadies. For the first time in six weeks — maybe the first time in three hundred years — the door itself falls quiet. But quiet is not the same as sealed, and Vessa is already moving toward it, one hand pressed flat against the stone.

"Whatever's inside doesn't get out today," she says. "But it doesn't stop calling on its own. We finish this properly, or we do it again next season."

### final_rooms_node (encounter — e12)

[sealeddeep.node.final_rooms_node.preText]

Beyond the vault, the barrow opens into its oldest chambers — room after room the survey crew never reached, each one closer to the door than the last. At the very end waits the Conductor, patient as the barrow itself. {mainName} presses on to finish what the choir started.

[sealeddeep.encounter.e12.objective]

Reach and defeat what waits behind the door

### finale (end)

[sealeddeep.node.finale.text]

The Conductor falls still at last, and the pull toward the door goes quiet with it — not gone, Vessa warns, but quiet, the way a held breath is not the same as calm.

{if stoodWithVessa}She leans against the sealed door, more tired than triumphant. "Couldn't have held it without you," she admits, like the words cost her something. "Come back and check on me sometime. I won't promise to be pleasant about it."{else}She nods once at {mainName}, unsurprised and unbothered. "You did the job. That's enough between us." She turns back to the door before the party has even left the chamber.{/if}

The survey crew is waiting topside when {mainName} climbs back into daylight, and Ashfen rings its bell for the first time in six weeks — not in alarm, but because someone finally came home.

THE SEALED DEEP — COMPLETE

## Achievements

### complete_easy

[sealeddeep.achievement.complete_easy.name]

Barrow Steps

[sealeddeep.achievement.complete_easy.description]

Complete The Sealed Deep on Easy.

### complete_medium

[sealeddeep.achievement.complete_medium.name]

Keeper of the Line

[sealeddeep.achievement.complete_medium.description]

Complete The Sealed Deep on Medium.

### complete_hard

[sealeddeep.achievement.complete_hard.name]

Warden's Equal

[sealeddeep.achievement.complete_hard.description]

Complete The Sealed Deep on Hard.

### complete_nightmare

[sealeddeep.achievement.complete_nightmare.name]

Sealed the Deep

[sealeddeep.achievement.complete_nightmare.description]

Complete The Sealed Deep on Nightmare — unlocks the Warden of the Deep skin.

### stood_with_vessa

[sealeddeep.achievement.stood_with_vessa.name]

Stand With Vessa

[sealeddeep.achievement.stood_with_vessa.description]

Choose to stand with the Warden at the allegiance fork.

### sealed_her_out

[sealeddeep.achievement.sealed_her_out.name]

Seal Her Out

[sealeddeep.achievement.sealed_her_out.description]

Choose to shut the Warden out at the allegiance fork.

### swift_footing

[sealeddeep.achievement.swift_footing.name]

Light on Bone

[sealeddeep.achievement.swift_footing.description]

Choose swift footing at the second fork.

### iron_resolve

[sealeddeep.achievement.iron_resolve.name]

Iron Resolve

[sealeddeep.achievement.iron_resolve.description]

Choose iron resolve at the second fork.

### clean_descent

[sealeddeep.achievement.clean_descent.name]

Clean Descent

[sealeddeep.achievement.clean_descent.description]

Clear the barrow steps without losing anyone.

### quiet_gallery

[sealeddeep.achievement.quiet_gallery.name]

Quiet Gallery

[sealeddeep.achievement.quiet_gallery.description]

Carve through the collapsed gallery without the hero taking a scratch.

### kept_the_watch

[sealeddeep.achievement.kept_the_watch.name]

Kept the Watch

[sealeddeep.achievement.kept_the_watch.description]

Keep the whistling survivor alive to the very end.

### outpaced_the_dead

[sealeddeep.achievement.outpaced_the_dead.name]

Outpaced the Dead

[sealeddeep.achievement.outpaced_the_dead.description]

Win the counting song by round 8.

### crew_intact

[sealeddeep.achievement.crew_intact.name]

Crew Intact

[sealeddeep.achievement.crew_intact.description]

Bring the whole survey crew out alive.

### final_note

[sealeddeep.achievement.final_note.name]

The Final Note

[sealeddeep.achievement.final_note.description]

Let the hero personally silence the bone choir.

## Boons

### stand_with_vessa

[sealeddeep.boon.stand_with_vessa.name]

The Warden's Ward

[sealeddeep.boon.stand_with_vessa.description]

Vessa's wards cover the party for the rest of the descent — every unit starts each remaining encounter shielded.

### seal_her_out

[sealeddeep.boon.seal_her_out.name]

A Proper Rest

[sealeddeep.boon.seal_her_out.description]

Without the warden's ward to lean on, the party rests properly instead — +6 max HP for the rest of the run.

### swift_footing

[sealeddeep.boon.swift_footing.name]

Light on Bone

[sealeddeep.boon.swift_footing.description]

+1 movement range for the rest of the run.

### iron_resolve

[sealeddeep.boon.iron_resolve.name]

Iron Resolve

[sealeddeep.boon.iron_resolve.description]

+3 armor class for the rest of the run.

## Ally names

[sealeddeep.ally.survivor.name]

The Whistling Survivor

[sealeddeep.ally.crew.name]

The Survey Crew

## Enemy names

[sealeddeep.enemy.skeleton_warrior.name]

Skeleton Warrior

[sealeddeep.enemy.skeleton_archer.name]

Skeleton Archer

[sealeddeep.enemy.skeleton_reaver.name]

Skeleton Reaver

[sealeddeep.enemy.skeleton_berserker.name]

Skeleton Berserker

[sealeddeep.enemy.zombie.name]

Zombie

[sealeddeep.enemy.ghoul.name]

Ghoul

[sealeddeep.enemy.wraith.name]

Wraith

[sealeddeep.enemy.specter.name]

Specter

[sealeddeep.enemy.cultist.name]

Cultist

[sealeddeep.enemy.witch.name]

Witch

[sealeddeep.enemy.necromancer.name]

Necromancer

[sealeddeep.enemy.stair_reaver.name]

Stair Reaver

[sealeddeep.enemy.barrow_hound.name]

Barrow Hound

[sealeddeep.enemy.chorister_witch.name]

Chorister

[sealeddeep.enemy.chorister_cultist_1.name]

Chorister

[sealeddeep.enemy.chorister_cultist_2.name]

Chorister

[sealeddeep.enemy.the_conductor.name]

The Conductor
