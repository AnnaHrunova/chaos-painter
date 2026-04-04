import { derivatives } from '../physics/pendulum';
import { addScaledState, combineWeightedStates } from '../physics/stateMath';
import type { IntegratorDefinition } from './types';

export const dopri5Integrator: IntegratorDefinition = {
  id: 'dopri5',
  label: 'Dormand-Prince RK5',
  shortLabel: 'DOPRI5',
  order: 5,
  accuracyRank: 6,
  accentColor: '#f6a5ff',
  description:
    'Пятый порядок Dormand-Prince. На том же dt обычно даёт самый чистый референс из текущего набора и лучше других сдерживает накопление локальной ошибки, хотя чудес против хаоса, как водится, не существует.',
  step: (state, params, dt) => {
    const k1 = derivatives(state, params);
    const k2 = derivatives(addScaledState(state, k1, dt * (1 / 5)), params);

    const stage3State = addScaledState(
      state,
      combineWeightedStates([
        { state: k1, weight: 3 / 40 },
        { state: k2, weight: 9 / 40 },
      ]),
      dt,
    );
    const k3 = derivatives(stage3State, params);

    const stage4State = addScaledState(
      state,
      combineWeightedStates([
        { state: k1, weight: 44 / 45 },
        { state: k2, weight: -56 / 15 },
        { state: k3, weight: 32 / 9 },
      ]),
      dt,
    );
    const k4 = derivatives(stage4State, params);

    const stage5State = addScaledState(
      state,
      combineWeightedStates([
        { state: k1, weight: 19372 / 6561 },
        { state: k2, weight: -25360 / 2187 },
        { state: k3, weight: 64448 / 6561 },
        { state: k4, weight: -212 / 729 },
      ]),
      dt,
    );
    const k5 = derivatives(stage5State, params);

    const stage6State = addScaledState(
      state,
      combineWeightedStates([
        { state: k1, weight: 9017 / 3168 },
        { state: k2, weight: -355 / 33 },
        { state: k3, weight: 46732 / 5247 },
        { state: k4, weight: 49 / 176 },
        { state: k5, weight: -5103 / 18656 },
      ]),
      dt,
    );
    const k6 = derivatives(stage6State, params);

    return addScaledState(
      state,
      combineWeightedStates([
        { state: k1, weight: 35 / 384 },
        { state: k3, weight: 500 / 1113 },
        { state: k4, weight: 125 / 192 },
        { state: k5, weight: -2187 / 6784 },
        { state: k6, weight: 11 / 84 },
      ]),
      dt,
    );
  },
};
