/// <reference lib="webworker" />

import { computeDivergenceSeries, simulateComparisonTrajectories } from '../simulation/comparison';
import { simulateTrajectory } from '../simulation/simulateTrajectory';
import type {
  SimulationWorkerRequest,
  SimulationWorkerResponse,
} from '../simulation/workerProtocol';

self.onmessage = (event: MessageEvent<SimulationWorkerRequest>) => {
  const message = event.data;

  if (message.type !== 'simulate') {
    return;
  }

  try {
    const primaryTrajectory = simulateTrajectory({
      initialState: message.initialState,
      params: message.params,
      dt: message.dt,
      steps: message.steps,
      methodId: message.methodId,
    });

    const referenceTrajectory = simulateTrajectory({
      initialState: message.initialState,
      params: message.params,
      dt: message.dt,
      steps: message.steps,
      methodId: 'rk4',
    });

    const comparisonTrajectories =
      message.workspaceMode === 'comparison'
        ? simulateComparisonTrajectories(
            message.initialState,
            message.params,
            message.dt,
            message.steps,
          )
        : [];

    const nearbyTrajectory = simulateTrajectory({
      initialState: message.nearbyState,
      params: message.params,
      dt: message.dt,
      steps: message.steps,
      methodId: message.methodId,
    });

    const response: SimulationWorkerResponse = {
      type: 'result',
      requestId: message.requestId,
      primaryTrajectory,
      referenceTrajectory,
      comparisonTrajectories,
      sensitivitySeries: computeDivergenceSeries(primaryTrajectory, nearbyTrajectory),
    };

    self.postMessage(response);
  } catch (error) {
    const response: SimulationWorkerResponse = {
      type: 'error',
      requestId: message.requestId,
      message: error instanceof Error ? error.message : 'Unknown worker error',
    };

    self.postMessage(response);
  }
};

export {};

