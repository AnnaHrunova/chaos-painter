import { derivatives } from '../physics/pendulum';
import { addScaledState } from '../physics/stateMath';
import type { IntegratorDefinition } from './types';

export const midpointIntegrator: IntegratorDefinition = {
  id: 'midpoint',
  label: 'RK2 / Midpoint',
  shortLabel: 'RK2',
  order: 2,
  description:
    'Более аккуратный метод второго порядка. Часто даёт разумный компромисс между скоростью расчёта и точностью.',
  step: (state, params, dt) => {
    const k1 = derivatives(state, params);
    const midpointState = addScaledState(state, k1, dt * 0.5);
    const k2 = derivatives(midpointState, params);
    return addScaledState(state, k2, dt);
  },
};
