import { getIntegrator } from '../integrators';
import { computeEnergyDriftRatio, computeTotalEnergy } from '../physics/energy';
import {
  computeAngularVelocityMagnitude,
  computePositions,
  computeSpeeds,
} from '../physics/pendulum';
import type { PendulumParams, PendulumState, TrajectorySeries } from '../physics/types';

export interface SimulateTrajectoryInput {
  initialState: PendulumState;
  params: PendulumParams;
  dt: number;
  steps: number;
  methodId: TrajectorySeries['methodId'];
}

export function simulateTrajectory({
  initialState,
  params,
  dt,
  steps,
  methodId,
}: SimulateTrajectoryInput): TrajectorySeries {
  const integrator = getIntegrator(methodId);
  const samples: TrajectorySeries['samples'] = [];
  let state = { ...initialState };
  const initialEnergy = computeTotalEnergy(state, params);
  let minEnergy = initialEnergy;
  let maxEnergy = initialEnergy;
  let maxEnergyDrift = 0;
  let maxEnergyDriftRatio = 0;

  // Precomputing the whole path keeps playback deterministic. The user sees
  // differences between integrators, not timing noise from the browser loop.
  for (let index = 0; index <= steps; index += 1) {
    const time = index * dt;
    const positions = computePositions(state, params);
    const speeds = computeSpeeds(state, params);
    const energy = computeTotalEnergy(state, params);
    const energyDrift = energy - initialEnergy;
    const energyDriftRatio = computeEnergyDriftRatio(energy, initialEnergy);

    minEnergy = Math.min(minEnergy, energy);
    maxEnergy = Math.max(maxEnergy, energy);
    maxEnergyDrift = Math.max(maxEnergyDrift, Math.abs(energyDrift));
    maxEnergyDriftRatio = Math.max(
      maxEnergyDriftRatio,
      Math.abs(energyDriftRatio),
    );

    samples.push({
      state: { ...state },
      time,
      p1: positions.p1,
      p2: positions.p2,
      speed1: speeds.speed1,
      speed2: speeds.speed2,
      energy,
      energyDrift,
      energyDriftRatio,
      angularVelocity: computeAngularVelocityMagnitude(state),
    });

    if (index < steps) {
      state = integrator.step(state, params, dt);
    }
  }

  return {
    methodId: integrator.id,
    methodLabel: integrator.label,
    dt,
    samples,
    summary: {
      initialEnergy,
      finalEnergy: samples[samples.length - 1]?.energy ?? initialEnergy,
      maxEnergyDrift,
      maxEnergyDriftRatio,
      minEnergy,
      maxEnergy,
    },
  };
}

