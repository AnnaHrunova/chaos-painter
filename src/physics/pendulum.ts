import type { PendulumParams, PendulumState, Position2D } from './types';

const STATE_SIZE = 4;
const EPSILON = 1e-9;

type Vector4 = [number, number, number, number];
type Matrix4 = [Vector4, Vector4, Vector4, Vector4];
type PositionTuple4 = [Position2D, Position2D, Position2D, Position2D];

export function derivatives(
  state: PendulumState,
  params: PendulumParams,
): PendulumState {
  const angles = toAngles(state);
  const omegas = toOmegas(state);
  const masses = toMasses(params);
  const lengths = toLengths(params);
  const tailMasses = buildTailMasses(masses);
  const massMatrix = buildMassMatrix(angles, lengths, tailMasses);
  const gravityVector = buildGravityVector(angles, lengths, tailMasses, params.g);
  const coriolisVector = buildCoriolisVector(angles, omegas, lengths, tailMasses);
  const accelerations = solveLinearSystem(
    massMatrix,
    gravityVector.map((value, index) => -(value + coriolisVector[index])) as Vector4,
  );

  return {
    theta1: state.omega1,
    omega1: accelerations[0],
    theta2: state.omega2,
    omega2: accelerations[1],
    theta3: state.omega3,
    omega3: accelerations[2],
    theta4: state.omega4,
    omega4: accelerations[3],
  };
}

export function computePositions(
  state: PendulumState,
  params: Pick<PendulumParams, 'l1' | 'l2' | 'l3' | 'l4'>,
): {
  positions: PositionTuple4;
  p1: Position2D;
  p2: Position2D;
  p3: Position2D;
  p4: Position2D;
} {
  const angles = toAngles(state);
  const lengths = toLengths(params);
  const positions = [] as Position2D[];
  let x = 0;
  let y = 0;

  for (let index = 0; index < STATE_SIZE; index += 1) {
    x += lengths[index] * Math.sin(angles[index]);
    y += lengths[index] * Math.cos(angles[index]);
    positions.push({ x, y });
  }

  return {
    positions: positions as PositionTuple4,
    p1: positions[0],
    p2: positions[1],
    p3: positions[2],
    p4: positions[3],
  };
}

export function computeSpeeds(
  state: PendulumState,
  params: Pick<PendulumParams, 'l1' | 'l2' | 'l3' | 'l4'>,
): {
  speeds: Vector4;
  speed1: number;
  speed2: number;
  speed3: number;
  speed4: number;
} {
  const angles = toAngles(state);
  const omegas = toOmegas(state);
  const lengths = toLengths(params);
  const speeds = [] as number[];
  let vx = 0;
  let vy = 0;

  for (let index = 0; index < STATE_SIZE; index += 1) {
    vx += lengths[index] * Math.cos(angles[index]) * omegas[index];
    vy -= lengths[index] * Math.sin(angles[index]) * omegas[index];
    speeds.push(Math.sqrt(vx * vx + vy * vy));
  }

  return {
    speeds: speeds as Vector4,
    speed1: speeds[0],
    speed2: speeds[1],
    speed3: speeds[2],
    speed4: speeds[3],
  };
}

export function computeAngularVelocityMagnitude(
  state: PendulumState,
): number {
  return (
    Math.abs(state.omega1) +
    Math.abs(state.omega2) +
    Math.abs(state.omega3) +
    Math.abs(state.omega4)
  );
}

function toAngles(
  state: Pick<PendulumState, 'theta1' | 'theta2' | 'theta3' | 'theta4'>,
): Vector4 {
  return [state.theta1, state.theta2, state.theta3, state.theta4];
}

function toOmegas(
  state: Pick<PendulumState, 'omega1' | 'omega2' | 'omega3' | 'omega4'>,
): Vector4 {
  return [state.omega1, state.omega2, state.omega3, state.omega4];
}

function toMasses(
  params: Pick<PendulumParams, 'm1' | 'm2' | 'm3' | 'm4'>,
): Vector4 {
  return [params.m1, params.m2, params.m3, params.m4];
}

function toLengths(
  params: Pick<PendulumParams, 'l1' | 'l2' | 'l3' | 'l4'>,
): Vector4 {
  return [params.l1, params.l2, params.l3, params.l4];
}

function buildTailMasses(masses: readonly number[]): Vector4 {
  const tailMasses = [0, 0, 0, 0] as Vector4;
  let accumulated = 0;

  for (let index = STATE_SIZE - 1; index >= 0; index -= 1) {
    accumulated += masses[index];
    tailMasses[index] = accumulated;
  }

  return tailMasses;
}

function buildMassMatrix(
  angles: readonly number[],
  lengths: readonly number[],
  tailMasses: readonly number[],
): Matrix4 {
  const matrix = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ] as Matrix4;

  for (let row = 0; row < STATE_SIZE; row += 1) {
    for (let column = 0; column < STATE_SIZE; column += 1) {
      const couplingMass = tailMasses[Math.max(row, column)];
      matrix[row][column] =
        lengths[row] *
        lengths[column] *
        couplingMass *
        Math.cos(angles[row] - angles[column]);
    }
  }

  return matrix;
}

function buildGravityVector(
  angles: readonly number[],
  lengths: readonly number[],
  tailMasses: readonly number[],
  gravity: number,
): Vector4 {
  return angles.map(
    (angle, index) => gravity * lengths[index] * tailMasses[index] * Math.sin(angle),
  ) as Vector4;
}

function buildCoriolisVector(
  angles: readonly number[],
  omegas: readonly number[],
  lengths: readonly number[],
  tailMasses: readonly number[],
): Vector4 {
  const vector = [0, 0, 0, 0] as Vector4;

  for (let i = 0; i < STATE_SIZE; i += 1) {
    let value = 0;

    for (let j = 0; j < STATE_SIZE; j += 1) {
      for (let k = 0; k < STATE_SIZE; k += 1) {
        const christoffel =
          (partialMassMatrix(i, j, k, angles, lengths, tailMasses) +
            partialMassMatrix(i, k, j, angles, lengths, tailMasses) -
            partialMassMatrix(j, k, i, angles, lengths, tailMasses)) *
          0.5;

        value += christoffel * omegas[j] * omegas[k];
      }
    }

    vector[i] = value;
  }

  return vector;
}

function partialMassMatrix(
  row: number,
  column: number,
  angleIndex: number,
  angles: readonly number[],
  lengths: readonly number[],
  tailMasses: readonly number[],
): number {
  if (row === column) {
    return 0;
  }

  const couplingMass = tailMasses[Math.max(row, column)];
  const coefficient =
    couplingMass *
    lengths[row] *
    lengths[column] *
    Math.sin(angles[row] - angles[column]);

  if (angleIndex === row) {
    return -coefficient;
  }

  if (angleIndex === column) {
    return coefficient;
  }

  return 0;
}

function solveLinearSystem(
  matrix: Matrix4,
  vector: Vector4,
): Vector4 {
  const a = matrix.map((row) => [...row]) as number[][];
  const b = [...vector];

  for (let pivot = 0; pivot < STATE_SIZE; pivot += 1) {
    let bestRow = pivot;

    for (let row = pivot + 1; row < STATE_SIZE; row += 1) {
      if (Math.abs(a[row][pivot]) > Math.abs(a[bestRow][pivot])) {
        bestRow = row;
      }
    }

    if (bestRow !== pivot) {
      [a[pivot], a[bestRow]] = [a[bestRow], a[pivot]];
      [b[pivot], b[bestRow]] = [b[bestRow], b[pivot]];
    }

    const pivotValue = Math.abs(a[pivot][pivot]) < EPSILON ? EPSILON : a[pivot][pivot];

    for (let row = pivot + 1; row < STATE_SIZE; row += 1) {
      const factor = a[row][pivot] / pivotValue;
      for (let column = pivot; column < STATE_SIZE; column += 1) {
        a[row][column] -= factor * a[pivot][column];
      }
      b[row] -= factor * b[pivot];
    }
  }

  const solution = [0, 0, 0, 0] as Vector4;

  for (let row = STATE_SIZE - 1; row >= 0; row -= 1) {
    let value = b[row];

    for (let column = row + 1; column < STATE_SIZE; column += 1) {
      value -= a[row][column] * solution[column];
    }

    const diagonal = Math.abs(a[row][row]) < EPSILON ? EPSILON : a[row][row];
    solution[row] = value / diagonal;
  }

  return solution;
}
