import {
  estimateFractalElements,
  type FractalScene,
  type FractalSceneInput,
  type FractalSegment,
  type FractalSettings,
  type FractalTriangle,
} from './types';

interface Point2D {
  x: number;
  y: number;
}

export function buildFractalScene({
  settings,
  width,
  height,
  phase,
}: FractalSceneInput): FractalScene {
  const estimatedElements = estimateFractalElements(settings.preset, settings.depth);

  if (settings.preset === 'tree') {
    const segments = buildTreeSegments(width, height, settings, phase);
    return {
      preset: settings.preset,
      width,
      height,
      renderMode: 'segments',
      segments,
      triangles: [],
      estimatedElements,
      renderedElements: segments.length,
      detailRatio: segments.length / Math.max(1, estimatedElements),
    };
  }

  if (settings.preset === 'koch') {
    const segments = buildKochSegments(width, height, settings, phase);
    return {
      preset: settings.preset,
      width,
      height,
      renderMode: 'segments',
      segments,
      triangles: [],
      estimatedElements,
      renderedElements: segments.length,
      detailRatio: segments.length / Math.max(1, estimatedElements),
    };
  }

  const triangles = buildSierpinskiTriangles(width, height, settings, phase);
  return {
    preset: settings.preset,
    width,
    height,
    renderMode: 'triangles',
    segments: [],
    triangles,
    estimatedElements,
    renderedElements: triangles.length,
    detailRatio: triangles.length / Math.max(1, estimatedElements),
  };
}

function buildTreeSegments(
  width: number,
  height: number,
  settings: FractalSettings,
  phase: number,
): FractalSegment[] {
  const segments: FractalSegment[] = [];
  const baseLength = Math.min(width, height) * 0.16;
  const branchAngle =
    degreesToRadians(settings.branchAngleDeg) *
    (1 + (settings.animate ? Math.sin(phase * 1.25) * 0.12 : 0));
  const trunkAngle = -Math.PI / 2 + degreesToRadians(settings.rotationDeg);
  const sway = settings.animate ? Math.sin(phase * 0.9) * 0.08 : 0;
  const minLength = Math.max(1.2, Math.min(width, height) * 0.0016);

  appendTreeBranch(
    segments,
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
    minLength,
  );

  return segments;
}

function appendTreeBranch(
  segments: FractalSegment[],
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
  minLength: number,
): void {
  if (depth <= 0 || length < minLength) {
    return;
  }

  const progress = 1 - depth / Math.max(1, maxDepth);
  const endX = x + Math.cos(angle) * length;
  const endY = y + Math.sin(angle) * length;

  segments.push({
    x1: x,
    y1: y,
    x2: endX,
    y2: endY,
    progress,
    weight: depth / Math.max(1, maxDepth),
  });

  const nextLength = length * settings.shrink;
  const ripple = settings.animate ? Math.sin(phase * 1.7 + depth) * 0.04 : 0;

  appendTreeBranch(
    segments,
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
    minLength,
  );
  appendTreeBranch(
    segments,
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
    minLength,
  );
}

function buildKochSegments(
  width: number,
  height: number,
  settings: FractalSettings,
  phase: number,
): FractalSegment[] {
  const radius = Math.min(width, height) * 0.24;
  const centerX = width * 0.5;
  const centerY = height * 0.54;
  const rotation =
    degreesToRadians(settings.rotationDeg) +
    (settings.animate ? Math.sin(phase * 0.7) * 0.08 : 0);
  const vertices = buildRegularTriangle(centerX, centerY, radius, rotation);
  const segments: FractalSegment[] = [];
  const minSegment = Math.max(0.9, Math.min(width, height) * 0.00125);

  appendKochSegment(vertices[0], vertices[1], settings.depth, settings.depth, minSegment, segments);
  appendKochSegment(vertices[1], vertices[2], settings.depth, settings.depth, minSegment, segments);
  appendKochSegment(vertices[2], vertices[0], settings.depth, settings.depth, minSegment, segments);

  return segments;
}

function appendKochSegment(
  start: Point2D,
  end: Point2D,
  depth: number,
  maxDepth: number,
  minSegment: number,
  segments: FractalSegment[],
): void {
  const length = Math.hypot(end.x - start.x, end.y - start.y);

  if (depth === 0 || length < minSegment) {
    segments.push({
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      progress: 1 - depth / Math.max(1, maxDepth),
      weight: 0.72,
    });
    return;
  }

  const dx = (end.x - start.x) / 3;
  const dy = (end.y - start.y) / 3;
  const p1 = { x: start.x + dx, y: start.y + dy };
  const p3 = { x: start.x + dx * 2, y: start.y + dy * 2 };
  const segmentLength = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) - Math.PI / 3;
  const p2 = {
    x: p1.x + Math.cos(angle) * segmentLength,
    y: p1.y + Math.sin(angle) * segmentLength,
  };

  appendKochSegment(start, p1, depth - 1, maxDepth, minSegment, segments);
  appendKochSegment(p1, p2, depth - 1, maxDepth, minSegment, segments);
  appendKochSegment(p2, p3, depth - 1, maxDepth, minSegment, segments);
  appendKochSegment(p3, end, depth - 1, maxDepth, minSegment, segments);
}

function buildSierpinskiTriangles(
  width: number,
  height: number,
  settings: FractalSettings,
  phase: number,
): FractalTriangle[] {
  const radius = Math.min(width, height) * 0.26;
  const centerX = width * 0.5;
  const centerY = height * 0.55;
  const rotation =
    degreesToRadians(settings.rotationDeg) +
    (settings.animate ? Math.sin(phase * 0.55) * 0.06 : 0);
  const vertices = buildRegularTriangle(centerX, centerY, radius, rotation);
  const triangles: FractalTriangle[] = [];
  const minEdge = Math.max(1.4, Math.min(width, height) * 0.0017);

  appendSierpinskiTriangle(
    triangles,
    vertices[0],
    vertices[1],
    vertices[2],
    settings.depth,
    settings.depth,
    minEdge,
  );

  return triangles;
}

function appendSierpinskiTriangle(
  triangles: FractalTriangle[],
  a: Point2D,
  b: Point2D,
  c: Point2D,
  depth: number,
  maxDepth: number,
  minEdge: number,
): void {
  const edge = Math.max(
    Math.hypot(b.x - a.x, b.y - a.y),
    Math.hypot(c.x - b.x, c.y - b.y),
    Math.hypot(a.x - c.x, a.y - c.y),
  );

  if (depth === 0 || edge < minEdge) {
    triangles.push({
      ax: a.x,
      ay: a.y,
      bx: b.x,
      by: b.y,
      cx: c.x,
      cy: c.y,
      progress: 1 - depth / Math.max(1, maxDepth),
    });
    return;
  }

  const ab = midpoint(a, b);
  const bc = midpoint(b, c);
  const ca = midpoint(c, a);

  appendSierpinskiTriangle(triangles, a, ab, ca, depth - 1, maxDepth, minEdge);
  appendSierpinskiTriangle(triangles, ab, b, bc, depth - 1, maxDepth, minEdge);
  appendSierpinskiTriangle(triangles, ca, bc, c, depth - 1, maxDepth, minEdge);
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

function midpoint(a: Point2D, b: Point2D): Point2D {
  return {
    x: (a.x + b.x) * 0.5,
    y: (a.y + b.y) * 0.5,
  };
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}
