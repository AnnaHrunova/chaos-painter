export type FractalPresetId = 'tree' | 'koch' | 'sierpinski';

export interface FractalSettings {
  preset: FractalPresetId;
  depth: number;
  branchAngleDeg: number;
  shrink: number;
  rotationDeg: number;
  lineWidth: number;
  hueShift: number;
  animate: boolean;
  glow: boolean;
}

interface Point2D {
  x: number;
  y: number;
}

interface DrawFractalSceneOptions {
  canvas: HTMLCanvasElement;
  settings: FractalSettings;
  phase: number;
}

export function drawFractalScene({
  canvas,
  settings,
  phase,
}: DrawFractalSceneOptions): void {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return;
  }

  drawBackground(ctx, width, height);

  if (settings.preset === 'tree') {
    drawTree(ctx, width, height, settings, phase);
  } else if (settings.preset === 'koch') {
    drawKochSnowflake(ctx, width, height, settings, phase);
  } else {
    drawSierpinski(ctx, width, height, settings, phase);
  }

  drawOverlay(ctx, width, height, settings);
}

export function estimateFractalElements(
  preset: FractalPresetId,
  depth: number,
): number {
  if (preset === 'tree') {
    return Math.pow(2, depth) - 1;
  }

  if (preset === 'koch') {
    return 3 * Math.pow(4, depth);
  }

  return Math.pow(3, depth);
}

export function presetDescription(preset: FractalPresetId): string {
  if (preset === 'tree') {
    return 'Рекурсивное ветвление: хороший полигон для угла, затухания и анимации.';
  }

  if (preset === 'koch') {
    return 'Ломаная Коха: удобно тестировать геометрию, толщину линий и цветовые градиенты.';
  }

  return 'Треугольник Серпинского: чистая самоподобная структура для проверки глубины и композиции.';
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: FractalSettings,
  phase: number,
): void {
  const baseLength = Math.min(width, height) * 0.16;
  const branchAngle =
    degreesToRadians(settings.branchAngleDeg) *
    (1 + (settings.animate ? Math.sin(phase * 1.25) * 0.12 : 0));
  const trunkAngle = -Math.PI / 2 + degreesToRadians(settings.rotationDeg);
  const sway = settings.animate ? Math.sin(phase * 0.9) * 0.08 : 0;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  drawBranch(
    ctx,
    width * 0.5,
    height * 0.88,
    baseLength,
    trunkAngle,
    settings.depth,
    settings.depth,
    branchAngle,
    sway,
    settings,
    phase,
  );

  ctx.restore();
}

function drawBranch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  angle: number,
  depth: number,
  maxDepth: number,
  branchAngle: number,
  sway: number,
  settings: FractalSettings,
  phase: number,
): void {
  if (depth <= 0 || length < 2) {
    return;
  }

  const progress = 1 - depth / Math.max(1, maxDepth);
  const endX = x + Math.cos(angle) * length;
  const endY = y + Math.sin(angle) * length;
  const hue = settings.hueShift + 34 + progress * 150 + phase * 14;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = hsla(hue, 88, 66 - progress * 12, 0.92);
  ctx.lineWidth = Math.max(1, settings.lineWidth * (0.6 + depth / maxDepth));
  ctx.shadowBlur = settings.glow ? 16 : 0;
  ctx.shadowColor = hsla(hue + 18, 92, 62, 0.48);
  ctx.stroke();

  const nextLength = length * settings.shrink;
  const ripple = settings.animate ? Math.sin(phase * 1.7 + depth) * 0.04 : 0;

  drawBranch(
    ctx,
    endX,
    endY,
    nextLength,
    angle - branchAngle + sway + ripple,
    depth - 1,
    maxDepth,
    branchAngle,
    sway,
    settings,
    phase,
  );
  drawBranch(
    ctx,
    endX,
    endY,
    nextLength,
    angle + branchAngle + sway - ripple,
    depth - 1,
    maxDepth,
    branchAngle,
    sway,
    settings,
    phase,
  );
}

function drawKochSnowflake(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: FractalSettings,
  phase: number,
): void {
  const radius = Math.min(width, height) * 0.24;
  const centerX = width * 0.5;
  const centerY = height * 0.54;
  const rotation =
    degreesToRadians(settings.rotationDeg) +
    (settings.animate ? Math.sin(phase * 0.7) * 0.08 : 0);
  const vertices = buildRegularTriangle(centerX, centerY, radius, rotation);
  const points = [vertices[0]];

  appendKochSegment(vertices[0], vertices[1], settings.depth, points);
  appendKochSegment(vertices[1], vertices[2], settings.depth, points);
  appendKochSegment(vertices[2], vertices[0], settings.depth, points);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const progress = index / Math.max(1, points.length - 1);
    const hue = settings.hueShift + 180 + progress * 140 + phase * 10;
    ctx.beginPath();
    ctx.moveTo(previous.x, previous.y);
    ctx.lineTo(current.x, current.y);
    ctx.strokeStyle = hsla(hue, 86, 66, 0.94);
    ctx.lineWidth = settings.lineWidth;
    ctx.shadowBlur = settings.glow ? 14 : 0;
    ctx.shadowColor = hsla(hue, 92, 60, 0.5);
    ctx.stroke();
  }

  ctx.restore();
}

function appendKochSegment(
  start: Point2D,
  end: Point2D,
  depth: number,
  points: Point2D[],
): void {
  if (depth === 0) {
    points.push(end);
    return;
  }

  const dx = (end.x - start.x) / 3;
  const dy = (end.y - start.y) / 3;
  const p1 = { x: start.x + dx, y: start.y + dy };
  const p3 = { x: start.x + dx * 2, y: start.y + dy * 2 };
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) - Math.PI / 3;
  const p2 = {
    x: p1.x + Math.cos(angle) * length,
    y: p1.y + Math.sin(angle) * length,
  };

  appendKochSegment(start, p1, depth - 1, points);
  appendKochSegment(p1, p2, depth - 1, points);
  appendKochSegment(p2, p3, depth - 1, points);
  appendKochSegment(p3, end, depth - 1, points);
}

function drawSierpinski(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: FractalSettings,
  phase: number,
): void {
  const radius = Math.min(width, height) * 0.26;
  const centerX = width * 0.5;
  const centerY = height * 0.55;
  const rotation =
    degreesToRadians(settings.rotationDeg) +
    (settings.animate ? Math.sin(phase * 0.55) * 0.06 : 0);
  const vertices = buildRegularTriangle(centerX, centerY, radius, rotation);

  ctx.save();
  ctx.lineJoin = 'round';
  drawSierpinskiTriangle(ctx, vertices[0], vertices[1], vertices[2], settings.depth, settings, phase);
  ctx.restore();
}

function drawSierpinskiTriangle(
  ctx: CanvasRenderingContext2D,
  a: Point2D,
  b: Point2D,
  c: Point2D,
  depth: number,
  settings: FractalSettings,
  phase: number,
): void {
  if (depth === 0) {
    const centroid = {
      x: (a.x + b.x + c.x) / 3,
      y: (a.y + b.y + c.y) / 3,
    };
    const hue = settings.hueShift + centroid.y * 0.08 + phase * 9;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.closePath();
    ctx.fillStyle = hsla(hue, 90, 64, 0.8);
    ctx.strokeStyle = hsla(hue + 24, 94, 74, 0.52);
    ctx.lineWidth = Math.max(0.8, settings.lineWidth * 0.4);
    ctx.shadowBlur = settings.glow ? 10 : 0;
    ctx.shadowColor = hsla(hue, 90, 62, 0.34);
    ctx.fill();
    ctx.stroke();
    return;
  }

  const ab = midpoint(a, b);
  const bc = midpoint(b, c);
  const ca = midpoint(c, a);

  drawSierpinskiTriangle(ctx, a, ab, ca, depth - 1, settings, phase);
  drawSierpinskiTriangle(ctx, ab, b, bc, depth - 1, settings, phase);
  drawSierpinskiTriangle(ctx, ca, bc, c, depth - 1, settings, phase);
}

function buildRegularTriangle(
  centerX: number,
  centerY: number,
  radius: number,
  rotation: number,
): [Point2D, Point2D, Point2D] {
  return [0, 1, 2].map((index) => {
    const angle = rotation - Math.PI / 2 + (index * Math.PI * 2) / 3;
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  }) as [Point2D, Point2D, Point2D];
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
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
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: FractalSettings,
): void {
  const lines = [
    presetLabel(settings.preset),
    `depth = ${settings.depth} · scale = ${settings.shrink.toFixed(2)}`,
    `angle = ${settings.branchAngleDeg.toFixed(1)}° · rotation = ${settings.rotationDeg.toFixed(1)}°`,
  ];

  ctx.save();
  ctx.fillStyle = 'rgba(6, 11, 18, 0.72)';
  ctx.fillRect(20, 20, 296, 94);
  ctx.strokeStyle = 'rgba(170, 199, 221, 0.16)';
  ctx.strokeRect(20, 20, 296, 94);

  ctx.fillStyle = '#e5edf5';
  ctx.font = '600 15px "Space Grotesk", sans-serif';
  ctx.fillText(lines[0], 34, 46);
  ctx.font = '500 12px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#9bb8cd';
  ctx.fillText(lines[1], 34, 69);
  ctx.fillText(lines[2], 34, 90);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.fillRect(width - 164, height - 48, 132, 2);
  ctx.fillStyle = '#ff7a45';
  ctx.fillRect(width - 164, height - 48, Math.min(132, settings.depth * 16), 2);
  ctx.restore();
}

function presetLabel(preset: FractalPresetId): string {
  if (preset === 'tree') {
    return 'Fractal Tree';
  }

  if (preset === 'koch') {
    return 'Koch Snowflake';
  }

  return 'Sierpinski Triangle';
}

function midpoint(a: Point2D, b: Point2D): Point2D {
  return {
    x: (a.x + b.x) * 0.5,
    y: (a.y + b.y) * 0.5,
  };
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function hsla(hue: number, saturation: number, lightness: number, alpha: number): string {
  return `hsla(${hue.toFixed(0)} ${saturation.toFixed(0)}% ${lightness.toFixed(0)}% / ${alpha.toFixed(2)})`;
}
