import type { PendulumParams, PendulumState } from '../physics/types';

export type IntegrationMethodId =
  | 'euler'
  | 'midpoint'
  | 'heun'
  | 'ralston'
  | 'rk3'
  | 'bogacki_shampine'
  | 'rk4'
  | 'rk4_38'
  | 'dopri5';

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
