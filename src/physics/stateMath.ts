import type { PendulumState } from './types';

const STATE_KEYS = [
  'theta1',
  'omega1',
  'theta2',
  'omega2',
  'theta3',
  'omega3',
] as const;

export function addScaledState(
  base: PendulumState,
  delta: PendulumState,
  scale: number,
): PendulumState {
  return combineWeightedStates([
    { state: base, weight: 1 },
    { state: delta, weight: scale },
  ]);
}

export function combineStates(
  a: PendulumState,
  b: PendulumState,
  c: PendulumState,
  d: PendulumState,
): PendulumState {
  return combineWeightedStates([
    { state: a, weight: 1 },
    { state: b, weight: 2 },
    { state: c, weight: 2 },
    { state: d, weight: 1 },
  ]);
}

export function combineWeightedStates(
  entries: Array<{ state: PendulumState; weight: number }>,
): PendulumState {
  const result = {} as Record<(typeof STATE_KEYS)[number], number>;

  for (const key of STATE_KEYS) {
    result[key] = 0;
  }

  for (const entry of entries) {
    for (const key of STATE_KEYS) {
      result[key] += entry.state[key] * entry.weight;
    }
  }

  return result;
}
