import { derivatives } from '../physics/pendulum';
import { addScaledState } from '../physics/stateMath';
import type { IntegratorDefinition } from './types';

export const eulerIntegrator: IntegratorDefinition = {
  id: 'euler',
  label: 'Euler',
  shortLabel: 'Euler',
  order: 1,
  accuracyRank: 1,
  accentColor: '#ff8b5a',
  description:
    'Берёт производную только в начале шага и слепо тянет состояние вперёд по этой касательной. Самый дешёвый и самый неточный: быстро накапливает дрейф энергии и заметно врёт на крупном dt.',
  step: (state, params, dt) => addScaledState(state, derivatives(state, params), dt),
};
