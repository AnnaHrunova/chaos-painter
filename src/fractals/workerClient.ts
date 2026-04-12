import { presentFractalBitmap } from '../render/fractals';
import type { FractalFrameStats, FractalSceneInput } from './types';
import type {
  FractalWorkerRenderRequest,
  FractalWorkerRequest,
  FractalWorkerResponse,
} from './workerProtocol';

export interface FractalWorkerClient {
  render: (input: FractalSceneInput) => Promise<FractalFrameStats>;
  dispose: () => void;
}

interface PendingRequest {
  resolve: (stats: FractalFrameStats) => void;
  reject: (error: Error) => void;
}

export function createFractalWorkerClient(
  canvas: HTMLCanvasElement,
): FractalWorkerClient {
  const worker = new Worker(new URL('../workers/fractalWorker.ts', import.meta.url), {
    type: 'module',
  });
  const pending = new Map<number, PendingRequest>();
  let nextRequestId = 1;

  if ('transferControlToOffscreen' in canvas) {
    const offscreen = canvas.transferControlToOffscreen();
    const initMessage: FractalWorkerRequest = {
      type: 'init',
      canvas: offscreen,
    };

    worker.postMessage(initMessage, [offscreen]);
  }

  worker.onmessage = (event: MessageEvent<FractalWorkerResponse>) => {
    const message = event.data;
    const entry = pending.get(message.requestId);

    if (!entry) {
      if (message.type === 'rendered' && message.bitmap) {
        message.bitmap.close();
      }
      return;
    }

    pending.delete(message.requestId);

    if (message.type === 'error') {
      entry.reject(new Error(message.message));
      return;
    }

    if (message.bitmap) {
      presentFractalBitmap(canvas, message.bitmap);
    }

    entry.resolve(message.stats);
  };

  worker.onerror = (event) => {
    const error = new Error(event.message || 'Unknown fractal worker error');
    for (const [requestId, entry] of pending) {
      pending.delete(requestId);
      entry.reject(error);
    }
  };

  return {
    render(input) {
      rejectSupersededRequests(pending);

      const requestId = nextRequestId;
      nextRequestId += 1;

      return new Promise<FractalFrameStats>((resolve, reject) => {
        pending.set(requestId, { resolve, reject });

        const message: FractalWorkerRenderRequest = {
          type: 'render',
          requestId,
          input,
        };

        worker.postMessage(message);
      });
    },
    dispose() {
      rejectSupersededRequests(pending);
      worker.terminate();
    },
  };
}

function rejectSupersededRequests(
  pending: Map<number, PendingRequest>,
): void {
  for (const [requestId, entry] of pending) {
    pending.delete(requestId);
    entry.reject(new Error('Fractal render superseded by a newer request'));
  }
}
