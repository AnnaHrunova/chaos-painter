/// <reference lib="webworker" />

import { buildFractalScene, isFractalBuildCancelled } from '../fractals/buildScene';
import { makeGeometryCacheKey, pickStyleSettings, toFractalFrameStats, type FractalScene } from '../fractals/types';
import type {
  FractalWorkerRenderRequest,
  FractalWorkerRequest,
  FractalWorkerResponse,
} from '../fractals/workerProtocol';
import { drawFractalScene } from '../render/fractals';

let displayCanvas: OffscreenCanvas | null = null;
let fallbackCanvas: OffscreenCanvas | null = null;
let pendingRequest: FractalWorkerRenderRequest | null = null;
let processing = false;
let activeRequestId = 0;
const sceneCache = new Map<string, FractalScene>();

self.onmessage = (event: MessageEvent<FractalWorkerRequest>) => {
  const message = event.data;

  if (message.type === 'init') {
    displayCanvas = message.canvas;
    return;
  }

  pendingRequest = message;
  activeRequestId = message.requestId;

  if (!processing) {
    void processLatestRequest();
  }
};

async function processLatestRequest(): Promise<void> {
  processing = true;

  while (pendingRequest) {
    const request = pendingRequest;
    pendingRequest = null;

    try {
      const scene = await getOrBuildScene(request);

      if (request.requestId !== activeRequestId || pendingRequest) {
        continue;
      }

      const targetCanvas = getTargetCanvas(scene.width, scene.height);
      drawFractalScene(targetCanvas, scene, pickStyleSettings(request.input.settings));

      const response: FractalWorkerResponse = {
        type: 'rendered',
        requestId: request.requestId,
        stats: toFractalFrameStats(scene),
      };

      if (displayCanvas) {
        self.postMessage(response);
      } else {
        const bitmap = targetCanvas.transferToImageBitmap();
        self.postMessage({ ...response, bitmap }, [bitmap]);
      }
    } catch (error) {
      if (isFractalBuildCancelled(error)) {
        continue;
      }

      const response: FractalWorkerResponse = {
        type: 'error',
        requestId: request.requestId,
        message: error instanceof Error ? error.message : 'Unknown fractal worker error',
      };

      self.postMessage(response);
    }
  }

  processing = false;
}

async function getOrBuildScene(
  request: FractalWorkerRenderRequest,
): Promise<FractalScene> {
  const key = makeGeometryCacheKey(request.input);
  const cached = sceneCache.get(key);

  if (cached) {
    sceneCache.delete(key);
    sceneCache.set(key, cached);
    return cached;
  }

  const scene = await buildFractalScene(request.input, {
    shouldCancel: () => request.requestId !== activeRequestId,
  });

  if (request.requestId !== activeRequestId) {
    throw new Error('FRACTAL_BUILD_CANCELLED');
  }

  sceneCache.set(key, scene);
  trimSceneCache();
  return scene;
}

function trimSceneCache(): void {
  while (sceneCache.size > 4) {
    const oldestKey = sceneCache.keys().next().value as string | undefined;

    if (!oldestKey) {
      return;
    }

    sceneCache.delete(oldestKey);
  }
}

function getTargetCanvas(width: number, height: number): OffscreenCanvas {
  if (displayCanvas) {
    if (displayCanvas.width !== width) {
      displayCanvas.width = width;
    }

    if (displayCanvas.height !== height) {
      displayCanvas.height = height;
    }

    return displayCanvas;
  }

  if (!fallbackCanvas) {
    fallbackCanvas = new OffscreenCanvas(width, height);
    return fallbackCanvas;
  }

  if (fallbackCanvas.width !== width) {
    fallbackCanvas.width = width;
  }

  if (fallbackCanvas.height !== height) {
    fallbackCanvas.height = height;
  }

  return fallbackCanvas;
}

export {};
