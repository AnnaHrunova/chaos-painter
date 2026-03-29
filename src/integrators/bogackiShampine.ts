import { derivatives } from '../physics/pendulum';
import { addScaledState } from '../physics/stateMath';
import type { IntegratorDefinition } from './types';

export const bogackiShampineIntegrator: IntegratorDefinition = {
  id: 'bogacki_shampine',
  label: 'Bogacki-Shampine RK3',
  shortLabel: 'BS RK3',
  order: 3,
  accuracyRank: 4,
  accentColor: '#7fb3ff',
  description:
    'Третий порядок с коэффициентами Bogacki-Shampine. В fixed-step режиме обычно даёт более аккуратную геометрию, чем грубые RK2, и особенно полезен как мягкий переход от RK3 к старшим методам.',
  step: (state, params, dt) => {
    const k1 = derivatives(state, params);
    const k2 = derivatives(addScaledState(state, k1, dt * 0.5), params);
    const k3 = derivatives(addScaledState(state, k2, dt * 0.75), params);

    return {
      theta1:
        state.theta1 +
        dt * ((2 * k1.theta1) / 9 + k2.theta1 / 3 + (4 * k3.theta1) / 9),
      omega1:
        state.omega1 +
        dt * ((2 * k1.omega1) / 9 + k2.omega1 / 3 + (4 * k3.omega1) / 9),
      theta2:
        state.theta2 +
        dt * ((2 * k1.theta2) / 9 + k2.theta2 / 3 + (4 * k3.theta2) / 9),
      omega2:
        state.omega2 +
        dt * ((2 * k1.omega2) / 9 + k2.omega2 / 3 + (4 * k3.omega2) / 9),
    };
  },
};
