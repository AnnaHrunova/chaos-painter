import { derivatives } from '../physics/pendulum';
import { addScaledState, combineWeightedStates } from '../physics/stateMath';
import type { IntegratorDefinition } from './types';

export const rk3Integrator: IntegratorDefinition = {
  id: 'rk3',
  label: 'RK3',
  shortLabel: 'RK3',
  order: 3,
  accuracyRank: 4,
  accentColor: '#d7a8ff',
  description:
    'Использует три оценки наклона внутри одного шага и поэтому лучше отслеживает быстро меняющуюся геометрию траектории. Обычно уже сильно чище семейства RK2, но ещё дешевле классического RK4.',
  step: (state, params, dt) => {
    const k1 = derivatives(state, params);
    const k2 = derivatives(addScaledState(state, k1, dt * 0.5), params);
    const provisional = addScaledState(
      state,
      combineWeightedStates([
        { state: k1, weight: -1 },
        { state: k2, weight: 2 },
      ]),
      dt,
    );
    const k3 = derivatives(provisional, params);

    return addScaledState(
      state,
      combineWeightedStates([
        { state: k1, weight: 1 / 6 },
        { state: k2, weight: 4 / 6 },
        { state: k3, weight: 1 / 6 },
      ]),
      dt,
    );
  },
};
