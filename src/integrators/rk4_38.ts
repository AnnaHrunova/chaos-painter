import { derivatives } from '../physics/pendulum';
import { addScaledState } from '../physics/stateMath';
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
    const stage3State = {
      theta1: state.theta1 + dt * (-k1.theta1 / 3 + k2.theta1),
      omega1: state.omega1 + dt * (-k1.omega1 / 3 + k2.omega1),
      theta2: state.theta2 + dt * (-k1.theta2 / 3 + k2.theta2),
      omega2: state.omega2 + dt * (-k1.omega2 / 3 + k2.omega2),
    };
    const k3 = derivatives(stage3State, params);
    const stage4State = {
      theta1: state.theta1 + dt * (k1.theta1 - k2.theta1 + k3.theta1),
      omega1: state.omega1 + dt * (k1.omega1 - k2.omega1 + k3.omega1),
      theta2: state.theta2 + dt * (k1.theta2 - k2.theta2 + k3.theta2),
      omega2: state.omega2 + dt * (k1.omega2 - k2.omega2 + k3.omega2),
    };
    const k4 = derivatives(stage4State, params);

    return {
      theta1:
        state.theta1 +
        dt *
          ((k1.theta1 + 3 * k2.theta1 + 3 * k3.theta1 + k4.theta1) / 8),
      omega1:
        state.omega1 +
        dt *
          ((k1.omega1 + 3 * k2.omega1 + 3 * k3.omega1 + k4.omega1) / 8),
      theta2:
        state.theta2 +
        dt *
          ((k1.theta2 + 3 * k2.theta2 + 3 * k3.theta2 + k4.theta2) / 8),
      omega2:
        state.omega2 +
        dt *
          ((k1.omega2 + 3 * k2.omega2 + 3 * k3.omega2 + k4.omega2) / 8),
    };
  },
};
