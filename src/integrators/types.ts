import type { PendulumParams, PendulumState } from '../physics/types';

export type IntegrationMethodId =
  | 'euler'
  | 'midpoint'
  | 'heun'
  | 'ralston'
  | 'rk3'
  | 'rk4'
  | 'rk4_38';

export interface IntegratorDefinition {
  id: IntegrationMethodId;
  label: string;
  shortLabel: string;
  order: number;
  accuracyRank: number;
  accentColor: string;
  description: string;
  step: (
    state: PendulumState,
    params: PendulumParams,
    dt: number,
  ) => PendulumState;
}
