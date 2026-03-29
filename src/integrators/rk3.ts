import { derivatives } from '../physics/pendulum';
import { addScaledState } from '../physics/stateMath';
import type { IntegratorDefinition } from './types';

export const rk3Integrator: IntegratorDefinition = {
  id: 'rk3',
  label: 'RK3',
  shortLabel: 'RK3',
  order: 3,
  description:
    'Метод Рунге-Кутты третьего порядка. Часто даёт полезную середину между RK2 и RK4 по цене и качеству.',
  step: (state, params, dt) => {
    const k1 = derivatives(state, params);
    const k2 = derivatives(addScaledState(state, k1, dt * 0.5), params);
    const provisional = {
      theta1: state.theta1 - dt * k1.theta1 + 2 * dt * k2.theta1,
      omega1: state.omega1 - dt * k1.omega1 + 2 * dt * k2.omega1,
      theta2: state.theta2 - dt * k1.theta2 + 2 * dt * k2.theta2,
      omega2: state.omega2 - dt * k1.omega2 + 2 * dt * k2.omega2,
    };
    const k3 = derivatives(provisional, params);

    return {
      theta1:
        state.theta1 +
        (dt * (k1.theta1 + 4 * k2.theta1 + k3.theta1)) / 6,
      omega1:
        state.omega1 +
        (dt * (k1.omega1 + 4 * k2.omega1 + k3.omega1)) / 6,
      theta2:
        state.theta2 +
        (dt * (k1.theta2 + 4 * k2.theta2 + k3.theta2)) / 6,
      omega2:
        state.omega2 +
        (dt * (k1.omega2 + 4 * k2.omega2 + k3.omega2)) / 6,
    };
  },
};
