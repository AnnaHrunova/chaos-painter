import type { PendulumParams, PendulumState } from './types';

const EPSILON = 1e-6;

export function computeTotalEnergy(
  state: PendulumState,
  params: PendulumParams,
): number {
  const { theta1, theta2, omega1, omega2 } = state;
  const { m1, m2, l1, l2, g } = params;

  const kinetic1 = 0.5 * m1 * l1 * l1 * omega1 * omega1;
  const kinetic2 =
    0.5 *
    m2 *
    (l1 * l1 * omega1 * omega1 +
      l2 * l2 * omega2 * omega2 +
      2 * l1 * l2 * omega1 * omega2 * Math.cos(theta1 - theta2));

  const potential =
    -(m1 + m2) * g * l1 * Math.cos(theta1) - m2 * g * l2 * Math.cos(theta2);

  return kinetic1 + kinetic2 + potential;
}

export function computeEnergyDriftRatio(
  energy: number,
  initialEnergy: number,
): number {
  return (energy - initialEnergy) / Math.max(EPSILON, Math.abs(initialEnergy));
}

