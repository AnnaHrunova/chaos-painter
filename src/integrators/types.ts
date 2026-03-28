import type { PendulumParams, PendulumState } from '../physics/types';

export type IntegrationMethodId = 'euler' | 'midpoint' | 'rk4';

export interface IntegratorDefinition {
  id: IntegrationMethodId;
  label: string;
  shortLabel: string;
  order: number;
  description: string;
  step: (
    state: PendulumState,
    params: PendulumParams,
    dt: number,
  ) => PendulumState;
}

