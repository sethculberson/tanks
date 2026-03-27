import { describe, it, expect } from 'vitest';
import { generateMaze } from './maze.js';

describe('generateMaze', () => {
  it('returns correct dimensions', () => {
    const { cells, cols, rows } = generateMaze(15, 11);
    expect(cols).toBe(15);
    expect(rows).toBe(11);
    expect(cells).toHaveLength(11);
    expect(cells[0]).toHaveLength(15);
  });

  it('every cell has x/y coordinates', () => {
    const { cells } = generateMaze(5, 5);
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 5; x++) {
        expect(cells[y][x].x).toBe(x);
        expect(cells[y][x].y).toBe(y);
      }
  });

  it('every cell has wall properties', () => {
    const { cells } = generateMaze(5, 5);
    for (const row of cells)
      for (const cell of row) {
        expect(cell.walls).toHaveProperty('N');
        expect(cell.walls).toHaveProperty('S');
        expect(cell.walls).toHaveProperty('E');
        expect(cell.walls).toHaveProperty('W');
      }
  });

  it('outer border walls are intact', () => {
    const { cells, cols, rows } = generateMaze(7, 7);
    for (let x = 0; x < cols; x++) {
      expect(cells[0][x].walls.N).toBe(true);
      expect(cells[rows - 1][x].walls.S).toBe(true);
    }
    for (let y = 0; y < rows; y++) {
      expect(cells[y][0].walls.W).toBe(true);
      expect(cells[y][cols - 1].walls.E).toBe(true);
    }
  });

  it('walls are symmetric between adjacent cells', () => {
    const { cells, cols, rows } = generateMaze(7, 7);
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        if (x < cols - 1)
          expect(cells[y][x].walls.E).toBe(cells[y][x + 1].walls.W);
        if (y < rows - 1)
          expect(cells[y][x].walls.S).toBe(cells[y + 1][x].walls.N);
      }
  });

  it('maze is fully connected (all cells reachable from origin)', () => {
    const { cells, cols, rows } = generateMaze(9, 9);
    const visited = new Set();
    const stack = [{ x: 0, y: 0 }];
    while (stack.length) {
      const { x, y } = stack.pop();
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const cell = cells[y][x];
      if (!cell.walls.N && y > 0) stack.push({ x, y: y - 1 });
      if (!cell.walls.S && y < rows - 1) stack.push({ x, y: y + 1 });
      if (!cell.walls.W && x > 0) stack.push({ x: x - 1, y });
      if (!cell.walls.E && x < cols - 1) stack.push({ x: x + 1, y });
    }
    expect(visited.size).toBe(cols * rows);
  });

  it('does not include visited flag in output', () => {
    const { cells } = generateMaze(5, 5);
    for (const row of cells)
      for (const cell of row)
        expect(cell).not.toHaveProperty('visited');
  });
});
