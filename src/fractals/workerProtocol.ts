import type { FractalFrameStats, FractalSceneInput } from './types';

export interface FractalWorkerRequest {
  type: 'render-fractal-frame';
  requestId: number;
  input: FractalSceneInput;
}

export interface FractalWorkerResult {
  type: 'fractal-frame';
  requestId: number;
  bitmap: ImageBitmap;
  stats: FractalFrameStats;
}

export interface FractalWorkerError {
  type: 'error';
  requestId: number;
  message: string;
}

export type FractalWorkerResponse = FractalWorkerResult | FractalWorkerError;
