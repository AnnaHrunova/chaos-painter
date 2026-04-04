import { derivatives } from '../physics/pendulum';
import { addScaledState, combineWeightedStates } from '../physics/stateMath';
import type { IntegratorDefinition } from './types';

export const rk4_38Integrator: IntegratorDefinition = {
  id: 'rk4_38',
  label: 'RK4 (3/8)',
  shortLabel: 'RK4 3/8',
  order: 4,
  accuracyRank: 5,
  accentColor: '#ff79c9',
  description:
    'Альтернативная схема RK4 того же четвёртого порядка, но с другими внутренними весами стадий. При том же dt обычно близка к классическому RK4, но в хаотических режимах может расходиться с ним по-своему.',
  step: (state, params, dt) => {
    const k1 = derivatives(state, params);
    const k2 = derivatives(addScaledState(state, k1, dt / 3), params);
    const stage3State = addScaledState(
      state,
      combineWeightedStates([
        { state: k1, weight: -1 / 3 },
        { state: k2, weight: 1 },
      ]),
      dt,
    );
    const k3 = derivatives(stage3State, params);
    const stage4State = addScaledState(
      state,
      combineWeightedStates([
        { state: k1, weight: 1 },
        { state: k2, weight: -1 },
        { state: k3, weight: 1 },
      ]),
      dt,
    );
    const k4 = derivatives(stage4State, params);

    return addScaledState(
      state,
      combineWeightedStates([
        { state: k1, weight: 1 / 8 },
        { state: k2, weight: 3 / 8 },
        { state: k3, weight: 3 / 8 },
        { state: k4, weight: 1 / 8 },
      ]),
      dt,
    );
  },
};
