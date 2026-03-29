import { derivatives } from '../physics/pendulum';
import { addScaledState, combineStates } from '../physics/stateMath';
import type { IntegratorDefinition } from './types';

export const rk4Integrator: IntegratorDefinition = {
  id: 'rk4',
  label: 'RK4',
  shortLabel: 'RK4',
  order: 4,
  description:
    'Самый устойчивый из текущих методов при одинаковом dt. Хаос он не отменяет, но обычно меньше вносит численной лжи.',
  step: (state, params, dt) => {
    const k1 = derivatives(state, params);
    const k2 = derivatives(addScaledState(state, k1, dt * 0.5), params);
    const k3 = derivatives(addScaledState(state, k2, dt * 0.5), params);
    const k4 = derivatives(addScaledState(state, k3, dt), params);
    return addScaledState(state, combineStates(k1, k2, k3, k4), dt / 6);
  },
};
