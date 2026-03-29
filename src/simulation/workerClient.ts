import type { TrajectorySeries } from '../physics/types';
import type { SimulationWorkerRequest, SimulationWorkerResponse } from './workerProtocol';

export interface TrajectoryTask {
  key: string;
  methodId: SimulationWorkerRequest['methodId'];
  dt: number;
  steps: number;
  initialState: SimulationWorkerRequest['initialState'];
  params: SimulationWorkerRequest['params'];
}

export interface WorkerBatchHandle {
  cancel: () => void;
  promise: Promise<Map<string, TrajectorySeries>>;
}

export function runTrajectoryBatch(
  tasks: TrajectoryTask[],
  concurrency = defaultWorkerConcurrency(),
): WorkerBatchHandle {
  if (tasks.length === 0) {
    return {
      cancel: () => undefined,
      promise: Promise.resolve(new Map()),
    };
  }

  const workerCount = Math.max(1, Math.min(concurrency, tasks.length));
  const workers = Array.from(
    { length: workerCount },
    () => new Worker(new URL('../workers/simulationWorker.ts', import.meta.url), { type: 'module' }),
  );

  let nextTaskIndex = 0;
  let nextRequestId = 1;
  let activeWorkers = workerCount;
  let settled = false;
  let cancelled = false;
  const results = new Map<string, TrajectorySeries>();

  const cleanup = () => {
    workers.forEach((worker) => worker.terminate());
  };

  const promise = new Promise<Map<string, TrajectorySeries>>((resolve, reject) => {
    const finishIfDone = () => {
      if (activeWorkers === 0 && !settled) {
        settled = true;
        cleanup();
        resolve(results);
      }
    };

    const fail = (message: string) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(new Error(message));
    };

    const dispatch = (worker: Worker) => {
      if (cancelled) {
        activeWorkers -= 1;
        finishIfDone();
        return;
      }

      const task = tasks[nextTaskIndex];

      if (!task) {
        activeWorkers -= 1;
        finishIfDone();
        return;
      }

      nextTaskIndex += 1;
      const requestId = nextRequestId;
      nextRequestId += 1;

      worker.onmessage = (event: MessageEvent<SimulationWorkerResponse>) => {
        const message = event.data;

        if (message.requestId !== requestId || settled) {
          return;
        }

        if (message.type === 'error') {
          fail(message.message);
          return;
        }

        results.set(task.key, message.trajectory);
        dispatch(worker);
      };

      const request: SimulationWorkerRequest = {
        type: 'simulate-trajectory',
        requestId,
        methodId: task.methodId,
        dt: task.dt,
        steps: task.steps,
        initialState: task.initialState,
        params: task.params,
      };
      worker.postMessage(request);
    };

    workers.forEach((worker) => dispatch(worker));
  });

  return {
    cancel: () => {
      cancelled = true;
      if (!settled) {
        settled = true;
        cleanup();
      }
    },
    promise,
  };
}

function defaultWorkerConcurrency(): number {
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  return Math.max(2, Math.min(4, Math.floor(hardwareConcurrency / 2) || 2));
}
