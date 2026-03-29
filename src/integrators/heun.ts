import { derivatives } from '../physics/pendulum';
import { addScaledState } from '../physics/stateMath';
import type { IntegratorDefinition } from './types';

export const heunIntegrator: IntegratorDefinition = {
  id: 'heun',
  label: 'Heun / Improved Euler',
  shortLabel: 'Heun',
  order: 2,
  description:
    'Предиктор-корректор второго порядка. Обычно заметно аккуратнее обычного Euler, но всё ещё простой и наглядный.',
  step: (state, params, dt) => {
    const k1 = derivatives(state, params);
    const predictor = addScaledState(state, k1, dt);
    const k2 = derivatives(predictor, params);

    return {
      theta1: state.theta1 + ((k1.theta1 + k2.theta1) * dt) / 2,
      omega1: state.omega1 + ((k1.omega1 + k2.omega1) * dt) / 2,
      theta2: state.theta2 + ((k1.theta2 + k2.theta2) * dt) / 2,
      omega2: state.omega2 + ((k1.omega2 + k2.omega2) * dt) / 2,
    };
  },
};
