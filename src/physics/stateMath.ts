import type { PendulumState } from './types';

export function addScaledState(
  base: PendulumState,
  delta: PendulumState,
  scale: number,
): PendulumState {
  return {
    theta1: base.theta1 + delta.theta1 * scale,
    omega1: base.omega1 + delta.omega1 * scale,
    theta2: base.theta2 + delta.theta2 * scale,
    omega2: base.omega2 + delta.omega2 * scale,
  };
}

export function combineStates(
  a: PendulumState,
  b: PendulumState,
  c: PendulumState,
  d: PendulumState,
): PendulumState {
  return {
    theta1: a.theta1 + 2 * b.theta1 + 2 * c.theta1 + d.theta1,
    omega1: a.omega1 + 2 * b.omega1 + 2 * c.omega1 + d.omega1,
    theta2: a.theta2 + 2 * b.theta2 + 2 * c.theta2 + d.theta2,
    omega2: a.omega2 + 2 * b.omega2 + 2 * c.omega2 + d.omega2,
  };
}

export function combineWeightedStates(
  terms: readonly {
    state: PendulumState;
    weight: number;
  }[],
): PendulumState {
  let theta1 = 0;
  let omega1 = 0;
  let theta2 = 0;
  let omega2 = 0;

  for (const term of terms) {
    theta1 += term.state.theta1 * term.weight;
    omega1 += term.state.omega1 * term.weight;
    theta2 += term.state.theta2 * term.weight;
    omega2 += term.state.omega2 * term.weight;
  }

  return { theta1, omega1, theta2, omega2 };
}
