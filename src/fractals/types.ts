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

export type FractalQuality = 'preview' | 'full';

export interface FractalGeometrySettings {
  preset: FractalPresetId;
  depth: number;
  branchAngleDeg: number;
  shrink: number;
  rotationDeg: number;
}

export interface FractalStyleSettings {
  lineWidth: number;
  hueShift: number;
  glow: boolean;
}

export interface FractalScene {
  preset: FractalPresetId;
  width: number;
  height: number;
  quality: FractalQuality;
  renderMode: 'segments' | 'triangles';
  segmentData: Float32Array;
  triangleData: Float32Array;
  estimatedElements: number;
  renderedElements: number;
  detailRatio: number;
  cappedByBudget: boolean;
}

export interface FractalFrameStats {
  preset: FractalPresetId;
  width: number;
  height: number;
  quality: FractalQuality;
  estimatedElements: number;
  renderedElements: number;
  detailRatio: number;
  cappedByBudget: boolean;
}

export interface FractalSceneInput {
  settings: FractalSettings;
  width: number;
  height: number;
  phase: number;
  quality: FractalQuality;
}

export const fractalDepthLimits: Record<FractalPresetId, number> = {
  tree: 15,
  koch: 12,
  sierpinski: 13,
};

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
    return 'Рекурсивное дерево с высокой глубиной и адаптивной отсечкой мелких ветвей.';
  }

  if (preset === 'koch') {
    return 'Снежинка Коха с пиксельной отсечкой: рисуются только детали, которые реально видны.';
  }

  return 'Треугольник Серпинского с адаптивной нарезкой для плотной рекурсивной графики.';
}

export function toFractalFrameStats(scene: FractalScene): FractalFrameStats {
  return {
    preset: scene.preset,
    width: scene.width,
    height: scene.height,
    quality: scene.quality,
    estimatedElements: scene.estimatedElements,
    renderedElements: scene.renderedElements,
    detailRatio: scene.detailRatio,
    cappedByBudget: scene.cappedByBudget,
  };
}

export function pickGeometrySettings(
  settings: FractalSettings,
): FractalGeometrySettings {
  return {
    preset: settings.preset,
    depth: settings.depth,
    branchAngleDeg: settings.branchAngleDeg,
    shrink: settings.shrink,
    rotationDeg: settings.rotationDeg,
  };
}

export function pickStyleSettings(
  settings: FractalSettings,
): FractalStyleSettings {
  return {
    lineWidth: settings.lineWidth,
    hueShift: settings.hueShift,
    glow: settings.glow,
  };
}

export function makeGeometryCacheKey({
  settings,
  width,
  height,
  phase,
  quality,
}: FractalSceneInput): string {
  const geometry = pickGeometrySettings(settings);
  const phaseKey = settings.animate
    ? Math.round(phase * (quality === 'preview' ? 18 : 24))
    : 0;

  return [
    geometry.preset,
    geometry.depth,
    geometry.branchAngleDeg.toFixed(2),
    geometry.shrink.toFixed(3),
    geometry.rotationDeg.toFixed(2),
    width,
    height,
    quality,
    phaseKey,
  ].join(':');
}
