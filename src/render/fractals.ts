import type { FractalScene, FractalStyleSettings } from '../fractals/types';

const SEGMENT_STRIDE = 6;
const TRIANGLE_STRIDE = 7;
const BAND_COUNT = 6;

export interface FractalCanvasInfo {
  width: number;
  height: number;
}

type FractalCanvasSurface = HTMLCanvasElement | OffscreenCanvas;
type FractalRenderingContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

let cachedBackground:
  | {
      key: string;
      canvas: OffscreenCanvas;
    }
  | null = null;

export function measureFractalCanvas(
  canvas: HTMLCanvasElement,
  maxDpr = 1.25,
): FractalCanvasInfo {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

  return {
    width: Math.max(1, Math.floor(rect.width * dpr)),
    height: Math.max(1, Math.floor(rect.height * dpr)),
  };
}

export function prepareBitmapCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): void {
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

export function drawFractalScene(
  canvas: FractalCanvasSurface,
  scene: FractalScene,
  style: FractalStyleSettings,
): void {
  if (canvas.width !== scene.width || canvas.height !== scene.height) {
    canvas.width = scene.width;
    canvas.height = scene.height;
  }

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return;
  }

  drawBackground(ctx, scene.width, scene.height, scene.quality);

  if (scene.renderMode === 'segments') {
    drawSegments(ctx, scene, style);
  } else {
    drawTriangles(ctx, scene, style);
  }

  drawOverlay(ctx, scene);
}

export function presentFractalBitmap(
  canvas: HTMLCanvasElement,
  bitmap: ImageBitmap,
): void {
  prepareBitmapCanvas(canvas, bitmap.width, bitmap.height);

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
  style: FractalStyleSettings,
): void {
  const paths = createPathBands();
  const data = scene.segmentData;

  for (let index = 0; index < data.length; index += SEGMENT_STRIDE) {
    const progress = data[index + 4];
    const band = selectBand(progress);
    const path = paths[band];

    path.moveTo(data[index], data[index + 1]);
    path.lineTo(data[index + 2], data[index + 3]);
  }

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let band = 0; band < BAND_COUNT; band += 1) {
    const progress = (band + 0.5) / BAND_COUNT;
    const hueBase = scene.preset === 'tree' ? 34 : 180;
    const hue = style.hueShift + hueBase + progress * 150;
    const weight = 1 - progress;

    ctx.strokeStyle = hsla(
      hue,
      88,
      scene.preset === 'tree' ? 66 - progress * 12 : 66,
      0.94,
    );
    ctx.lineWidth = Math.max(0.7, style.lineWidth * (0.58 + weight * 0.82));
    ctx.shadowBlur = style.glow && scene.quality === 'full' ? (scene.preset === 'tree' ? 14 : 10) : 0;
    ctx.shadowColor = hsla(hue + 18, 92, 62, 0.44);
    ctx.stroke(paths[band]);
  }

  ctx.restore();
}

function drawTriangles(
  ctx: FractalRenderingContext,
  scene: FractalScene,
  style: FractalStyleSettings,
): void {
  const fillPaths = createPathBands();
  const strokePaths = createPathBands();
  const data = scene.triangleData;

  for (let index = 0; index < data.length; index += TRIANGLE_STRIDE) {
    const progress = data[index + 6];
    const band = selectBand(progress);
    const fillPath = fillPaths[band];
    const strokePath = strokePaths[band];

    fillPath.moveTo(data[index], data[index + 1]);
    fillPath.lineTo(data[index + 2], data[index + 3]);
    fillPath.lineTo(data[index + 4], data[index + 5]);
    fillPath.closePath();

    strokePath.moveTo(data[index], data[index + 1]);
    strokePath.lineTo(data[index + 2], data[index + 3]);
    strokePath.lineTo(data[index + 4], data[index + 5]);
    strokePath.closePath();
  }

  ctx.save();
  ctx.lineJoin = 'round';

  for (let band = 0; band < BAND_COUNT; band += 1) {
    const progress = (band + 0.5) / BAND_COUNT;
    const hue = style.hueShift + 220 + progress * 120;

    ctx.fillStyle = hsla(hue, 90, 64, scene.quality === 'preview' ? 0.72 : 0.8);
    ctx.strokeStyle = hsla(hue + 24, 94, 74, 0.5);
    ctx.lineWidth = Math.max(0.5, style.lineWidth * 0.32);
    ctx.shadowBlur = style.glow && scene.quality === 'full' ? 7 : 0;
    ctx.shadowColor = hsla(hue, 90, 62, 0.28);
    ctx.fill(fillPaths[band]);
    ctx.stroke(strokePaths[band]);
  }

  ctx.restore();
}

function drawBackground(
  ctx: FractalRenderingContext,
  width: number,
  height: number,
  quality: FractalScene['quality'],
): void {
  const cache = getBackgroundCache(width, height, quality);

  if (cache) {
    ctx.drawImage(cache, 0, 0);
    return;
  }

  paintBackground(ctx, width, height, quality);
}

function getBackgroundCache(
  width: number,
  height: number,
  quality: FractalScene['quality'],
): OffscreenCanvas | null {
  if (typeof OffscreenCanvas === 'undefined') {
    return null;
  }

  const key = `${width}x${height}:${quality}`;

  if (cachedBackground?.key === key) {
    return cachedBackground.canvas;
  }

  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  paintBackground(context, width, height, quality);
  cachedBackground = { key, canvas };
  return canvas;
}

function paintBackground(
  ctx: FractalRenderingContext,
  width: number,
  height: number,
  quality: FractalScene['quality'],
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

  if (quality === 'preview') {
    return;
  }

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
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
): void {
  const lines = [
    presetLabel(scene.preset),
    `${scene.quality} · rendered = ${formatCompact(scene.renderedElements)}`,
    `detail = ${(scene.detailRatio * 100).toFixed(2)}% of theoretical`,
  ];

  ctx.save();
  ctx.fillStyle = 'rgba(6, 11, 18, 0.68)';
  ctx.fillRect(20, 20, 312, 94);
  ctx.strokeStyle = 'rgba(170, 199, 221, 0.14)';
  ctx.strokeRect(20, 20, 312, 94);

  ctx.fillStyle = '#e5edf5';
  ctx.font = '600 15px "Space Grotesk", sans-serif';
  ctx.fillText(lines[0], 34, 46);
  ctx.font = '500 12px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#9bb8cd';
  ctx.fillText(lines[1], 34, 69);
  ctx.fillText(lines[2], 34, 90);

  if (scene.cappedByBudget) {
    ctx.fillStyle = '#ff9b70';
    ctx.fillText('quality budget applied', 34, 111);
  }

  ctx.restore();
}

function createPathBands(): Path2D[] {
  return Array.from({ length: BAND_COUNT }, () => new Path2D());
}

function selectBand(progress: number): number {
  return Math.min(BAND_COUNT - 1, Math.max(0, Math.floor(progress * BAND_COUNT)));
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

function hsla(
  hue: number,
  saturation: number,
  lightness: number,
  alpha: number,
): string {
  return `hsla(${hue.toFixed(0)} ${saturation.toFixed(0)}% ${lightness.toFixed(0)}% / ${alpha.toFixed(2)})`;
}
