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

export interface FractalSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  progress: number;
  weight: number;
}

export interface FractalTriangle {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  cx: number;
  cy: number;
  progress: number;
}

export interface FractalScene {
  preset: FractalPresetId;
  width: number;
  height: number;
  renderMode: 'segments' | 'triangles';
  segments: FractalSegment[];
  triangles: FractalTriangle[];
  estimatedElements: number;
  renderedElements: number;
  detailRatio: number;
}

export interface FractalSceneInput {
  settings: FractalSettings;
  width: number;
  height: number;
  phase: number;
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
    return 'Рекурсивное дерево с адаптивной детализацией: выдерживает заметно большую глубину без истерики интерфейса.';
  }

  if (preset === 'koch') {
    return 'Снежинка Коха с отсечкой по пиксельному размеру: глубину можно крутить далеко, а рисуются только видимые детали.';
  }

  return 'Треугольник Серпинского с адаптивной нарезкой: высокая глубина остаётся полезной, а не просто жрёт CPU.';
}
