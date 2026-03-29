import type { IntegrationMethodId } from '../integrators/types';
import type { PendulumParams, PendulumState, TrajectorySeries } from '../physics/types';

export interface SimulationWorkerRequest {
  type: 'simulate-trajectory';
  requestId: number;
  methodId: IntegrationMethodId;
  dt: number;
  steps: number;
  initialState: PendulumState;
  params: PendulumParams;
}

export interface SimulationWorkerResult {
  type: 'trajectory';
  requestId: number;
  trajectory: TrajectorySeries;
}

export interface SimulationWorkerError {
  type: 'error';
  requestId: number;
  message: string;
}

export type SimulationWorkerResponse = SimulationWorkerResult | SimulationWorkerError;
