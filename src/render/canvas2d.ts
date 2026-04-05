import type { ColorMode, RenderMode, VisualMode } from '../app/model';
import { colorForSample, computeTrajectoryExtrema } from '../lib/color';
import { clamp, lerp } from '../lib/format';
import type { MetricPoint, TrajectorySample, TrajectorySeries } from '../physics/types';

export interface DrawCanvasSceneOptions {
  canvas: HTMLCanvasElement;
  trajectory: TrajectorySeries;
  frameIndex: number;
  trailWindow: number;
  keepFullPath: boolean;
  lineWidth: number;
  colorMode: ColorMode;
  visualMode: VisualMode;
  renderMode: RenderMode;
  referenceTrajectory?: TrajectorySeries | null;
  label?: string;
  subtitle?: string;
  showPendulum?: boolean;
}

export function drawCanvasScene({
  canvas,
  trajectory,
  frameIndex,
  trailWindow,
  keepFullPath,
  lineWidth,
  colorMode,
  visualMode,
  renderMode,
  referenceTrajectory = null,
  label,
  subtitle,
  showPendulum = visualMode === 'pendulum2d',
}: DrawCanvasSceneOptions): void {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
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
  const artViewport = visualMode === 'chaosArt';
  const visibleStartIndex =
    artViewport || keepFullPath ? 0 : Math.max(0, lastIndex - trailWindow);
  const visibleStride = computeSampleStride(lastIndex - visibleStartIndex + 1, width, 1.35);
  const historyStride = computeSampleStride(lastIndex + 1, width, 1.8);
  const densityStride = computeSampleStride(lastIndex + 1, 18000, 1);
  const visibleSamples = collectSamples(samples, visibleStartIndex, lastIndex, visibleStride);
  const historySamples = collectSamples(samples, 0, lastIndex, historyStride);
  const extrema = computeTrajectoryExtrema(visibleSamples);
  const worldProjection = buildWorldProjection(trajectory, width, height, artViewport);
  const effectiveLabel = label ?? `${trajectory.methodLabel} · ${renderModeLabel(renderMode)}`;

  drawBackground(ctx, width, height, artViewport || renderMode === 'neon');

  if (renderMode === 'scientific' || renderMode === 'neon') {
    drawGrid(ctx, width, height, artViewport || renderMode === 'neon');
    drawWorldTrajectory(
      ctx,
      visibleSamples,
      visibleStartIndex,
      visibleStride,
      samples.length,
      worldProjection,
      lineWidth,
      colorMode,
      renderMode,
      extrema,
    );

    if (showPendulum || visualMode === 'pendulum2d') {
      drawPendulum(
        ctx,
        samples[lastIndex],
        worldProjection,
        renderMode === 'neon' || artViewport,
      );
    }
  } else if (renderMode === 'density') {
    drawGrid(ctx, width, height, false);
    drawDensityMap(
      ctx,
      samples,
      0,
      lastIndex,
      densityStride,
      worldProjection,
      colorMode,
      width,
      height,
    );
  } else if (renderMode === 'phasePortrait') {
    drawPhasePortrait(ctx, historySamples, lineWidth, colorMode, width, height);
  } else if (renderMode === 'methodDelta') {
    drawMetricPlot(
      ctx,
      buildMethodDeltaSeries(
        trajectory,
        referenceTrajectory,
        lastIndex,
        computeSampleStride(lastIndex + 1, width, 1.25),
      ),
      width,
      height,
      lineWidth,
      '#ff8b5a',
      'расстояние до референса',
    );
  } else if (renderMode === 'energyDrift') {
    drawMetricPlot(
      ctx,
      historySamples.map((sample) => ({
        time: sample.time,
        value: sample.energyDriftRatio,
      })),
      width,
      height,
      lineWidth,
      '#a6ff9e',
      'относительный дрейф энергии',
    );
  }

  drawOverlay(
    ctx,
    width,
    height,
    trajectory,
    lastIndex,
    effectiveLabel,
    subtitle ?? overlaySubtitle(renderMode, samples[lastIndex]),
  );
}

const maxRadiusCache = new WeakMap<TrajectorySeries, number>();

function buildWorldProjection(
  trajectory: TrajectorySeries,
  width: number,
  height: number,
  artViewport: boolean,
) {
  const maxRadius = getTrajectoryMaxRadius(trajectory);

  return {
    scale: (Math.min(width, height) * (artViewport ? 0.34 : 0.26)) / maxRadius,
    centerX: width * 0.5,
    centerY: artViewport ? height * 0.54 : height * 0.22,
  };
}

function drawWorldTrajectory(
  ctx: CanvasRenderingContext2D,
  visibleSamples: TrajectorySample[],
  startIndex: number,
  stride: number,
  totalLength: number,
  projection: { scale: number; centerX: number; centerY: number },
  lineWidth: number,
  colorMode: ColorMode,
  renderMode: RenderMode,
  extrema: ReturnType<typeof computeTrajectoryExtrema>,
): void {
  const neonMode = renderMode === 'neon';

  ctx.save();
  ctx.translate(projection.centerX, projection.centerY);
  if (neonMode) {
    ctx.globalCompositeOperation = 'screen';
  }

  for (let index = 1; index < visibleSamples.length; index += 1) {
    const previous = visibleSamples[index - 1];
    const current = visibleSamples[index];
    const absoluteIndex = startIndex + index * stride;
    const stroke = colorForSample(
      current,
      absoluteIndex,
      totalLength,
      colorMode,
      extrema,
    );
    const alpha = neonMode
      ? lerp(0.14, 0.66, index / Math.max(1, visibleSamples.length - 1))
      : 0.82;

    ctx.beginPath();
    ctx.moveTo(previous.p4.x * projection.scale, previous.p4.y * projection.scale);
    ctx.lineTo(current.p4.x * projection.scale, current.p4.y * projection.scale);
    ctx.strokeStyle = stroke;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = lineWidth * (neonMode ? 1.65 : 1);
    ctx.lineCap = 'round';
    ctx.shadowBlur = neonMode ? 22 : 0;
    ctx.shadowColor = stroke;
    ctx.stroke();
  }

  ctx.restore();
}

function drawDensityMap(
  ctx: CanvasRenderingContext2D,
  samples: TrajectorySample[],
  startIndex: number,
  endIndex: number,
  stride: number,
  projection: { scale: number; centerX: number; centerY: number },
  colorMode: ColorMode,
  width: number,
  height: number,
): void {
  const columns = 136;
  const rows = 136;
  const counts = new Float32Array(columns * rows);
  const progress = new Float32Array(columns * rows);
  let maxCount = 1;

  for (let index = startIndex; index <= endIndex; index += stride) {
    const sample = samples[index];
    const x = projection.centerX + sample.p4.x * projection.scale;
    const y = projection.centerY + sample.p4.y * projection.scale;
    const column = Math.floor((x / width) * columns);
    const row = Math.floor((y / height) * rows);

    if (column < 0 || column >= columns || row < 0 || row >= rows) {
      continue;
    }

    const pointer = row * columns + column;
    counts[pointer] += 1;
    progress[pointer] += index / Math.max(1, endIndex);
    maxCount = Math.max(maxCount, counts[pointer]);
  }

  const cellWidth = width / columns;
  const cellHeight = height / rows;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const pointer = row * columns + column;
      const count = counts[pointer];

      if (count <= 0) {
        continue;
      }

      const intensity = Math.sqrt(count / maxCount);
      const averageProgress = progress[pointer] / count;
      ctx.globalAlpha = lerp(0.08, 0.9, intensity);
      ctx.fillStyle = densityColor(averageProgress, intensity, colorMode);
      ctx.fillRect(column * cellWidth, row * cellHeight, cellWidth + 1, cellHeight + 1);
    }
  }

  ctx.globalAlpha = 1;
}

function drawPhasePortrait(
  ctx: CanvasRenderingContext2D,
  samples: TrajectorySample[],
  lineWidth: number,
  colorMode: ColorMode,
  width: number,
  height: number,
): void {
  const padding = 60;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const extrema = computeTrajectoryExtrema(samples);

  const xValues = samples.map((sample) => sample.state.theta4);
  const yValues = samples.map((sample) => sample.state.omega4);
  const xBounds = paddedBounds(xValues);
  const yBounds = paddedBounds(yValues);

  drawPlotFrame(ctx, width, height, padding);
  drawAxisLabels(ctx, width, height, padding, 'theta4', 'omega4');

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    const x1 = padding + normalize(previous.state.theta4, xBounds.min, xBounds.max) * plotWidth;
    const y1 = height - padding - normalize(previous.state.omega4, yBounds.min, yBounds.max) * plotHeight;
    const x2 = padding + normalize(current.state.theta4, xBounds.min, xBounds.max) * plotWidth;
    const y2 = height - padding - normalize(current.state.omega4, yBounds.min, yBounds.max) * plotHeight;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = colorForSample(current, index, samples.length, colorMode, extrema);
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = 0.82;
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

function drawMetricPlot(
  ctx: CanvasRenderingContext2D,
  points: MetricPoint[],
  width: number,
  height: number,
  lineWidth: number,
  stroke: string,
  axisLabel: string,
): void {
  const padding = 60;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  drawPlotFrame(ctx, width, height, padding);
  drawAxisLabels(ctx, width, height, padding, 'время', axisLabel);

  if (points.length === 0) {
    return;
  }

  const timeBounds = paddedBounds(points.map((point) => point.time));
  const valueBounds = paddedBounds(points.map((point) => point.value), true);

  const zeroY =
    height -
    padding -
    normalize(0, valueBounds.min, valueBounds.max) * plotHeight;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.moveTo(padding, zeroY);
  ctx.lineTo(width - padding, zeroY);
  ctx.stroke();

  ctx.beginPath();
  points.forEach((point, index) => {
    const x = padding + normalize(point.time, timeBounds.min, timeBounds.max) * plotWidth;
    const y =
      height -
      padding -
      normalize(point.value, valueBounds.min, valueBounds.max) * plotHeight;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth * 1.15;
  ctx.shadowBlur = 14;
  ctx.shadowColor = stroke;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function buildMethodDeltaSeries(
  trajectory: TrajectorySeries,
  referenceTrajectory: TrajectorySeries | null,
  endIndex: number,
  stride: number,
): MetricPoint[] {
  if (!referenceTrajectory) {
    return collectSamples(trajectory.samples, 0, endIndex, stride).map((sample) => ({
      time: sample.time,
      value: 0,
    }));
  }

  const length = Math.min(endIndex + 1, trajectory.samples.length, referenceTrajectory.samples.length);
  const points: MetricPoint[] = [];

  for (let index = 0; index < length; index += stride) {
    const current = trajectory.samples[index];
    const reference = referenceTrajectory.samples[index];
    const dx = current.p4.x - reference.p4.x;
    const dy = current.p4.y - reference.p4.y;
    points.push({
      time: current.time,
      value: Math.sqrt(dx * dx + dy * dy),
    });
  }

  return points;
}

function drawPlotFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  padding: number,
): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(141, 174, 202, 0.1)';
  ctx.lineWidth = 1;

  for (let step = 0; step <= 4; step += 1) {
    const x = padding + ((width - padding * 2) * step) / 4;
    const y = padding + ((height - padding * 2) * step) / 4;

    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, height - padding);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawAxisLabels(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  padding: number,
  xLabel: string,
  yLabel: string,
): void {
  ctx.save();
  ctx.fillStyle = '#9bb8cd';
  ctx.font = '500 12px "IBM Plex Mono", monospace';
  ctx.fillText(xLabel, width - padding - 54, height - padding + 28);

  ctx.translate(padding - 34, padding + 56);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();
}

function drawPendulum(
  ctx: CanvasRenderingContext2D,
  sample: TrajectorySample,
  projection: { scale: number; centerX: number; centerY: number },
  glowMode: boolean,
): void {
  ctx.save();
  ctx.translate(projection.centerX, projection.centerY);
  ctx.lineWidth = glowMode ? 2.4 : 2;
  ctx.strokeStyle = 'rgba(227, 235, 242, 0.82)';

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(sample.p1.x * projection.scale, sample.p1.y * projection.scale);
  ctx.lineTo(sample.p2.x * projection.scale, sample.p2.y * projection.scale);
  ctx.lineTo(sample.p3.x * projection.scale, sample.p3.y * projection.scale);
  ctx.lineTo(sample.p4.x * projection.scale, sample.p4.y * projection.scale);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(sample.p1.x * projection.scale, sample.p1.y * projection.scale, 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(234, 164, 94, 0.95)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(sample.p2.x * projection.scale, sample.p2.y * projection.scale, 10, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(142, 222, 134, 0.92)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(sample.p3.x * projection.scale, sample.p3.y * projection.scale, 11, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(92, 242, 255, 0.95)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(sample.p4.x * projection.scale, sample.p4.y * projection.scale, 12, 0, Math.PI * 2);
  ctx.fillStyle = glowMode ? 'rgba(255, 118, 76, 0.95)' : 'rgba(92, 242, 255, 0.95)';
  ctx.fill();
  ctx.restore();
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  luminous: boolean,
): void {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, luminous ? '#070711' : '#091320');
  gradient.addColorStop(0.45, luminous ? '#100a18' : '#0c1625');
  gradient.addColorStop(1, luminous ? '#170d13' : '#071018');
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
  radial.addColorStop(0, luminous ? 'rgba(255, 116, 76, 0.12)' : 'rgba(92, 242, 255, 0.1)');
  radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, width, height);
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  luminous: boolean,
): void {
  ctx.save();
  ctx.strokeStyle = luminous
    ? 'rgba(255, 255, 255, 0.035)'
    : 'rgba(141, 174, 202, 0.06)';
  ctx.lineWidth = 1;

  const gap = luminous ? 42 : 36;
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
  ctx.fillRect(20, 20, 248, 86);
  ctx.strokeStyle = 'rgba(170, 199, 221, 0.14)';
  ctx.strokeRect(20, 20, 248, 86);

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

function densityColor(
  progress: number,
  intensity: number,
  colorMode: ColorMode,
): string {
  if (colorMode === 'time') {
    return hsl(lerp(210, 18, progress), 88, lerp(40, 72, intensity));
  }

  if (colorMode === 'energyDrift') {
    return hsl(lerp(42, 8, intensity), 86, lerp(38, 70, intensity));
  }

  if (colorMode === 'angularVelocity') {
    return hsl(lerp(222, 286, intensity), 78, lerp(42, 68, intensity));
  }

  return hsl(lerp(170, 340, intensity), 88, lerp(38, 72, intensity));
}

function paddedBounds(values: number[], symmetric = false) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1e-6, max - min);

  if (symmetric) {
    const bound = Math.max(Math.abs(min), Math.abs(max), 1e-6) * 1.12;
    return { min: -bound, max: bound };
  }

  return {
    min: min - span * 0.08,
    max: max + span * 0.08,
  };
}

function getTrajectoryMaxRadius(trajectory: TrajectorySeries): number {
  const cached = maxRadiusCache.get(trajectory);

  if (cached) {
    return cached;
  }

  const maxRadius =
    trajectory.samples.reduce((largest, sample) => {
      const p1Radius = Math.hypot(sample.p1.x, sample.p1.y);
      const p2Radius = Math.hypot(sample.p2.x, sample.p2.y);
      const p3Radius = Math.hypot(sample.p3.x, sample.p3.y);
      const p4Radius = Math.hypot(sample.p4.x, sample.p4.y);
      return Math.max(largest, p1Radius, p2Radius, p3Radius, p4Radius);
    }, 0) || 2;

  maxRadiusCache.set(trajectory, maxRadius);
  return maxRadius;
}

function computeSampleStride(
  length: number,
  targetSamples: number,
  overscan = 1,
): number {
  return Math.max(1, Math.floor(length / Math.max(1, targetSamples * overscan)));
}

function collectSamples(
  samples: TrajectorySample[],
  startIndex: number,
  endIndex: number,
  stride: number,
): TrajectorySample[] {
  if (endIndex < startIndex) {
    return [];
  }

  const collected: TrajectorySample[] = [];
  for (let index = startIndex; index <= endIndex; index += stride) {
    collected.push(samples[index]);
  }

  if (collected[collected.length - 1] !== samples[endIndex]) {
    collected.push(samples[endIndex]);
  }

  return collected;
}

function normalize(value: number, min: number, max: number): number {
  return clamp((value - min) / Math.max(1e-6, max - min), 0, 1);
}

function overlaySubtitle(renderMode: RenderMode, sample: TrajectorySample): string {
  if (renderMode === 'phasePortrait') {
    return 'theta4 против omega4';
  }

  if (renderMode === 'methodDelta') {
    return 'расстояние до референса во времени';
  }

  if (renderMode === 'energyDrift') {
    return 'дрейф энергии во времени';
  }

  if (renderMode === 'density') {
    return 'время, проведённое в каждой области';
  }

  if (renderMode === 'neon') {
    return `t = ${sample.time.toFixed(2)} s · длинная экспозиция`;
  }

  return `t = ${sample.time.toFixed(2)} s`;
}

function renderModeLabel(renderMode: RenderMode): string {
  if (renderMode === 'scientific') return 'Научный след';
  if (renderMode === 'density') return 'Карта плотности';
  if (renderMode === 'phasePortrait') return 'Фазовый портрет';
  if (renderMode === 'methodDelta') return 'Расхождение метода';
  if (renderMode === 'energyDrift') return 'Дрейф энергии';
  return 'Неон';
}

function hsl(hue: number, saturation: number, lightness: number): string {
  return `hsl(${hue.toFixed(0)} ${saturation.toFixed(0)}% ${lightness.toFixed(0)}%)`;
}
