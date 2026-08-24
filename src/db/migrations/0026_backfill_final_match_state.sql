-- Repair completed matches frozen at their pre-victory state (2026-08-23).
--
-- Until today, no match-over path persisted the final board: finalizeMatch set
-- status/winner and returned, skipping the match_state / last_turn_events /
-- turn_number update that non-terminal turns run. Every completed match in the
-- table therefore shows the board as it stood BEFORE the winning move — which
-- is what the losing player saw when they reopened the match.
--
-- turn_history DID capture a state snapshot on the whole-turn submit path, so
-- for matches finished that way the true final state is recoverable: take the
-- newest snapshot per match and copy it over any stale match_state. Matches
-- finished through the ROD per-action path never wrote the final row and
-- cannot be repaired — they keep their stale-but-consistent state and are
-- viewable; only the last move is missing. last_turn_events is left alone
-- (better an older turn's events than events mislabelled as the final turn).
UPDATE matches m
   SET match_state = th.state_snapshot,
       turn_number = th.turn_number
  FROM (
        SELECT DISTINCT ON (match_id) match_id, state_snapshot, turn_number
          FROM turn_history
         ORDER BY match_id, turn_number DESC
       ) th
 WHERE th.match_id = m.id
   AND m.status = 'completed'
   AND th.turn_number >= m.turn_number;
