/// <reference lib="webworker" />

import { buildFractalScene } from '../fractals/buildScene';
import type {
  FractalWorkerRequest,
  FractalWorkerResponse,
} from '../fractals/workerProtocol';

self.onmessage = (event: MessageEvent<FractalWorkerRequest>) => {
  const message = event.data;

  if (message.type !== 'build-fractal-scene') {
    return;
  }

  try {
    const scene = buildFractalScene(message.input);

    const response: FractalWorkerResponse = {
      type: 'fractal-scene',
      requestId: message.requestId,
      scene,
    };

    self.postMessage(response);
  } catch (error) {
    const response: FractalWorkerResponse = {
      type: 'error',
      requestId: message.requestId,
      message: error instanceof Error ? error.message : 'Unknown fractal worker error',
    };

    self.postMessage(response);
  }
};

export {};
