import type { PendulumParams, PendulumState } from './types';

const EPSILON = 1e-6;

export function computeTotalEnergy(
  state: PendulumState,
  params: PendulumParams,
): number {
  const angles = [state.theta1, state.theta2, state.theta3, state.theta4] as const;
  const omegas = [state.omega1, state.omega2, state.omega3, state.omega4] as const;
  const masses = [params.m1, params.m2, params.m3, params.m4] as const;
  const lengths = [params.l1, params.l2, params.l3, params.l4] as const;

  let kinetic = 0;
  let potential = 0;
  let accumulatedHeight = 0;

  for (let massIndex = 0; massIndex < masses.length; massIndex += 1) {
    let vx = 0;
    let vy = 0;
    accumulatedHeight = 0;

    for (let linkIndex = 0; linkIndex <= massIndex; linkIndex += 1) {
      vx += lengths[linkIndex] * Math.cos(angles[linkIndex]) * omegas[linkIndex];
      vy -= lengths[linkIndex] * Math.sin(angles[linkIndex]) * omegas[linkIndex];
      accumulatedHeight += lengths[linkIndex] * Math.cos(angles[linkIndex]);
    }

    kinetic += 0.5 * masses[massIndex] * (vx * vx + vy * vy);
    potential -= masses[massIndex] * params.g * accumulatedHeight;
  }

  return kinetic + potential;
}

export function computeEnergyDriftRatio(
  energy: number,
  initialEnergy: number,
): number {
  return (energy - initialEnergy) / Math.max(EPSILON, Math.abs(initialEnergy));
}
