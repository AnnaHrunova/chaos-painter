import { derivatives } from '../physics/pendulum';
import { addScaledState } from '../physics/stateMath';
import type { IntegratorDefinition } from './types';

export const midpointIntegrator: IntegratorDefinition = {
  id: 'midpoint',
  label: 'RK2 / Midpoint',
  shortLabel: 'RK2',
  order: 2,
  description: 'A cleaner second-order estimate that lands between speed and fidelity.',
  step: (state, params, dt) => {
    const k1 = derivatives(state, params);
    const midpointState = addScaledState(state, k1, dt * 0.5);
    const k2 = derivatives(midpointState, params);
    return addScaledState(state, k2, dt);
  },
};

