import {
  estimateFractalElements,
  type FractalPresetId,
  type FractalQuality,
  type FractalScene,
  type FractalSceneInput,
} from './types';

const SEGMENT_STRIDE = 6;
const TRIANGLE_STRIDE = 7;
const CANCELLED_ERROR = 'FRACTAL_BUILD_CANCELLED';
const YIELD_INTERVAL = 768;

interface QualityProfile {
  maxElements: number;
  minScale: number;
  maxDepth: number;
}

interface BuildGuard {
  shouldCancel: () => boolean;
}

const qualityProfiles: Record<
  FractalQuality,
  Record<FractalPresetId, QualityProfile>
> = {
  preview: {
    tree: { maxElements: 7_500, minScale: 0.0046, maxDepth: 11 },
    koch: { maxElements: 8_500, minScale: 0.0038, maxDepth: 8 },
    sierpinski: { maxElements: 11_000, minScale: 0.0042, maxDepth: 10 },
  },
  full: {
    tree: { maxElements: 24_000, minScale: 0.0022, maxDepth: 15 },
    koch: { maxElements: 22_000, minScale: 0.0017, maxDepth: 11 },
    sierpinski: { maxElements: 32_000, minScale: 0.0020, maxDepth: 13 },
  },
};

export function isFractalBuildCancelled(error: unknown): boolean {
  return error instanceof Error && error.message === CANCELLED_ERROR;
}

export async function buildFractalScene(
  input: FractalSceneInput,
  guard: BuildGuard,
): Promise<FractalScene> {
  const estimatedElements = estimateFractalElements(
    input.settings.preset,
    input.settings.depth,
  );

  if (input.settings.preset === 'tree') {
    const result = await buildTreeSegments(input, guard);
    return {
      preset: input.settings.preset,
      width: input.width,
      height: input.height,
      quality: input.quality,
      renderMode: 'segments',
      segmentData: result.data,
      triangleData: new Float32Array(0),
      estimatedElements,
      renderedElements: result.renderedElements,
      detailRatio: result.renderedElements / Math.max(1, estimatedElements),
      cappedByBudget: result.cappedByBudget,
    };
  }

  if (input.settings.preset === 'koch') {
    const result = await buildKochSegments(input, guard);
    return {
      preset: input.settings.preset,
      width: input.width,
      height: input.height,
      quality: input.quality,
      renderMode: 'segments',
      segmentData: result.data,
      triangleData: new Float32Array(0),
      estimatedElements,
      renderedElements: result.renderedElements,
      detailRatio: result.renderedElements / Math.max(1, estimatedElements),
      cappedByBudget: result.cappedByBudget,
    };
  }

  const result = await buildSierpinskiTriangles(input, guard);
  return {
    preset: input.settings.preset,
    width: input.width,
    height: input.height,
    quality: input.quality,
    renderMode: 'triangles',
    segmentData: new Float32Array(0),
    triangleData: result.data,
    estimatedElements,
    renderedElements: result.renderedElements,
    detailRatio: result.renderedElements / Math.max(1, estimatedElements),
    cappedByBudget: result.cappedByBudget,
  };
}

async function buildTreeSegments(
  input: FractalSceneInput,
  guard: BuildGuard,
): Promise<{
  data: Float32Array;
  renderedElements: number;
  cappedByBudget: boolean;
}> {
  const profile = qualityProfiles[input.quality].tree;
  const maxDepth = Math.min(input.settings.depth, profile.maxDepth);
  const minDimension = Math.min(input.width, input.height);
  const baseLength = minDimension * 0.16;
  const branchAngle =
    degreesToRadians(input.settings.branchAngleDeg) *
    (1 + (input.settings.animate ? Math.sin(input.phase * 1.25) * 0.12 : 0));
  const trunkAngle = -Math.PI / 2 + degreesToRadians(input.settings.rotationDeg);
  const sway = input.settings.animate ? Math.sin(input.phase * 0.9) * 0.08 : 0;
  const minLength = Math.max(1.2, minDimension * profile.minScale);
  const output: number[] = [];
  const stack = [input.width * 0.5, input.height * 0.88, baseLength, trunkAngle, maxDepth];
  let processed = 0;
  let cappedByBudget = false;

  while (stack.length > 0) {
    const depth = stack.pop() as number;
    const angle = stack.pop() as number;
    const length = stack.pop() as number;
    const y = stack.pop() as number;
    const x = stack.pop() as number;

    if (depth <= 0 || length < minLength) {
      continue;
    }

    if (output.length / SEGMENT_STRIDE >= profile.maxElements) {
      cappedByBudget = true;
      break;
    }

    const progress = 1 - depth / Math.max(1, maxDepth);
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;

    output.push(x, y, endX, endY, progress, depth / Math.max(1, maxDepth));

    const nextLength = length * input.settings.shrink;
    const nextDepth = depth - 1;

    if (nextDepth > 0 && nextLength >= minLength) {
      const ripple = input.settings.animate
        ? Math.sin(input.phase * 1.7 + depth) * 0.04
        : 0;

      stack.push(
        endX,
        endY,
        nextLength,
        angle + branchAngle + sway - ripple,
        nextDepth,
      );
      stack.push(
        endX,
        endY,
        nextLength,
        angle - branchAngle + sway + ripple,
        nextDepth,
      );
    }

    processed += 1;
    if (processed % YIELD_INTERVAL === 0) {
      await yieldIfNeeded(guard);
    }
  }

  return {
    data: Float32Array.from(output),
    renderedElements: output.length / SEGMENT_STRIDE,
    cappedByBudget,
  };
}

async function buildKochSegments(
  input: FractalSceneInput,
  guard: BuildGuard,
): Promise<{
  data: Float32Array;
  renderedElements: number;
  cappedByBudget: boolean;
}> {
  const profile = qualityProfiles[input.quality].koch;
  const maxDepth = Math.min(input.settings.depth, profile.maxDepth);
  const minDimension = Math.min(input.width, input.height);
  const radius = minDimension * 0.24;
  const centerX = input.width * 0.5;
  const centerY = input.height * 0.54;
  const rotation =
    degreesToRadians(input.settings.rotationDeg) +
    (input.settings.animate ? Math.sin(input.phase * 0.7) * 0.08 : 0);
  const vertices = buildRegularTriangle(centerX, centerY, radius, rotation);
  const minSegment = Math.max(0.9, minDimension * profile.minScale);
  const output: number[] = [];
  const stack = [
    vertices[0][0],
    vertices[0][1],
    vertices[1][0],
    vertices[1][1],
    maxDepth,
    vertices[1][0],
    vertices[1][1],
    vertices[2][0],
    vertices[2][1],
    maxDepth,
    vertices[2][0],
    vertices[2][1],
    vertices[0][0],
    vertices[0][1],
    maxDepth,
  ];
  let processed = 0;
  let cappedByBudget = false;

  while (stack.length > 0) {
    const depth = stack.pop() as number;
    const endY = stack.pop() as number;
    const endX = stack.pop() as number;
    const startY = stack.pop() as number;
    const startX = stack.pop() as number;
    const length = Math.hypot(endX - startX, endY - startY);

    if (depth === 0 || length < minSegment) {
      if (output.length / SEGMENT_STRIDE >= profile.maxElements) {
        cappedByBudget = true;
        break;
      }

      output.push(
        startX,
        startY,
        endX,
        endY,
        1 - depth / Math.max(1, maxDepth),
        0.72,
      );
    } else {
      const dx = (endX - startX) / 3;
      const dy = (endY - startY) / 3;
      const p1x = startX + dx;
      const p1y = startY + dy;
      const p3x = startX + dx * 2;
      const p3y = startY + dy * 2;
      const segmentLength = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) - Math.PI / 3;
      const p2x = p1x + Math.cos(angle) * segmentLength;
      const p2y = p1y + Math.sin(angle) * segmentLength;
      const nextDepth = depth - 1;

      stack.push(p3x, p3y, endX, endY, nextDepth);
      stack.push(p2x, p2y, p3x, p3y, nextDepth);
      stack.push(p1x, p1y, p2x, p2y, nextDepth);
      stack.push(startX, startY, p1x, p1y, nextDepth);
    }

    processed += 1;
    if (processed % YIELD_INTERVAL === 0) {
      await yieldIfNeeded(guard);
    }
  }

  return {
    data: Float32Array.from(output),
    renderedElements: output.length / SEGMENT_STRIDE,
    cappedByBudget,
  };
}

async function buildSierpinskiTriangles(
  input: FractalSceneInput,
  guard: BuildGuard,
): Promise<{
  data: Float32Array;
  renderedElements: number;
  cappedByBudget: boolean;
}> {
  const profile = qualityProfiles[input.quality].sierpinski;
  const maxDepth = Math.min(input.settings.depth, profile.maxDepth);
  const minDimension = Math.min(input.width, input.height);
  const radius = minDimension * 0.26;
  const centerX = input.width * 0.5;
  const centerY = input.height * 0.55;
  const rotation =
    degreesToRadians(input.settings.rotationDeg) +
    (input.settings.animate ? Math.sin(input.phase * 0.55) * 0.06 : 0);
  const vertices = buildRegularTriangle(centerX, centerY, radius, rotation);
  const minEdge = Math.max(1.4, minDimension * profile.minScale);
  const output: number[] = [];
  const stack = [
    vertices[0][0],
    vertices[0][1],
    vertices[1][0],
    vertices[1][1],
    vertices[2][0],
    vertices[2][1],
    maxDepth,
  ];
  let processed = 0;
  let cappedByBudget = false;

  while (stack.length > 0) {
    const depth = stack.pop() as number;
    const cy = stack.pop() as number;
    const cx = stack.pop() as number;
    const by = stack.pop() as number;
    const bx = stack.pop() as number;
    const ay = stack.pop() as number;
    const ax = stack.pop() as number;
    const edge = Math.max(
      Math.hypot(bx - ax, by - ay),
      Math.hypot(cx - bx, cy - by),
      Math.hypot(ax - cx, ay - cy),
    );

    if (depth === 0 || edge < minEdge) {
      if (output.length / TRIANGLE_STRIDE >= profile.maxElements) {
        cappedByBudget = true;
        break;
      }

      output.push(ax, ay, bx, by, cx, cy, 1 - depth / Math.max(1, maxDepth));
    } else {
      const abx = (ax + bx) * 0.5;
      const aby = (ay + by) * 0.5;
      const bcx = (bx + cx) * 0.5;
      const bcy = (by + cy) * 0.5;
      const cax = (cx + ax) * 0.5;
      const cay = (cy + ay) * 0.5;
      const nextDepth = depth - 1;

      stack.push(cax, cay, bcx, bcy, cx, cy, nextDepth);
      stack.push(abx, aby, bx, by, bcx, bcy, nextDepth);
      stack.push(ax, ay, abx, aby, cax, cay, nextDepth);
    }

    processed += 1;
    if (processed % YIELD_INTERVAL === 0) {
      await yieldIfNeeded(guard);
    }
  }

  return {
    data: Float32Array.from(output),
    renderedElements: output.length / TRIANGLE_STRIDE,
    cappedByBudget,
  };
}

function buildRegularTriangle(
  centerX: number,
  centerY: number,
  radius: number,
  rotation: number,
): [[number, number], [number, number], [number, number]] {
  return [0, 1, 2].map((index) => {
    const angle = rotation - Math.PI / 2 + (index * Math.PI * 2) / 3;
    return [
      centerX + Math.cos(angle) * radius,
      centerY + Math.sin(angle) * radius,
    ];
  }) as [[number, number], [number, number], [number, number]];
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

async function yieldIfNeeded(guard: BuildGuard): Promise<void> {
  if (guard.shouldCancel()) {
    throw new Error(CANCELLED_ERROR);
  }

  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

  if (guard.shouldCancel()) {
    throw new Error(CANCELLED_ERROR);
  }
}
