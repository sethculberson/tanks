import { generateMaze } from './maze.js';
import type { Maze } from './maze.js';

const CELL_SIZE = 60;
const TANK_SPEED = 120; // pixels per second
const BULLET_SPEED = 240; // pixels per second
const TANK_TURN_SPEED = 150; // degrees per second
const BULLET_LIFETIME = 5; // seconds
const MAX_BOUNCES = 5;
const BULLET_RADIUS = 4;
const TANK_RADIUS = 14;

export const MAX_PLAYERS = 6;
export const DEFAULT_MAX_PLAYERS = 2;

export type PlayerId = 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6';

// Six distinct spawn zones spread across the maze (cols=15, rows=11, interior cells 1–13 x 1–9).
// Each zone occupies a corner or mid-edge to guarantee no two players spawn adjacent.
// Within each zone a random cell is picked at runtime for slight variation.
const SPAWN_ZONES: Array<{ xMin: number; xMax: number; yMin: number; yMax: number; angle: number }> = [
  { xMin: 1,  xMax: 3,  yMin: 1, yMax: 3, angle: 135 }, // p1 top-left     → faces center
  { xMin: 11, xMax: 13, yMin: 1, yMax: 3, angle: 225 }, // p2 top-right    → faces center
  { xMin: 1,  xMax: 3,  yMin: 4, yMax: 6, angle: 90  }, // p3 mid-left     → faces right
  { xMin: 11, xMax: 13, yMin: 4, yMax: 6, angle: 270 }, // p4 mid-right    → faces left
  { xMin: 1,  xMax: 3,  yMin: 7, yMax: 9, angle: 45  }, // p5 bottom-left  → faces center
  { xMin: 11, xMax: 13, yMin: 7, yMax: 9, angle: 315 }, // p6 bottom-right → faces center
];

export interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shoot: boolean;
}

export interface Tank {
  id: PlayerId;
  x: number;
  y: number;
  angle: number;
  alive: boolean;
  input: PlayerInput;
  shootCooldown: number;
}

export interface Bullet {
  id: string;
  owner: PlayerId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  bounces: number;
  lifetime: number;
}

export interface RoundStats {
  shotsFired: number;
  shotsHit: number;
  shotsSelf: number;
  shotsExpired: number;
}

export interface GameState {
  maze: Maze;
  players: Record<PlayerId, Tank>;
  bullets: Bullet[];
  scores: Record<PlayerId, number>;
  gameOver: boolean;
  winner: PlayerId | null;
  bulletIdCounter: number;
  maxPlayers: number;
  roundStats: Record<PlayerId, RoundStats>;
}

export function createGameState(maxPlayers: number = DEFAULT_MAX_PLAYERS): GameState {
  const maze = generateMaze(15, 11);

  const players: Partial<Record<PlayerId, Tank>> = {};
  const scores: Partial<Record<PlayerId, number>> = {};
  const roundStats: Partial<Record<PlayerId, RoundStats>> = {};

  for (let i = 1; i <= maxPlayers; i++) {
    const id = `p${i}` as PlayerId;
    players[id] = createTank(i, maze);
    scores[id] = 0;
    roundStats[id] = { shotsFired: 0, shotsHit: 0, shotsSelf: 0, shotsExpired: 0 };
  }

  return {
    maze,
    players: players as Record<PlayerId, Tank>,
    bullets: [],
    scores: scores as Record<PlayerId, number>,
    gameOver: false,
    winner: null,
    bulletIdCounter: 0,
    maxPlayers,
    // Per-round stats reset each game; aggregated into Firestore on game end
    roundStats: roundStats as Record<PlayerId, RoundStats>,
  };
}

function createTank(playerNum: number, maze: Maze): Tank {
  const zone = SPAWN_ZONES[playerNum - 1];
  const cellX = zone.xMin + Math.floor(Math.random() * (zone.xMax - zone.xMin + 1));
  const cellY = zone.yMin + Math.floor(Math.random() * (zone.yMax - zone.yMin + 1));
  return {
    id: `p${playerNum}` as PlayerId,
    x: cellX * CELL_SIZE + CELL_SIZE / 2,
    y: cellY * CELL_SIZE + CELL_SIZE / 2,
    angle: zone.angle,
    alive: true,
    input: { up: false, down: false, left: false, right: false, shoot: false },
    shootCooldown: 0,
  };
}

export function updateGameState(state: GameState, dt: number): void {
  if (state.gameOver) return;

  const { maze, players, bullets } = state;

  // Update tanks
  for (const [id, tank] of Object.entries(players) as [PlayerId, Tank][]) {
    if (!tank.alive) continue;
    const { input } = tank;

    if (input.left) tank.angle -= TANK_TURN_SPEED * dt;
    if (input.right) tank.angle += TANK_TURN_SPEED * dt;
    tank.angle = ((tank.angle % 360) + 360) % 360;

    let dx = 0, dy = 0;
    if (input.up) {
      dx = Math.cos((tank.angle - 90) * Math.PI / 180) * TANK_SPEED * dt;
      dy = Math.sin((tank.angle - 90) * Math.PI / 180) * TANK_SPEED * dt;
    }
    if (input.down) {
      dx = -Math.cos((tank.angle - 90) * Math.PI / 180) * TANK_SPEED * dt;
      dy = -Math.sin((tank.angle - 90) * Math.PI / 180) * TANK_SPEED * dt;
    }

    if (dx !== 0 || dy !== 0) {
      const newX = tank.x + dx;
      const newY = tank.y + dy;
      if (!collidesWithWall(newX, tank.y, TANK_RADIUS, maze)) tank.x = newX;
      if (!collidesWithWall(tank.x, newY, TANK_RADIUS, maze)) tank.y = newY;
      // Clamp to maze bounds
      tank.x = Math.max(TANK_RADIUS, Math.min(maze.cols * CELL_SIZE - TANK_RADIUS, tank.x));
      tank.y = Math.max(TANK_RADIUS, Math.min(maze.rows * CELL_SIZE - TANK_RADIUS, tank.y));
    }

    // Shooting
    if (tank.shootCooldown > 0) tank.shootCooldown -= dt;
    if (input.shoot && tank.shootCooldown <= 0) {
      tank.shootCooldown = 0.5;
      state.roundStats[id].shotsFired++;
      const angleRad = (tank.angle - 90) * Math.PI / 180;
      state.bullets.push({
        id: `bullet_${state.bulletIdCounter++}`,
        owner: id,
        x: tank.x + Math.cos(angleRad) * (TANK_RADIUS + 5),
        y: tank.y + Math.sin(angleRad) * (TANK_RADIUS + 5),
        vx: Math.cos(angleRad) * BULLET_SPEED,
        vy: Math.sin(angleRad) * BULLET_SPEED,
        bounces: 0,
        lifetime: BULLET_LIFETIME,
      });
    }
  }

  // Update bullets
  state.bullets = bullets.filter(bullet => {
    bullet.lifetime -= dt;
    if (bullet.lifetime <= 0) {
      state.roundStats[bullet.owner].shotsExpired++;
      return false;
    }
    if (bullet.bounces > MAX_BOUNCES) {
      state.roundStats[bullet.owner].shotsExpired++;
      return false;
    }

    const steps = 5;
    for (let s = 0; s < steps; s++) {
      const stepDt = dt / steps;
      const nx = bullet.x + bullet.vx * stepDt;
      const ny = bullet.y + bullet.vy * stepDt;

      // Wall bounce
      const xBlocked = collidesWithWall(nx, bullet.y, BULLET_RADIUS, maze);
      const yBlocked = collidesWithWall(bullet.x, ny, BULLET_RADIUS, maze);
      if (xBlocked) { bullet.vx = -bullet.vx; bullet.bounces++; }
      if (yBlocked) { bullet.vy = -bullet.vy; bullet.bounces++; }

      bullet.x = bullet.x + bullet.vx * stepDt;
      bullet.y = bullet.y + bullet.vy * stepDt;

      // Tank hit detection — bullet cannot hit its own owner
      for (const [pid, tank] of Object.entries(players) as [PlayerId, Tank][]) {
        if (!tank.alive) continue;
        const dist = Math.hypot(bullet.x - tank.x, bullet.y - tank.y);
        if (dist < TANK_RADIUS + BULLET_RADIUS) {
          tank.alive = false;
          state.roundStats[bullet.owner].shotsHit++;
          state.scores[bullet.owner]++;

          const alivePlayers = (Object.entries(state.players) as [PlayerId, Tank][])
            .filter(([, t]) => t.alive);
          if (alivePlayers.length <= 1) {
            state.gameOver = true;
            state.winner = alivePlayers.length === 1 ? alivePlayers[0][0] : null;
          }
          return false;
        }
      }
    }
    return true;
  });
}

function collidesWithWall(x: number, y: number, radius: number, maze: Maze): boolean {
  // Check the cells this circle overlaps and test relevant walls
  const { cells, cols, rows } = maze;
  const left = Math.floor((x - radius) / CELL_SIZE);
  const right = Math.floor((x + radius) / CELL_SIZE);
  const top = Math.floor((y - radius) / CELL_SIZE);
  const bottom = Math.floor((y + radius) / CELL_SIZE);

  for (let cy = top; cy <= bottom; cy++) {
    for (let cx = left; cx <= right; cx++) {
      if (cx < 0 || cx >= cols || cy < 0 || cy >= rows) return true; // out of bounds
      const cell = cells[cy][cx];
      const cellLeft = cx * CELL_SIZE;
      const cellTop = cy * CELL_SIZE;
      const cellRight = cellLeft + CELL_SIZE;
      const cellBottom = cellTop + CELL_SIZE;

      if (cell.walls.N && y - radius < cellTop && x > cellLeft && x < cellRight) return true;
      if (cell.walls.S && y + radius > cellBottom && x > cellLeft && x < cellRight) return true;
      if (cell.walls.W && x - radius < cellLeft && y > cellTop && y < cellBottom) return true;
      if (cell.walls.E && x + radius > cellRight && y > cellTop && y < cellBottom) return true;
    }
  }
  return false;
}

export { CELL_SIZE };
