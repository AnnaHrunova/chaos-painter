import { derivatives } from '../physics/pendulum';
import { addScaledState, combineWeightedStates } from '../physics/stateMath';
import type { IntegratorDefinition } from './types';

export const ralstonIntegrator: IntegratorDefinition = {
  id: 'ralston',
  label: 'Ralston RK2',
  shortLabel: 'Ralston',
  order: 2,
  accuracyRank: 3,
  accentColor: '#66f0c6',
  description:
    'Ещё один метод второго порядка, но с более удачными весами, чем у обычного RK2. На том же dt часто даёт чуть меньшую локальную ошибку и меньше портит форму траектории.',
  step: (state, params, dt) => {
    const k1 = derivatives(state, params);
    const shiftedState = addScaledState(state, k1, (dt * 2) / 3);
    const k2 = derivatives(shiftedState, params);

    return addScaledState(
      state,
      combineWeightedStates([
        { state: k1, weight: 1 / 4 },
        { state: k2, weight: 3 / 4 },
      ]),
      dt,
    );
  },
};
