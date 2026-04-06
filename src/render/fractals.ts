import type { FractalScene, FractalSettings } from '../fractals/types';

export interface FractalCanvasInfo {
  width: number;
  height: number;
}

type FractalCanvasSurface = HTMLCanvasElement | OffscreenCanvas;
type FractalRenderingContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function prepareFractalCanvas(
  canvas: HTMLCanvasElement,
  maxDpr = 1.5,
): FractalCanvasInfo | null {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  return { width, height };
}

export function drawFractalScene(
  canvas: FractalCanvasSurface,
  scene: FractalScene,
  settings: FractalSettings,
): void {
  if (canvas.width !== scene.width || canvas.height !== scene.height) {
    canvas.width = scene.width;
    canvas.height = scene.height;
  }

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return;
  }

  drawBackground(ctx, scene.width, scene.height);

  if (scene.renderMode === 'segments') {
    drawSegments(ctx, scene, settings);
  } else {
    drawTriangles(ctx, scene, settings);
  }

  drawOverlay(ctx, scene, settings);
}

export function presentFractalBitmap(
  canvas: HTMLCanvasElement,
  bitmap: ImageBitmap,
): void {
  if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
  }

  const bitmapContext = canvas.getContext('bitmaprenderer');

  if (bitmapContext) {
    bitmapContext.transferFromImageBitmap(bitmap);
    return;
  }

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    bitmap.close();
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
}

function drawSegments(
  ctx: FractalRenderingContext,
  scene: FractalScene,
  settings: FractalSettings,
): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const segment of scene.segments) {
    const hueBase = scene.preset === 'tree' ? 34 : 180;
    const hue = settings.hueShift + hueBase + segment.progress * 150;
    ctx.beginPath();
    ctx.moveTo(segment.x1, segment.y1);
    ctx.lineTo(segment.x2, segment.y2);
    ctx.strokeStyle = hsla(hue, 88, scene.preset === 'tree' ? 66 - segment.progress * 12 : 66, 0.94);
    ctx.lineWidth = Math.max(0.7, settings.lineWidth * (0.5 + segment.weight));
    ctx.shadowBlur = settings.glow ? (scene.preset === 'tree' ? 16 : 12) : 0;
    ctx.shadowColor = hsla(hue + 18, 92, 62, 0.48);
    ctx.stroke();
  }

  ctx.restore();
}

function drawTriangles(
  ctx: FractalRenderingContext,
  scene: FractalScene,
  settings: FractalSettings,
): void {
  ctx.save();
  ctx.lineJoin = 'round';

  for (const triangle of scene.triangles) {
    const hue = settings.hueShift + 220 + triangle.progress * 120;
    ctx.beginPath();
    ctx.moveTo(triangle.ax, triangle.ay);
    ctx.lineTo(triangle.bx, triangle.by);
    ctx.lineTo(triangle.cx, triangle.cy);
    ctx.closePath();
    ctx.fillStyle = hsla(hue, 90, 64, 0.8);
    ctx.strokeStyle = hsla(hue + 24, 94, 74, 0.52);
    ctx.lineWidth = Math.max(0.6, settings.lineWidth * 0.34);
    ctx.shadowBlur = settings.glow ? 8 : 0;
    ctx.shadowColor = hsla(hue, 90, 62, 0.34);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawBackground(
  ctx: FractalRenderingContext,
  width: number,
  height: number,
): void {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#08111b');
  gradient.addColorStop(0.45, '#0c1726');
  gradient.addColorStop(1, '#090d17');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const glowA = ctx.createRadialGradient(
    width * 0.22,
    height * 0.18,
    0,
    width * 0.22,
    height * 0.18,
    Math.max(width, height) * 0.55,
  );
  glowA.addColorStop(0, 'rgba(255, 152, 82, 0.12)');
  glowA.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowA;
  ctx.fillRect(0, 0, width, height);

  const glowB = ctx.createRadialGradient(
    width * 0.78,
    height * 0.28,
    0,
    width * 0.78,
    height * 0.28,
    Math.max(width, height) * 0.6,
  );
  glowB.addColorStop(0, 'rgba(92, 242, 255, 0.11)');
  glowB.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 42) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawOverlay(
  ctx: FractalRenderingContext,
  scene: FractalScene,
  settings: FractalSettings,
): void {
  const lines = [
    presetLabel(scene.preset),
    `depth = ${settings.depth} · rendered = ${formatCompact(scene.renderedElements)}`,
    `detail = ${(scene.detailRatio * 100).toFixed(2)}% of theoretical`,
  ];

  ctx.save();
  ctx.fillStyle = 'rgba(6, 11, 18, 0.72)';
  ctx.fillRect(20, 20, 308, 94);
  ctx.strokeStyle = 'rgba(170, 199, 221, 0.16)';
  ctx.strokeRect(20, 20, 308, 94);

  ctx.fillStyle = '#e5edf5';
  ctx.font = '600 15px "Space Grotesk", sans-serif';
  ctx.fillText(lines[0], 34, 46);
  ctx.font = '500 12px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#9bb8cd';
  ctx.fillText(lines[1], 34, 69);
  ctx.fillText(lines[2], 34, 90);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.fillRect(scene.width - 164, scene.height - 48, 132, 2);
  ctx.fillStyle = '#ff7a45';
  ctx.fillRect(
    scene.width - 164,
    scene.height - 48,
    Math.min(132, Math.max(2, settings.depth * 9)),
    2,
  );
  ctx.restore();
}

function presetLabel(preset: FractalScene['preset']): string {
  if (preset === 'tree') return 'Fractal Tree';
  if (preset === 'koch') return 'Koch Snowflake';
  return 'Sierpinski Triangle';
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }

  return String(value);
}

function hsla(hue: number, saturation: number, lightness: number, alpha: number): string {
  return `hsla(${hue.toFixed(0)} ${saturation.toFixed(0)}% ${lightness.toFixed(0)}% / ${alpha.toFixed(2)})`;
}
