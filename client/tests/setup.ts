import '@testing-library/jest-dom';

// Mock canvas
HTMLCanvasElement.prototype.getContext = (() => ({
  fillRect: () => {},
  clearRect: () => {},
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  lineCap: '',
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  stroke: () => {},
  arc: () => {},
  fill: () => {},
  save: () => {},
  restore: () => {},
  translate: () => {},
  rotate: () => {},
  roundRect: () => {},
  shadowColor: '',
  shadowBlur: 0,
  font: '',
  textAlign: '',
  textBaseline: '',
  fillText: () => {},
})) as unknown as typeof HTMLCanvasElement.prototype.getContext;
