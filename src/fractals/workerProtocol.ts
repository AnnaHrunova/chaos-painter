import type { FractalFrameStats, FractalSceneInput } from './types';

export interface FractalWorkerInitRequest {
  type: 'init';
  canvas: OffscreenCanvas;
}

export interface FractalWorkerRenderRequest {
  type: 'render';
  requestId: number;
  input: FractalSceneInput;
}

export type FractalWorkerRequest =
  | FractalWorkerInitRequest
  | FractalWorkerRenderRequest;

export interface FractalWorkerRendered {
  type: 'rendered';
  requestId: number;
  stats: FractalFrameStats;
  bitmap?: ImageBitmap;
}

export interface FractalWorkerError {
  type: 'error';
  requestId: number;
  message: string;
}

export type FractalWorkerResponse =
  | FractalWorkerRendered
  | FractalWorkerError;
