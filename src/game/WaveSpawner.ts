import { GameState } from "./GameState";
import {
  WAVE, ENEMY_DRONE, ENEMY_HUNTER,
  ENEMY_BOSS, ENEMY_BOSS_STRAFER, ENEMY_BOSS_SPLITTER, ENEMY_BOSS_CHARGER,
  HEART, PLAYFIELD, isBossType,
} from "./constants";

export type WaveSpawner = {
  spawnTimer: number;
  wave: number;
  spawned: number;
  bossActive: boolean;
  heartTimer: number;
};

export function createWaveSpawner(): WaveSpawner {
  return {
    spawnTimer: 1.5,
    wave: 1,
    spawned: 0,
    bossActive: false,
    heartTimer: HEART.spawnIntervalMin,
  };
}

const BOSS_ROTATION = [
  ENEMY_BOSS,
  ENEMY_BOSS_STRAFER,
  ENEMY_BOSS_SPLITTER,
  ENEMY_BOSS_CHARGER,
];

function bossForWave(wave: number) {
  const idx = Math.floor(wave / WAVE.bossEveryN) - 1;
  return BOSS_ROTATION[((idx % BOSS_ROTATION.length) + BOSS_ROTATION.length) % BOSS_ROTATION.length];
}

export function tickWaveSpawner(
  spawner: WaveSpawner,
  state: GameState,
  dt: number,
): void {
  // Heart pickup spawning when ship is low on HP
  if (state.ship.hp < HEART.spawnHpThreshold) {
    spawner.heartTimer -= dt;
    if (spawner.heartTimer <= 0 && !state.pickups.some(p => p.kind === "heart")) {
      const margin = HEART.swayAmplitude + 20;
      const baseX = margin + Math.random() * (PLAYFIELD.width - margin * 2);
      state.pickups.push({
        id: state.nextPickupId++,
        kind: "heart",
        x: baseX,
        y: -HEART.height,
        baseX,
        age: 0,
      });
      spawner.heartTimer =
        HEART.spawnIntervalMin +
        Math.random() * (HEART.spawnIntervalMax - HEART.spawnIntervalMin);
    }
  }

  const isBossWave = spawner.wave % WAVE.bossEveryN === 0;

  // Boss wave: spawn boss once, wait for it to die
  if (isBossWave) {
    if (!spawner.bossActive && spawner.spawned === 0) {
      const boss = bossForWave(spawner.wave);
      state.enemies.push({
        id: state.nextEnemyId++,
        type: boss.type,
        x: PLAYFIELD.width / 2,
        y: -boss.height,
        hp: boss.maxHp,
        fireTimer: "fireInterval" in boss ? boss.fireInterval : undefined,
      });
      spawner.spawned = 1;
      spawner.bossActive = true;
    }
    if (spawner.bossActive && !state.enemies.some(e => isBossType(e.type))) {
      spawner.bossActive = false;
      spawner.wave++;
      spawner.spawned = 0;
    }
    return;
  }

  // Normal wave: spawn until quota, then advance when screen is clear
  if (spawner.spawned >= WAVE.enemiesPerWave) {
    if (state.enemies.length === 0) {
      spawner.wave++;
      spawner.spawned = 0;
    }
    return;
  }

  spawner.spawnTimer -= dt;
  if (spawner.spawnTimer <= 0) {
    spawnEnemy(spawner, state);
    spawner.spawnTimer += Math.max(0.4, WAVE.spawnInterval - spawner.wave * 0.08);
  }
}

function spawnEnemy(spawner: WaveSpawner, state: GameState): void {
  const minX = WAVE.spawnEdgeMargin;
  const maxX = PLAYFIELD.width - WAVE.spawnEdgeMargin;
  const x = minX + Math.random() * (maxX - minX);

  const useHunter = spawner.wave >= 3 && Math.random() < Math.min(0.5, (spawner.wave - 2) * 0.15);
  const type = useHunter ? ENEMY_HUNTER.type : ENEMY_DRONE.type;
  const hp = useHunter ? ENEMY_HUNTER.maxHp : ENEMY_DRONE.maxHp;

  state.enemies.push({
    id: state.nextEnemyId++,
    type,
    x,
    y: -(useHunter ? ENEMY_HUNTER.height : ENEMY_DRONE.height),
    hp,
  });
  spawner.spawned++;
}
