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
  rk4Integrator,
  rk4_38Integrator,
];

export const comparisonMethodIds: IntegrationMethodId[] = [
  'euler',
  'midpoint',
  'heun',
  'ralston',
  'rk3',
  'rk4',
  'rk4_38',
];

export function getIntegrator(methodId: IntegrationMethodId): IntegratorDefinition {
  const match = integrators.find((integrator) => integrator.id === methodId);

  if (!match) {
    throw new Error(`Unsupported integrator: ${methodId}`);
  }

  return match;
}
