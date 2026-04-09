import { GameState } from "./GameState";
import { WAVE, ENEMY_DRONE, ENEMY_HUNTER, ENEMY_BOSS, PLAYFIELD } from "./constants";

export type WaveSpawner = {
  spawnTimer: number;
  wave: number;
  spawned: number;
  bossActive: boolean;
};

export function createWaveSpawner(): WaveSpawner {
  return { spawnTimer: 1.5, wave: 1, spawned: 0, bossActive: false };
}

export function tickWaveSpawner(
  spawner: WaveSpawner,
  state: GameState,
  dt: number,
): void {
  const isBossWave = spawner.wave % WAVE.bossEveryN === 0;

  // Boss wave: spawn boss once, wait for it to die
  if (isBossWave) {
    if (!spawner.bossActive && spawner.spawned === 0) {
      state.enemies.push({
        id: state.nextEnemyId++,
        type: ENEMY_BOSS.type,
        x: PLAYFIELD.width / 2,
        y: -ENEMY_BOSS.height,
        hp: ENEMY_BOSS.maxHp,
        fireTimer: ENEMY_BOSS.fireInterval,
      });
      spawner.spawned = 1;
      spawner.bossActive = true;
    }
    if (spawner.bossActive && !state.enemies.some(e => e.type === ENEMY_BOSS.type)) {
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

  // Hunters appear from wave 3+, increasing chance
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
