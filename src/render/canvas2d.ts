import type { ColorMode, VisualMode } from '../app/model';
import { colorForSample, computeTrajectoryExtrema } from '../lib/color';
import { clamp } from '../lib/format';
import type { TrajectorySeries } from '../physics/types';

export interface DrawCanvasSceneOptions {
  canvas: HTMLCanvasElement;
  trajectory: TrajectorySeries;
  frameIndex: number;
  trailWindow: number;
  lineWidth: number;
  colorMode: ColorMode;
  visualMode: VisualMode;
  label?: string;
  subtitle?: string;
  showPendulum?: boolean;
}

export function drawCanvasScene({
  canvas,
  trajectory,
  frameIndex,
  trailWindow,
  lineWidth,
  colorMode,
  visualMode,
  label,
  subtitle,
  showPendulum = visualMode === 'pendulum2d',
}: DrawCanvasSceneOptions): void {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
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

  const samples = trajectory.samples;
  const lastIndex = clamp(frameIndex, 0, samples.length - 1);
  const artMode = visualMode === 'chaosArt';
  const visibleStart = artMode
    ? 1
    : Math.max(1, lastIndex - trailWindow + 1);
  const visibleSamples = samples.slice(visibleStart - 1, lastIndex + 1);
  const extrema = computeTrajectoryExtrema(visibleSamples);
  const totalLength = samples.length;
  const maxRadius =
    samples.reduce((largest, sample) => {
      const p1Radius = Math.hypot(sample.p1.x, sample.p1.y);
      const p2Radius = Math.hypot(sample.p2.x, sample.p2.y);
      return Math.max(largest, p1Radius, p2Radius);
    }, 0) || 2;
  const scale =
    (Math.min(width, height) * (artMode ? 0.34 : 0.26)) / maxRadius;
  const centerX = width * 0.5;
  const centerY = artMode ? height * 0.54 : height * 0.22;

  drawBackground(ctx, width, height, artMode);
  drawGrid(ctx, width, height, artMode);

  ctx.save();
  ctx.translate(centerX, centerY);

  if (artMode) {
    ctx.globalCompositeOperation = 'screen';
  }

  for (let index = visibleStart; index <= lastIndex; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    const alpha = artMode
      ? 0.1 + 0.5 * (index / Math.max(1, lastIndex))
      : 0.78;

    ctx.beginPath();
    ctx.moveTo(previous.p2.x * scale, previous.p2.y * scale);
    ctx.lineTo(current.p2.x * scale, current.p2.y * scale);
    ctx.strokeStyle = colorForSample(current, index, totalLength, colorMode, extrema);
    ctx.globalAlpha = alpha;
    ctx.lineWidth = lineWidth * dpr * (artMode ? 1.25 : 1);
    ctx.lineCap = 'round';
    ctx.shadowBlur = artMode ? 18 * dpr : 0;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  if (showPendulum || visualMode === 'pendulum2d') {
    const current = samples[lastIndex];
    drawPendulum(ctx, current, scale, artMode);
  }

  ctx.restore();

  drawOverlay(ctx, width, height, trajectory, lastIndex, label, subtitle);
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  artMode: boolean,
): void {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, artMode ? '#09070f' : '#091320');
  gradient.addColorStop(0.45, artMode ? '#0f0b1a' : '#0c1625');
  gradient.addColorStop(1, artMode ? '#1a0f16' : '#071018');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const radial = ctx.createRadialGradient(
    width * 0.72,
    height * 0.24,
    0,
    width * 0.72,
    height * 0.24,
    Math.max(width, height) * 0.65,
  );
  radial.addColorStop(0, artMode ? 'rgba(255, 116, 76, 0.12)' : 'rgba(92, 242, 255, 0.1)');
  radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, width, height);
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  artMode: boolean,
): void {
  ctx.save();
  ctx.strokeStyle = artMode ? 'rgba(255, 255, 255, 0.035)' : 'rgba(141, 174, 202, 0.06)';
  ctx.lineWidth = 1;

  const gap = artMode ? 42 : 36;
  for (let x = 0; x < width; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y < height; y += gap) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPendulum(
  ctx: CanvasRenderingContext2D,
  sample: TrajectorySeries['samples'][number],
  scale: number,
  artMode: boolean,
): void {
  ctx.save();
  ctx.lineWidth = artMode ? 2.4 : 2;
  ctx.strokeStyle = 'rgba(227, 235, 242, 0.82)';
  ctx.fillStyle = artMode ? '#ff925b' : '#5cf2ff';

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(sample.p1.x * scale, sample.p1.y * scale);
  ctx.lineTo(sample.p2.x * scale, sample.p2.y * scale);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(sample.p1.x * scale, sample.p1.y * scale, 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(234, 164, 94, 0.95)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(sample.p2.x * scale, sample.p2.y * scale, 10, 0, Math.PI * 2);
  ctx.fillStyle = artMode ? 'rgba(255, 118, 76, 0.95)' : 'rgba(92, 242, 255, 0.95)';
  ctx.fill();
  ctx.restore();
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  trajectory: TrajectorySeries,
  frameIndex: number,
  label?: string,
  subtitle?: string,
): void {
  const sample = trajectory.samples[frameIndex];
  const title = label ?? trajectory.methodLabel;
  const lines = [
    title,
    subtitle ?? `t = ${sample.time.toFixed(2)} s`,
    `E drift = ${sample.energyDriftRatio >= 0 ? '+' : ''}${(
      sample.energyDriftRatio * 100
    ).toFixed(2)}%`,
  ];

  ctx.save();
  ctx.fillStyle = 'rgba(5, 10, 16, 0.66)';
  ctx.fillRect(20, 20, 208, 86);
  ctx.strokeStyle = 'rgba(170, 199, 221, 0.14)';
  ctx.strokeRect(20, 20, 208, 86);

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
  ctx.fillRect(
    width - 164,
    height - 48,
    132 * (frameIndex / Math.max(1, trajectory.samples.length - 1)),
    2,
  );
  ctx.restore();
}
