/// <reference lib="webworker" />

import { simulateTrajectory } from '../simulation/simulateTrajectory';
import type {
  SimulationWorkerRequest,
  SimulationWorkerResponse,
} from '../simulation/workerProtocol';

self.onmessage = (event: MessageEvent<SimulationWorkerRequest>) => {
  const message = event.data;

  if (message.type !== 'simulate-trajectory') {
    return;
  }

  try {
    const trajectory = simulateTrajectory({
      initialState: message.initialState,
      params: message.params,
      dt: message.dt,
      steps: message.steps,
      methodId: message.methodId,
    });

    const response: SimulationWorkerResponse = {
      type: 'trajectory',
      requestId: message.requestId,
      trajectory,
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
