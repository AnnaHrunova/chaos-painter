/// <reference lib="webworker" />

import { buildFractalScene } from '../fractals/buildScene';
import { toFractalFrameStats } from '../fractals/types';
import type {
  FractalWorkerRequest,
  FractalWorkerResponse,
} from '../fractals/workerProtocol';
import { drawFractalScene } from '../render/fractals';

let renderCanvas: OffscreenCanvas | null = null;

self.onmessage = (event: MessageEvent<FractalWorkerRequest>) => {
  const message = event.data;

  if (message.type !== 'render-fractal-frame') {
    return;
  }

  try {
    const scene = buildFractalScene(message.input);
    const canvas = getRenderCanvas(scene.width, scene.height);

    drawFractalScene(canvas, scene, message.input.settings);

    const bitmap = canvas.transferToImageBitmap();

    const response: FractalWorkerResponse = {
      type: 'fractal-frame',
      requestId: message.requestId,
      bitmap,
      stats: toFractalFrameStats(scene),
    };

    self.postMessage(response, [bitmap]);
  } catch (error) {
    const response: FractalWorkerResponse = {
      type: 'error',
      requestId: message.requestId,
      message: error instanceof Error ? error.message : 'Unknown fractal worker error',
    };

    self.postMessage(response);
  }
};

function getRenderCanvas(width: number, height: number): OffscreenCanvas {
  if (!renderCanvas) {
    renderCanvas = new OffscreenCanvas(width, height);
    return renderCanvas;
  }

  if (renderCanvas.width !== width) {
    renderCanvas.width = width;
  }

  if (renderCanvas.height !== height) {
    renderCanvas.height = height;
  }

  return renderCanvas;
}

export {};
