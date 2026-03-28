import { derivatives } from '../physics/pendulum';
import { addScaledState } from '../physics/stateMath';
import type { IntegratorDefinition } from './types';

export const eulerIntegrator: IntegratorDefinition = {
  id: 'euler',
  label: 'Euler',
  shortLabel: 'Euler',
  order: 1,
  description: 'Fast and blunt. Useful for exposing numerical drift and instability.',
  step: (state, params, dt) => addScaledState(state, derivatives(state, params), dt),
};

