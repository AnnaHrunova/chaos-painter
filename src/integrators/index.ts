import { bogackiShampineIntegrator } from './bogackiShampine';
import { dopri5Integrator } from './dopri5';
import { eulerIntegrator } from './euler';
import { heunIntegrator } from './heun';
import { midpointIntegrator } from './midpoint';
import { ralstonIntegrator } from './ralston';
import { rk3Integrator } from './rk3';
import { rk4_38Integrator } from './rk4_38';
import { rk4Integrator } from './rk4';
import type { IntegrationMethodId, IntegratorDefinition } from './types';

export const integrators: IntegratorDefinition[] = [
  eulerIntegrator,
  midpointIntegrator,
  heunIntegrator,
  ralstonIntegrator,
  rk3Integrator,
  bogackiShampineIntegrator,
  rk4Integrator,
  rk4_38Integrator,
  dopri5Integrator,
];

export const comparisonMethodIds: IntegrationMethodId[] = [
  'euler',
  'midpoint',
  'heun',
  'ralston',
  'rk3',
  'bogacki_shampine',
  'rk4',
  'rk4_38',
  'dopri5',
];

export const maxAccuracyRank = integrators.reduce(
  (largest, integrator) => Math.max(largest, integrator.accuracyRank),
  1,
);

export function getReferenceIntegrator(): IntegratorDefinition {
  return integrators.reduce((best, candidate) => {
    if (candidate.accuracyRank !== best.accuracyRank) {
      return candidate.accuracyRank > best.accuracyRank ? candidate : best;
    }

    if (candidate.order !== best.order) {
      return candidate.order > best.order ? candidate : best;
    }

    return candidate;
  });
}

export function getIntegrator(methodId: IntegrationMethodId): IntegratorDefinition {
  const match = integrators.find((integrator) => integrator.id === methodId);

  if (!match) {
    throw new Error(`Unsupported integrator: ${methodId}`);
  }

  return match;
}
