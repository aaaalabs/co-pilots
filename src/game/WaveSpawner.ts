import { GameState } from "./GameState";
import { WAVE, ENEMY_DRONE, PLAYFIELD } from "./constants";

export type WaveSpawner = {
  spawnTimer: number;  // seconds until next spawn
};

export function createWaveSpawner(): WaveSpawner {
  return { spawnTimer: WAVE.spawnInterval };
}

export function tickWaveSpawner(
  spawner: WaveSpawner,
  state: GameState,
  dt: number,
): void {
  spawner.spawnTimer -= dt;
  while (spawner.spawnTimer <= 0) {
    spawnDrone(state);
    spawner.spawnTimer += WAVE.spawnInterval;
  }
}

function spawnDrone(state: GameState): void {
  const minX = WAVE.spawnEdgeMargin;
  const maxX = PLAYFIELD.width - WAVE.spawnEdgeMargin;
  const x = minX + Math.random() * (maxX - minX);
  state.enemies.push({
    id: state.nextEnemyId++,
    x,
    y: -ENEMY_DRONE.height,
    hp: ENEMY_DRONE.maxHp,
  });
}
