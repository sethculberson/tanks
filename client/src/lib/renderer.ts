import type { Maze, SerializedGameState, TankState } from '../context/SocketContext.tsx';

const CELL_SIZE = 60;
const WALL_WIDTH = 5;
// Wooden palette
const FLOOR_A = '#d4a96a';   // lighter wood plank
const FLOOR_B = '#c49558';   // darker wood plank
const WALL_COLOR = '#3b1f0a'; // dark walnut
const BG_COLOR = '#b8833a';

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

  // Draw bullets — plain dark circles
  for (const bullet of state.bullets) {
    ctx.fillStyle = bullet.owner === 'p1' ? '#2e4a1a' : '#4a1a1a';
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
  // Muted earthy colors: olive green vs dark maroon
  const bodyColor  = id === 'p1' ? '#6b7c3a' : '#7c3a3a';
  const darkColor  = id === 'p1' ? '#3d4a1f' : '#4a1f1f';
  const treadColor = '#2a1a0a';

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
  ctx.fillText(id === 'p1' ? '1' : '2', 0, 1);

  ctx.restore();
}
