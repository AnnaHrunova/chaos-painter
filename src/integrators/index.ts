import { eulerIntegrator } from './euler';
import { midpointIntegrator } from './midpoint';
import { rk4Integrator } from './rk4';
import type { IntegrationMethodId, IntegratorDefinition } from './types';

export const integrators: IntegratorDefinition[] = [
  eulerIntegrator,
  midpointIntegrator,
  rk4Integrator,
];

export const comparisonMethodIds: IntegrationMethodId[] = [
  'euler',
  'midpoint',
  'rk4',
];

export function getIntegrator(methodId: IntegrationMethodId): IntegratorDefinition {
  const match = integrators.find((integrator) => integrator.id === methodId);

  if (!match) {
    throw new Error(`Unsupported integrator: ${methodId}`);
  }

  return match;
}

