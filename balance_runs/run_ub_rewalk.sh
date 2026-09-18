#!/bin/zsh
cd /Users/timot/Claude/backend
for e in e7 e8 e9 e10 e11 e12; do
  npx tsx src/ai/buildBattery.ts unlitbeacon --builds 150 --games 25 --encounter $e --shard 0 --shards 2 --json balance_runs/ub_rewalk_${e}_s0.json > balance_runs/ub_rewalk_${e}_s0.log 2>&1 &
  P0=$!
  npx tsx src/ai/buildBattery.ts unlitbeacon --builds 150 --games 25 --encounter $e --shard 1 --shards 2 --json balance_runs/ub_rewalk_${e}_s1.json > balance_runs/ub_rewalk_${e}_s1.log 2>&1 &
  P1=$!
  wait $P0 $P1
  echo "done $e $(date)" >> balance_runs/ub_rewalk_progress.log
done
echo ALLDONE >> balance_runs/ub_rewalk_progress.log
