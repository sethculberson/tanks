import type { Maze, SerializedGameState, TankState } from '../context/SocketContext.tsx';

const CELL_SIZE = 60;
const WALL_WIDTH = 5;
// Wooden palette
const FLOOR_A = '#d4a96a';   // lighter wood plank
const FLOOR_B = '#c49558';   // darker wood plank
const WALL_COLOR = '#3b1f0a'; // dark walnut
const BG_COLOR = '#b8833a';

// Earthy body / dark accent per player slot
const TANK_COLORS: Array<{ body: string; dark: string; bullet: string }> = [
  { body: '#6b7c3a', dark: '#3d4a1f', bullet: '#2e4a1a' }, // p1 olive green
  { body: '#7c3a3a', dark: '#4a1f1f', bullet: '#4a1a1a' }, // p2 maroon
  { body: '#3a6b7c', dark: '#1f3d4a', bullet: '#1a2e4a' }, // p3 teal
  { body: '#7c6b3a', dark: '#4a3d1f', bullet: '#4a3a1a' }, // p4 golden brown
  { body: '#6b3a7c', dark: '#3d1f4a', bullet: '#2e1a4a' }, // p5 purple
  { body: '#3a7c5a', dark: '#1f4a30', bullet: '#1a4a2e' }, // p6 forest green
];

export function drawGame(canvas: HTMLCanvasElement, maze: Maze, state: SerializedGameState): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { cols, rows, cells } = maze;

  canvas.width = cols * CELL_SIZE;
  canvas.height = rows * CELL_SIZE;

  // Base fill
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Floor — alternating wood plank tiles with grain lines
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

      // Subtle grain lines
      ctx.strokeStyle = 'rgba(0,0,0,0.07)';
      ctx.lineWidth = 1;
      for (let g = 4; g < CELL_SIZE; g += 8) {
        ctx.beginPath();
        ctx.moveTo(x * CELL_SIZE, y * CELL_SIZE + g);
        ctx.lineTo(x * CELL_SIZE + CELL_SIZE, y * CELL_SIZE + g);
        ctx.stroke();
      }
    }
  }

  // Draw maze walls — thick, dark wood
  ctx.strokeStyle = WALL_COLOR;
  ctx.lineWidth = WALL_WIDTH;
  ctx.lineCap = 'square';

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = cells[y][x];
      const px = x * CELL_SIZE;
      const py = y * CELL_SIZE;

      ctx.beginPath();
      if (cell.walls.N) { ctx.moveTo(px, py); ctx.lineTo(px + CELL_SIZE, py); }
      if (cell.walls.S) { ctx.moveTo(px, py + CELL_SIZE); ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE); }
      if (cell.walls.W) { ctx.moveTo(px, py); ctx.lineTo(px, py + CELL_SIZE); }
      if (cell.walls.E) { ctx.moveTo(px + CELL_SIZE, py); ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE); }
      ctx.stroke();
    }
  }

  // Draw bullets — colored by owner
  for (const bullet of state.bullets) {
    const playerIdx = parseInt(bullet.owner.replace('p', ''), 10) - 1;
    const colors = TANK_COLORS[Math.min(playerIdx, TANK_COLORS.length - 1)];
    ctx.fillStyle = colors.bullet;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a0a00';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Draw tanks
  for (const [id, tank] of Object.entries(state.players)) {
    if (!tank.alive) continue;
    drawTank(ctx, tank, id);
  }
}

function drawTank(ctx: CanvasRenderingContext2D, tank: TankState, id: string): void {
  const playerIdx = parseInt(id.replace('p', ''), 10) - 1;
  const colors = TANK_COLORS[Math.min(playerIdx, TANK_COLORS.length - 1)];
  const bodyColor  = colors.body;
  const darkColor  = colors.dark;
  const treadColor = '#2a1a0a';
  const playerNum = id.replace('p', '');

  ctx.save();
  ctx.translate(tank.x, tank.y);
  ctx.rotate((tank.angle * Math.PI) / 180);

  // Treads
  ctx.fillStyle = treadColor;
  ctx.fillRect(-14, -13, 28, 5);
  ctx.fillRect(-14, 8, 28, 5);

  // Tread detail notches
  ctx.fillStyle = '#4a3020';
  for (let i = -12; i < 14; i += 5) {
    ctx.fillRect(i, -13, 3, 5);
    ctx.fillRect(i, 8, 3, 5);
  }

  // Tank body
  ctx.fillStyle = darkColor;
  ctx.fillRect(-12, -10, 24, 20);
  ctx.fillStyle = bodyColor;
  ctx.fillRect(-10, -8, 20, 16);

  // Turret base
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();

  // Barrel
  ctx.fillStyle = darkColor;
  ctx.fillRect(-3, -20, 6, 20);

  // Player number label
  ctx.fillStyle = '#f5e6c8';
  ctx.font = 'bold 10px "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(playerNum, 0, 1);

  ctx.restore();
}
