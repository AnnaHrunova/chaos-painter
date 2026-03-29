import { derivatives } from '../physics/pendulum';
import { addScaledState } from '../physics/stateMath';
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

    const stage3State = {
      theta1: state.theta1 + dt * ((3 / 40) * k1.theta1 + (9 / 40) * k2.theta1),
      omega1: state.omega1 + dt * ((3 / 40) * k1.omega1 + (9 / 40) * k2.omega1),
      theta2: state.theta2 + dt * ((3 / 40) * k1.theta2 + (9 / 40) * k2.theta2),
      omega2: state.omega2 + dt * ((3 / 40) * k1.omega2 + (9 / 40) * k2.omega2),
    };
    const k3 = derivatives(stage3State, params);

    const stage4State = {
      theta1:
        state.theta1 +
        dt * ((44 / 45) * k1.theta1 - (56 / 15) * k2.theta1 + (32 / 9) * k3.theta1),
      omega1:
        state.omega1 +
        dt * ((44 / 45) * k1.omega1 - (56 / 15) * k2.omega1 + (32 / 9) * k3.omega1),
      theta2:
        state.theta2 +
        dt * ((44 / 45) * k1.theta2 - (56 / 15) * k2.theta2 + (32 / 9) * k3.theta2),
      omega2:
        state.omega2 +
        dt * ((44 / 45) * k1.omega2 - (56 / 15) * k2.omega2 + (32 / 9) * k3.omega2),
    };
    const k4 = derivatives(stage4State, params);

    const stage5State = {
      theta1:
        state.theta1 +
        dt *
          ((19372 / 6561) * k1.theta1 -
            (25360 / 2187) * k2.theta1 +
            (64448 / 6561) * k3.theta1 -
            (212 / 729) * k4.theta1),
      omega1:
        state.omega1 +
        dt *
          ((19372 / 6561) * k1.omega1 -
            (25360 / 2187) * k2.omega1 +
            (64448 / 6561) * k3.omega1 -
            (212 / 729) * k4.omega1),
      theta2:
        state.theta2 +
        dt *
          ((19372 / 6561) * k1.theta2 -
            (25360 / 2187) * k2.theta2 +
            (64448 / 6561) * k3.theta2 -
            (212 / 729) * k4.theta2),
      omega2:
        state.omega2 +
        dt *
          ((19372 / 6561) * k1.omega2 -
            (25360 / 2187) * k2.omega2 +
            (64448 / 6561) * k3.omega2 -
            (212 / 729) * k4.omega2),
    };
    const k5 = derivatives(stage5State, params);

    const stage6State = {
      theta1:
        state.theta1 +
        dt *
          ((9017 / 3168) * k1.theta1 -
            (355 / 33) * k2.theta1 +
            (46732 / 5247) * k3.theta1 +
            (49 / 176) * k4.theta1 -
            (5103 / 18656) * k5.theta1),
      omega1:
        state.omega1 +
        dt *
          ((9017 / 3168) * k1.omega1 -
            (355 / 33) * k2.omega1 +
            (46732 / 5247) * k3.omega1 +
            (49 / 176) * k4.omega1 -
            (5103 / 18656) * k5.omega1),
      theta2:
        state.theta2 +
        dt *
          ((9017 / 3168) * k1.theta2 -
            (355 / 33) * k2.theta2 +
            (46732 / 5247) * k3.theta2 +
            (49 / 176) * k4.theta2 -
            (5103 / 18656) * k5.theta2),
      omega2:
        state.omega2 +
        dt *
          ((9017 / 3168) * k1.omega2 -
            (355 / 33) * k2.omega2 +
            (46732 / 5247) * k3.omega2 +
            (49 / 176) * k4.omega2 -
            (5103 / 18656) * k5.omega2),
    };
    const k6 = derivatives(stage6State, params);

    return {
      theta1:
        state.theta1 +
        dt *
          ((35 / 384) * k1.theta1 +
            (500 / 1113) * k3.theta1 +
            (125 / 192) * k4.theta1 -
            (2187 / 6784) * k5.theta1 +
            (11 / 84) * k6.theta1),
      omega1:
        state.omega1 +
        dt *
          ((35 / 384) * k1.omega1 +
            (500 / 1113) * k3.omega1 +
            (125 / 192) * k4.omega1 -
            (2187 / 6784) * k5.omega1 +
            (11 / 84) * k6.omega1),
      theta2:
        state.theta2 +
        dt *
          ((35 / 384) * k1.theta2 +
            (500 / 1113) * k3.theta2 +
            (125 / 192) * k4.theta2 -
            (2187 / 6784) * k5.theta2 +
            (11 / 84) * k6.theta2),
      omega2:
        state.omega2 +
        dt *
          ((35 / 384) * k1.omega2 +
            (500 / 1113) * k3.omega2 +
            (125 / 192) * k4.omega2 -
            (2187 / 6784) * k5.omega2 +
            (11 / 84) * k6.omega2),
    };
  },
};
