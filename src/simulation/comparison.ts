import { comparisonMethodIds } from '../integrators';
import type { IntegrationMethodId } from '../integrators/types';
import type { MetricPoint, PendulumParams, PendulumState, TrajectorySeries } from '../physics/types';
import { simulateTrajectory } from './simulateTrajectory';

export function simulateComparisonTrajectories(
  initialState: PendulumState,
  params: PendulumParams,
  dt: number,
  steps: number,
  methods: IntegrationMethodId[] = comparisonMethodIds,
): TrajectorySeries[] {
  return methods.map((methodId) =>
    simulateTrajectory({
      initialState,
      params,
      dt,
      steps,
      methodId,
    }),
  );
}

export function computeDivergenceSeries(
  reference: TrajectorySeries,
  candidate: TrajectorySeries,
): MetricPoint[] {
  const length = Math.min(reference.samples.length, candidate.samples.length);
  const points: MetricPoint[] = [];

  for (let index = 0; index < length; index += 1) {
    const a = reference.samples[index];
    const b = candidate.samples[index];
    const dx = a.p4.x - b.p4.x;
    const dy = a.p4.y - b.p4.y;
    points.push({
      time: a.time,
      value: Math.sqrt(dx * dx + dy * dy),
    });
  }

  return points;
}
