// Maze generator using recursive backtracking
// Returns a 2D array of cells: { x, y, walls: { N, S, E, W } }
// Each wall is true (wall present) or false (open passage)

export function generateMaze(cols = 15, rows = 11) {
  const cells = [];
  for (let y = 0; y < rows; y++) {
    cells[y] = [];
    for (let x = 0; x < cols; x++) {
      cells[y][x] = { x, y, walls: { N: true, S: true, E: true, W: true }, visited: false };
    }
  }

  function getNeighbors(x, y) {
    const neighbors = [];
    if (y > 0 && !cells[y-1][x].visited) neighbors.push({ x, y: y-1, dir: 'N' });
    if (y < rows-1 && !cells[y+1][x].visited) neighbors.push({ x, y: y+1, dir: 'S' });
    if (x < cols-1 && !cells[y][x+1].visited) neighbors.push({ x: x+1, y, dir: 'E' });
    if (x > 0 && !cells[y][x-1].visited) neighbors.push({ x: x-1, y, dir: 'W' });
    return neighbors;
  }

  const opposite = { N: 'S', S: 'N', E: 'W', W: 'E' };

  function carve(x, y) {
    cells[y][x].visited = true;
    const neighbors = getNeighbors(x, y);
    // shuffle
    for (let i = neighbors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
    }
    for (const n of neighbors) {
      if (!cells[n.y][n.x].visited) {
        cells[y][x].walls[n.dir] = false;
        cells[n.y][n.x].walls[opposite[n.dir]] = false;
        carve(n.x, n.y);
      }
    }
  }

  carve(0, 0);

  // Clean up visited flag
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      delete cells[y][x].visited;

  return { cells, cols, rows };
}
