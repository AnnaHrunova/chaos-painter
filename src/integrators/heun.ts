import { derivatives } from '../physics/pendulum';
import { addScaledState, combineWeightedStates } from '../physics/stateMath';
import type { IntegratorDefinition } from './types';

export const heunIntegrator: IntegratorDefinition = {
  id: 'heun',
  label: 'Heun / Improved Euler',
  shortLabel: 'Heun',
  order: 2,
  accuracyRank: 2,
  accentColor: '#ffd36e',
  description:
    'Сначала делает черновой шаг как Euler, потом усредняет наклон в начале и в конце шага. Тоже второй порядок, но с другим характером ошибки: часто мягче ведёт себя там, где наклон быстро меняется.',
  step: (state, params, dt) => {
    const k1 = derivatives(state, params);
    const predictor = addScaledState(state, k1, dt);
    const k2 = derivatives(predictor, params);

    return addScaledState(
      state,
      combineWeightedStates([
        { state: k1, weight: 0.5 },
        { state: k2, weight: 0.5 },
      ]),
      dt,
    );
  },
};
