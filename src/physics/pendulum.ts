import type { PendulumParams, PendulumState, Position2D } from './types';

const EPSILON = 1e-9;

export function derivatives(
  state: PendulumState,
  params: PendulumParams,
): PendulumState {
  const { theta1, omega1, theta2, omega2 } = state;
  const { m1, m2, l1, l2, g } = params;
  const delta = theta1 - theta2;
  const denominatorBase = 2 * m1 + m2 - m2 * Math.cos(2 * delta);
  const denominator1 = l1 * Math.max(EPSILON, Math.abs(denominatorBase)) * Math.sign(denominatorBase || 1);
  const denominator2 = l2 * Math.max(EPSILON, Math.abs(denominatorBase)) * Math.sign(denominatorBase || 1);

  const domega1 =
    (-g * (2 * m1 + m2) * Math.sin(theta1) -
      m2 * g * Math.sin(theta1 - 2 * theta2) -
      2 *
        Math.sin(delta) *
        m2 *
        (omega2 * omega2 * l2 + omega1 * omega1 * l1 * Math.cos(delta))) /
    denominator1;

  const domega2 =
    (2 *
      Math.sin(delta) *
      (omega1 * omega1 * l1 * (m1 + m2) +
        g * (m1 + m2) * Math.cos(theta1) +
        omega2 * omega2 * l2 * m2 * Math.cos(delta))) /
    denominator2;

  return {
    theta1: omega1,
    omega1: domega1,
    theta2: omega2,
    omega2: domega2,
  };
}

export function computePositions(
  state: PendulumState,
  params: Pick<PendulumParams, 'l1' | 'l2'>,
): { p1: Position2D; p2: Position2D } {
  const p1 = {
    x: params.l1 * Math.sin(state.theta1),
    y: params.l1 * Math.cos(state.theta1),
  };

  const p2 = {
    x: p1.x + params.l2 * Math.sin(state.theta2),
    y: p1.y + params.l2 * Math.cos(state.theta2),
  };

  return { p1, p2 };
}

export function computeSpeeds(
  state: PendulumState,
  params: Pick<PendulumParams, 'l1' | 'l2'>,
): { speed1: number; speed2: number } {
  const { theta1, theta2, omega1, omega2 } = state;
  const { l1, l2 } = params;
  const speed1 = Math.abs(l1 * omega1);
  const speed2Squared =
    l1 * l1 * omega1 * omega1 +
    l2 * l2 * omega2 * omega2 +
    2 * l1 * l2 * omega1 * omega2 * Math.cos(theta1 - theta2);

  return {
    speed1,
    speed2: Math.sqrt(Math.max(0, speed2Squared)),
  };
}

export function computeAngularVelocityMagnitude(
  state: PendulumState,
): number {
  return Math.abs(state.omega1) + Math.abs(state.omega2);
}

