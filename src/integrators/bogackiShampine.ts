import { derivatives } from '../physics/pendulum';
import { addScaledState, combineWeightedStates } from '../physics/stateMath';
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

    return addScaledState(
      state,
      combineWeightedStates([
        { state: k1, weight: 2 / 9 },
        { state: k2, weight: 1 / 3 },
        { state: k3, weight: 4 / 9 },
      ]),
      dt,
    );
  },
};
