import { derivatives } from '../physics/pendulum';
import { addScaledState } from '../physics/stateMath';
import type { IntegratorDefinition } from './types';

export const midpointIntegrator: IntegratorDefinition = {
  id: 'midpoint',
  label: 'RK2 / Midpoint',
  shortLabel: 'RK2',
  order: 2,
  accuracyRank: 2,
  accentColor: '#8fe1ff',
  description:
    'Сначала оценивает, куда система придёт к середине шага, и уже там берёт основной наклон. Обычно заметно честнее Euler на криволинейном движении и даёт хороший базовый компромисс цена/качество.',
  step: (state, params, dt) => {
    const k1 = derivatives(state, params);
    const midpointState = addScaledState(state, k1, dt * 0.5);
    const k2 = derivatives(midpointState, params);
    return addScaledState(state, k2, dt);
  },
};
