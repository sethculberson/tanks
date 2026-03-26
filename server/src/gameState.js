import { generateMaze } from './maze.js';

const CELL_SIZE = 60;
const TANK_SPEED = 120; // pixels per second
const BULLET_SPEED = 240; // pixels per second
const TANK_TURN_SPEED = 150; // degrees per second
const BULLET_LIFETIME = 5; // seconds
const MAX_BOUNCES = 5;
const BULLET_RADIUS = 4;
const TANK_RADIUS = 14;

export function createGameState() {
  const maze = generateMaze(15, 11);

  const players = {
    p1: createTank(1, maze),
    p2: createTank(2, maze),
  };

  return {
    maze,
    players,
    bullets: [],
    scores: { p1: 0, p2: 0 },
    gameOver: false,
    winner: null,
    bulletIdCounter: 0,
  };
}

function createTank(playerNum, maze) {
  // Spawn positions: p1 top-left area, p2 bottom-right area
  const spawnCell = playerNum === 1
    ? { x: 1, y: 1 }
    : { x: maze.cols - 2, y: maze.rows - 2 };
  return {
    id: `p${playerNum}`,
    x: spawnCell.x * CELL_SIZE + CELL_SIZE / 2,
    y: spawnCell.y * CELL_SIZE + CELL_SIZE / 2,
    angle: playerNum === 1 ? 0 : 180,
    alive: true,
    input: { up: false, down: false, left: false, right: false, shoot: false },
    shootCooldown: 0,
  };
}

export function updateGameState(state, dt) {
  if (state.gameOver) return;

  const { maze, players, bullets } = state;

  // Update tanks
  for (const [id, tank] of Object.entries(players)) {
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
  state.bullets = state.bullets.filter(bullet => {
    bullet.lifetime -= dt;
    if (bullet.lifetime <= 0) return false;
    if (bullet.bounces > MAX_BOUNCES) return false;

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

      // Tank hit detection
      for (const [pid, tank] of Object.entries(players)) {
        if (!tank.alive) continue;
        const dist = Math.hypot(bullet.x - tank.x, bullet.y - tank.y);
        if (dist < TANK_RADIUS + BULLET_RADIUS) {
          tank.alive = false;
          const winner = bullet.owner;
          state.scores[winner]++;
          state.gameOver = true;
          state.winner = winner;
          return false;
        }
      }
    }
    return true;
  });
}

function collidesWithWall(x, y, radius, maze) {
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
