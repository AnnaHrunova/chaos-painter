import type { FractalScene, FractalSceneInput } from './types';
import type {
  FractalWorkerRequest,
  FractalWorkerResponse,
} from './workerProtocol';

let worker: Worker | null = null;
let nextRequestId = 1;
const pending = new Map<
  number,
  {
    resolve: (scene: FractalScene) => void;
    reject: (error: Error) => void;
  }
>();

export function requestFractalScene(input: FractalSceneInput): Promise<FractalScene> {
  const activeWorker = getWorker();
  const requestId = nextRequestId;
  nextRequestId += 1;

  return new Promise<FractalScene>((resolve, reject) => {
    pending.set(requestId, { resolve, reject });

    const request: FractalWorkerRequest = {
      type: 'build-fractal-scene',
      requestId,
      input,
    };

    activeWorker.postMessage(request);
  });
}

function getWorker(): Worker {
  if (worker) {
    return worker;
  }

  worker = new Worker(new URL('../workers/fractalWorker.ts', import.meta.url), {
    type: 'module',
  });

  worker.onmessage = (event: MessageEvent<FractalWorkerResponse>) => {
    const message = event.data;
    const entry = pending.get(message.requestId);

    if (!entry) {
      return;
    }

    pending.delete(message.requestId);

    if (message.type === 'error') {
      entry.reject(new Error(message.message));
      return;
    }

    entry.resolve(message.scene);
  };

  worker.onerror = (event) => {
    const error = new Error(event.message || 'Unknown fractal worker error');
    for (const [requestId, entry] of pending) {
      pending.delete(requestId);
      entry.reject(error);
    }
  };

  return worker;
}
