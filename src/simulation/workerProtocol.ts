import type { WorkspaceMode } from '../app/model';
import type { IntegrationMethodId } from '../integrators/types';
import type {
  MetricPoint,
  PendulumParams,
  PendulumState,
  TrajectorySeries,
} from '../physics/types';

export interface SimulationWorkerRequest {
  type: 'simulate';
  requestId: number;
  workspaceMode: WorkspaceMode;
  methodId: IntegrationMethodId;
  dt: number;
  steps: number;
  initialState: PendulumState;
  params: PendulumParams;
  nearbyState: PendulumState;
}

export interface SimulationWorkerResult {
  type: 'result';
  requestId: number;
  primaryTrajectory: TrajectorySeries;
  referenceTrajectory: TrajectorySeries;
  comparisonTrajectories: TrajectorySeries[];
  sensitivitySeries: MetricPoint[];
}

export interface SimulationWorkerError {
  type: 'error';
  requestId: number;
  message: string;
}

export type SimulationWorkerResponse =
  | SimulationWorkerResult
  | SimulationWorkerError;

