import { derivatives } from '../physics/pendulum';
import { addScaledState } from '../physics/stateMath';
import type { IntegratorDefinition } from './types';

export const ralstonIntegrator: IntegratorDefinition = {
  id: 'ralston',
  label: 'Ralston RK2',
  shortLabel: 'Ralston',
  order: 2,
  accuracyRank: 3,
  accentColor: '#66f0c6',
  description:
    'Ещё один метод второго порядка, но с более удачными весами, чем у обычного RK2. На том же dt часто даёт чуть меньшую локальную ошибку и меньше портит форму траектории.',
  step: (state, params, dt) => {
    const k1 = derivatives(state, params);
    const shiftedState = addScaledState(state, k1, (dt * 2) / 3);
    const k2 = derivatives(shiftedState, params);

    return {
      theta1: state.theta1 + dt * (k1.theta1 / 4 + (3 * k2.theta1) / 4),
      omega1: state.omega1 + dt * (k1.omega1 / 4 + (3 * k2.omega1) / 4),
      theta2: state.theta2 + dt * (k1.theta2 / 4 + (3 * k2.theta2) / 4),
      omega2: state.omega2 + dt * (k1.omega2 / 4 + (3 * k2.omega2) / 4),
    };
  },
};
