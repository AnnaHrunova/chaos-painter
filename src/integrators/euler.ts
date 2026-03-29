import { derivatives } from '../physics/pendulum';
import { addScaledState } from '../physics/stateMath';
import type { IntegratorDefinition } from './types';

export const eulerIntegrator: IntegratorDefinition = {
  id: 'euler',
  label: 'Euler',
  shortLabel: 'Euler',
  order: 1,
  description:
    'Быстрый и грубый метод первого порядка. Хорошо показывает численный дрейф, нестабильность и артефакты при крупном dt.',
  step: (state, params, dt) => addScaledState(state, derivatives(state, params), dt),
};
